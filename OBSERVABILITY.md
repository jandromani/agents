# Observabilidad y Error Tracking

Esta app usa Sentry para tracing distribuido, captura de errores y consolidador de logs (cargado vía CDN para funcionar incluso sin dependencias adicionales). Incluye puntos de observabilidad en Auth y Dashboard y helpers reutilizables para futuras rutas críticas.

## Variables de entorno

Añade las siguientes claves al entorno de Vite (`.env` o variables de despliegue):

- `VITE_SENTRY_DSN` (obligatoria para habilitar Sentry)
- `VITE_APP_ENV` (ej. `production`, `staging`)
- `VITE_RELEASE` (SHA o tag del despliegue para versionar incidencias)
- `VITE_SENTRY_TRACES_SAMPLE_RATE` (0-1, default 0.3)
- `VITE_SENTRY_PROFILES_SAMPLE_RATE` (0-1, default 0.1)
- `VITE_SENTRY_ERROR_SAMPLE_RATE` (0-1, default 1.0, controla el muestreo de eventos de error)
- `VITE_SENTRY_REPLAYS_SAMPLE_RATE` (0-1, default 0.0)
- `VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE` (0-1, default 1.0)
- `VITE_SENTRY_CDN` (opcional, URL alternativa del bundle de Sentry si usas un mirror interno)

Si no se define `VITE_SENTRY_DSN`, la telemetría queda desactivada de forma segura.

## Componentes técnicos

- **Carga y bootstrap**: `initObservability()` en `src/main.tsx` carga el SDK desde CDN y arranca Sentry con tracing, replay y captura de consola de errores.
- **Logging centralizado**: `src/observability/logging.ts` expone `logInfo`, `logWarning`, `logError`, `captureException` y `recordUptimeHeartbeat` que escriben en consola y Sentry (breadcrumbs + eventos según severidad).
- **Tracing distribuido**: `traceAsyncOperation` en `src/observability/tracing.ts` envuelve operaciones críticas (ej. Supabase en Auth/Dashboard) creando spans con tags y datos de negocio.
- **Anotaciones rápidas**: `annotateSpan` permite marcar spans en caliente con datos relevantes durante diagnósticos.

## Dashboards y métricas

1. **Rendimiento y trazas**: En Sentry, crea un Dashboard y añade widgets de *Performance* filtrando por `environment` y tags `feature` (`auth`, `dashboard`) y `operation` (`agents`, `stats`, `delete`).
2. **Uptime**: Configura un Monitor o cron en Sentry apuntando al endpoint público/healthcheck de la app y usa `recordUptimeHeartbeat` si deseas enviar latidos manuales desde otros servicios.
3. **Errores vs. advertencias**: Los eventos con severidad `error` o `fatal` generan issues y alertas; los `warning` quedan como breadcrumbs y se pueden consultar en Discover.

### Métricas con Prometheus / Grafana u OTel

- **Edge functions**: todas las funciones de Supabase envían métricas de latencia (`edge_latency_ms`), fallos (`edge_failure_total`) y profundidad de cola (`edge_queue_depth`) etiquetadas por `feature` y `queue` hacia logs o un Pushgateway si defines `PROM_PUSHGATEWAY_URL`. La profundidad de cola puede derivarse de cabeceras como `x-queue-depth` o `queueDepthHeader` en el wrapper.
- **Front**: Sentry expone métricas de rendimiento y errores con muestreo configurable vía `VITE_SENTRY_TRACES_SAMPLE_RATE`, `VITE_SENTRY_PROFILES_SAMPLE_RATE` y `VITE_SENTRY_ERROR_SAMPLE_RATE`. Ajusta el muestreo por entorno para equilibrar costo y señal.
- **OTel/Grafana**: si ya tienes un colector, apunta `PROM_PUSHGATEWAY_URL` a tu Pushgateway y añade jobs con `feature` e `instance` como labels para dashboards de p95/p99.

### SLA y alertas sugeridas

- **p99 latencia**: alerta cuando `edge_latency_ms{feature="process-document"}` p99 > 2s durante 5 min en producción.
- **Tasa de fallos**: alerta cuando `sum(rate(edge_failure_total{feature=~"payments|agents"}[5m])) / sum(rate(edge_failure_total{feature=~"payments|agents"}[5m]) + 1) > 0.02`.
- **Profundidad de cola**: alerta cuando `edge_queue_depth{queue="email"}` > 50 durante 10 min o crecimiento sostenido (>20% en 15 min).
- **Front**: en Sentry, alertas de errores por release (`sampleRate` activado) y trazas lentas >p95 para `feature:dashboard`.

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

## Buenas prácticas operativas

- Mantén las tasas de muestreo bajas en `development` y más altas en `staging/production` solo para rutas críticas.
- Al desplegar, incluye `VITE_RELEASE` para que los issues se agrupen por versión y puedas fijar regression alerts.
- Si el CDN externo no es accesible, apunta `VITE_SENTRY_CDN` a un espejo interno para mantener el tracking activo.
