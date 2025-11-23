# Observabilidad y Error Tracking

Esta app usa Sentry para tracing distribuido, captura de errores y consolidador de logs (cargado vía CDN para funcionar incluso sin dependencias adicionales). Incluye puntos de observabilidad en Auth y Dashboard y helpers reutilizables para futuras rutas críticas.

## Variables de entorno

Añade las siguientes claves al entorno de Vite (`.env` o variables de despliegue):

- `VITE_SENTRY_DSN` (obligatoria para habilitar Sentry)
- `VITE_APP_ENV` (ej. `production`, `staging`)
- `VITE_RELEASE` (SHA o tag del despliegue para versionar incidencias)
- `VITE_APP_NAME` (nombre lógico de la app; se añade como tag en todos los eventos)
- `VITE_SENTRY_MONITOR_SLUG` (slug base para check-ins de uptime; opcional, se concatena con el servicio)
- `VITE_APDEX_THRESHOLD` (segundos para Apdex/umbral de rendimiento en dashboards; default 0.3)
- `VITE_SENTRY_TRACES_SAMPLE_RATE` (0-1, default 0.3)
- `VITE_SENTRY_PROFILES_SAMPLE_RATE` (0-1, default 0.1)
- `VITE_SENTRY_ERROR_SAMPLE_RATE` (0-1, default 1.0, controla el muestreo de eventos de error)
- `VITE_SENTRY_REPLAYS_SAMPLE_RATE` (0-1, default 0.0)
- `VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE` (0-1, default 1.0)
- `VITE_SENTRY_CDN` (opcional, URL alternativa del bundle de Sentry si usas un mirror interno)

Para las Edge Functions (Deno), alinea las variables con el frontend para mantener el mismo muestreo y monitor:

- `SENTRY_DSN`, `SENTRY_TRACES_SAMPLE_RATE`, `SENTRY_PROFILES_SAMPLE_RATE`, `SENTRY_ERROR_SAMPLE_RATE`
- `SENTRY_MONITOR_SLUG` (slug base para check-ins de Monitors)

Si no se define `VITE_SENTRY_DSN`, la telemetría queda desactivada de forma segura.

## Componentes técnicos

- **Carga y bootstrap**: `initObservability()` en `src/main.tsx` carga el SDK desde CDN y arranca Sentry con tracing, replay y captura de consola de errores. Incluye tags globales de app, entorno y release para unificar dashboards.
- **Logging centralizado**: `src/observability/logging.ts` expone `logInfo`, `logWarning`, `logError`, `captureException` y `recordUptimeHeartbeat` que escriben en consola y Sentry (breadcrumbs + eventos según severidad). Los heartbeats envían check-ins a Monitors si defines `VITE_SENTRY_MONITOR_SLUG`.
- **Tracing distribuido**: `traceAsyncOperation` en `src/observability/tracing.ts` envuelve operaciones críticas (ej. Supabase en Auth/Dashboard) creando spans con tags y datos de negocio. Las transacciones incluyen contexto `kpis` con el umbral Apdex configurado para correlacionar rendimiento con alertas.
- **Anotaciones rápidas**: `annotateSpan` permite marcar spans en caliente con datos relevantes durante diagnósticos.

## Dashboards y métricas

1. **Rendimiento y trazas**: En Sentry, crea un Dashboard y añade widgets de *Performance* filtrando por `environment` y tags `feature` (`auth`, `dashboard`) y `operation` (`agents`, `stats`, `delete`). Incluye widgets de Apdex con el umbral de `VITE_APDEX_THRESHOLD` y latencia p95/p99 por release.
2. **Uptime**: Configura un Monitor o cron en Sentry apuntando al endpoint público/healthcheck de la app y usa `recordUptimeHeartbeat` si deseas enviar latidos manuales desde otros servicios. El slug final es `VITE_SENTRY_MONITOR_SLUG.<servicio>` y enviará check-ins `ok`, `in_progress` o `error` según el estado reportado.
3. **Errores vs. advertencias**: Los eventos con severidad `error` o `fatal` generan issues y alertas; los `warning` quedan como breadcrumbs y se pueden consultar en Discover. Todos los eventos llevan tags `app`, `environment` y `runtime` para filtros rápidos.

### Métricas con Prometheus / Grafana u OTel

- **Edge functions**: todas las funciones de Supabase envían métricas de latencia (`edge_latency_ms`), fallos (`edge_failure_total`) y profundidad de cola (`edge_queue_depth`) etiquetadas por `feature` y `queue` hacia logs o un Pushgateway si defines `PROM_PUSHGATEWAY_URL`. La profundidad de cola puede derivarse de cabeceras como `x-queue-depth` o `queueDepthHeader` en el wrapper.
- **Front**: Sentry expone métricas de rendimiento y errores con muestreo configurable vía `VITE_SENTRY_TRACES_SAMPLE_RATE`, `VITE_SENTRY_PROFILES_SAMPLE_RATE` y `VITE_SENTRY_ERROR_SAMPLE_RATE`. Ajusta el muestreo por entorno para equilibrar costo y señal.
- **OTel/Grafana**: si ya tienes un colector, apunta `PROM_PUSHGATEWAY_URL` a tu Pushgateway y añade jobs con `feature` e `instance` como labels para dashboards de p95/p99.

### SLA y alertas sugeridas

- **p99 latencia**: alerta cuando `edge_latency_ms{feature="process-document"}` p99 > 2s durante 5 min en producción.
- **Tasa de fallos**: alerta cuando `sum(rate(edge_failure_total{feature=~"payments|agents"}[5m])) / sum(rate(edge_failure_total{feature=~"payments|agents"}[5m]) + 1) > 0.02`.
- **Profundidad de cola**: alerta cuando `edge_queue_depth{queue="email"}` > 50 durante 10 min o crecimiento sostenido (>20% en 15 min).
- **Front**: en Sentry, alertas de errores por release (`sampleRate` activado) y trazas lentas >p95 para `feature:dashboard`.

### Alertas críticas post-lanzamiento

- **Errores en frontend**: crea una alerta por Issue en Sentry filtrando `environment:production` y `app:<VITE_APP_NAME>` con notificación a on-call (PagerDuty/Slack). Agrupa por `release` para detectar regresiones en la versión recién publicada.
- **Rendimiento**: regla de alerta basada en métricas de Performance con condición `p95(transaction.duration){app="<VITE_APP_NAME>", environment="production"} > VITE_APDEX_THRESHOLD*1000` durante 5 minutos. Enviar a un canal de soporte con auto-assign al equipo web.
- **Uptime**: si usas `VITE_SENTRY_MONITOR_SLUG`, habilita alertas de Monitors con 2 fallos consecutivos y ventana de 5 minutos. Añade mensaje con enlace al dashboard y al runbook de soporte.

### Runbooks de incidentes

1. **Picos de latencia o p99**
   - Revisar panel Grafana/Prometheus con `edge_latency_ms` por `feature`.
   - Correlacionar con trazas en Sentry filtrando por `feature` y `environment`.
   - Escalar workers/colas si `edge_queue_depth` está elevado; validar cabeceras `x-queue-depth` en productores.

2. **Aumento en tasa de fallos**
   - Confirmar despliegue reciente (`release` en Sentry) y activar rollback si el ratio > 2% por más de 10 min.
   - Revisar logs estructurados de métricas y errores en Sentry; anotar incidencias con tags `queue` y `feature`.

3. **Colas saturadas**
   - Revisar métricas `edge_queue_depth` en Pushgateway/Grafana.
   - Incrementar concurrencia de la función correspondiente o pausar ingesta temporal.
   - Verificar dependencias externas (p.ej. SMTP, OpenAI) y agregar backoff si fallan.

4. **Monitoreo continuo**
   - Definir guardias on-call con notificación (PagerDuty/Slack) para alertas críticas de fallos/latencia.
   - Documentar cada incidente con la sección "causa raíz" y "acción preventiva" para retroalimentar la configuración de muestreo.

## Alertas y notificaciones dinámicas

- Usa alertas **basadas en umbrales dinámicos** (Sentry alert rule) con la métrica "Apdex" o "Transactions per Minute" filtrada por `environment` y `feature`. Ajusta sensibilidad según severidad: errores `fatal`/`error` -> canal de on-call (PagerDuty/Slack), `warning` -> canal de soporte.
- Activa alertas de uptime sobre el Monitor con 2-3 fallos consecutivos para evitar ruido.
- Añade auto-enriquecimiento con los tags `feature` y `operation` para que las alertas indiquen el flujo exacto afectado.

## Runbooks de soporte

- **Autenticación**: filtra issues por tag `feature:auth` para revisar fallos de login/signup; los spans incluyen `userId`/email en los datos extra.
- **Panel/Dashboard**: busca `feature:dashboard` y usa los spans `dashboard.loadAgents`, `dashboard.loadStats` o `dashboard.deleteAgent` para identificar consultas lentas o errores de Supabase.
- **Registro manual**: usa los helpers de logging/tracing en nuevas llamadas externas para mantener la cobertura APM consistente.

## Pruebas de humo de telemetría

- Ejecuta `npm run test:smoke` con `E2E_BASE_URL` o `SMOKE_BASE_URL` apuntando al frontend desplegado. La prueba `observability-smoke` valida que `initObservability` cargue el SDK en producción y pueda enviar un `captureMessage` exitoso a Sentry.
- Para Edge Functions, define `SMOKE_EDGE_SMOKE_URL` (endpoint desplegado que use `createEdgeHandler`), opcionalmente `SMOKE_EDGE_SMOKE_METHOD` y `SMOKE_EDGE_AUTHORIZATION`. La prueba espera cabeceras `x-sentry-smoke-id` y `x-sentry-monitor-slug` generadas por el wrapper al capturar el evento de humo en Sentry.
- Usa la misma DSN y slug (`SENTRY_MONITOR_SLUG`) que producción en staging para asegurar que las pruebas midan la ruta real de ingesta de Sentry.

## Buenas prácticas operativas

- Mantén las tasas de muestreo bajas en `development` y más altas en `staging/production` solo para rutas críticas.
- Al desplegar, incluye `VITE_RELEASE` para que los issues se agrupen por versión y puedas fijar regression alerts.
- Si el CDN externo no es accesible, apunta `VITE_SENTRY_CDN` a un espejo interno para mantener el tracking activo.
