# Manual Maestro de Documentación Técnica - AgentHub

Fecha: 23 de noviembre de 2025  
Alcance: Consolida guías de inicio, despliegue, Cloudflare, emails, RAG, observabilidad y operación.

## Índice de Navegación
- [1. Visión general y mapa del sistema](#1-visión-general-y-mapa-del-sistema)
- [2. Índice rápido por rol y tarea](#2-índice-rápido-por-rol-y-tarea)
- [3. Preparación y prerequisitos](#3-preparación-y-prerequisitos)
- [4. Puesta en marcha local](#4-puesta-en-marcha-local)
- [5. Configuración de servicios externos](#5-configuración-de-servicios-externos)
  - [5.1 Supabase](#51-supabase)
  - [5.2 Stripe](#52-stripe)
  - [5.3 OpenRouter](#53-openrouter)
  - [5.4 Cloudflare Workers](#54-cloudflare-workers)
  - [5.5 Proveedor de emails (SendGrid/SES)](#55-proveedor-de-emails-sendgridses)
  - [5.6 Observabilidad (Sentry)](#56-observabilidad-sentry)
- [6. Implementación funcional](#6-implementación-funcional)
  - [6.1 Sistema de Emails](#61-sistema-de-emails)
  - [6.2 Sistema RAG](#62-sistema-rag)
- [7. Despliegue y hosting](#7-despliegue-y-hosting)
- [8. Operaciones, monitoreo y runbooks](#8-operaciones-monitoreo-y-runbooks)
- [9. Checklists y anexos rápidos](#9-checklists-y-anexos-rápidos)

---

## 1. Visión general y mapa del sistema
- Plataforma SaaS para crear y desplegar agentes IA (frontend React+TS+Tailwind).  
- Backend en Supabase (Auth, Postgres, Edge Functions) con despliegue de agentes como Cloudflare Workers.  
- Integraciones clave: Stripe (pagos/suscripciones), OpenRouter (modelos IA), SendGrid/SES (emails), pgvector (RAG), Sentry (observabilidad).  
- Seguridad: RLS completo, rate limiting, validación de contraseñas, audit logs, CSP, tokens en secrets.

## 2. Índice rápido por rol y tarea
- **Developer - Inicio local**: [Puesta en marcha local](#4-puesta-en-marcha-local)
- **Developer - Integrar workers/AI**: [OpenRouter](#53-openrouter) y [Cloudflare](#54-cloudflare-workers)
- **Backend - Pagos**: [Stripe](#52-stripe) y [Checklists](#9-checklists-y-anexos-rápidos)
- **Backend - Emails**: [Sistema de Emails](#61-sistema-de-emails)
- **Backend - RAG**: [Sistema RAG](#62-sistema-rag)
- **Ops - Despliegue**: [Despliegue y hosting](#7-despliegue-y-hosting)
- **Ops - Monitoreo**: [Operaciones y runbooks](#8-operaciones-monitoreo-y-runbooks)

## 3. Preparación y prerequisitos
- Node.js 18+ instalado localmente.
- Cuentas: Supabase, Stripe (modo test), OpenRouter, Cloudflare (para despliegue real), SendGrid o Amazon SES, dominio opcional.
- Acceso a GitHub (CI/CD y hosting en Vercel/Netlify/Cloudflare Pages).
- Tiempo estimado de setup inicial completo: 4-6 horas.

### 3.1 Mapa completo de variables de entorno
- Copia `.env.example` y rellena valores reales antes de arrancar o desplegar; el mismo set aplica a `.env.staging.example`.
- **Frontend (Vite)**: `VITE_APP_ENV`, `VITE_APP_NAME`, `VITE_APP_URL`, `VITE_RELEASE`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_TURNSTILE_SITE_KEY`, `VITE_SENDGRID_KEY`, `VITE_TWILIO_AUTH_TOKEN`, `VITE_SENTRY_DSN`, `VITE_SENTRY_CDN`, `VITE_SENTRY_MONITOR_SLUG`, `VITE_SENTRY_TRACES_SAMPLE_RATE`, `VITE_SENTRY_PROFILES_SAMPLE_RATE`, `VITE_SENTRY_ERROR_SAMPLE_RATE`, `VITE_SENTRY_REPLAYS_SAMPLE_RATE`, `VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE`, `VITE_APDEX_THRESHOLD`.
- **Edge Functions / Backend**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_BASIC`, `STRIPE_PRICE_ULTRA`, `OPENAI_API_KEY`, `SENDGRID_API_KEY`, `FROM_EMAIL`, `TURNSTILE_SECRET_KEY`, `TOTP_ENCRYPTION_KEY`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `SENTRY_DSN`, `SENTRY_TRACES_SAMPLE_RATE`, `SENTRY_PROFILES_SAMPLE_RATE`, `SENTRY_ERROR_SAMPLE_RATE`, `SENTRY_DEBUG`, `ENVIRONMENT`, `RELEASE`, `PROM_PUSHGATEWAY_URL`, `HOSTNAME`.
- **Lint de entorno**: ejecuta `ENV_FILE=.env npm run lint:env` para validar que todas las claves están definidas antes de despliegues o e2e.

## 4. Puesta en marcha local
1. Clonar e instalar dependencias:
   ```bash
   git clone <tu-repositorio>
   cd agenthub
   npm install
   cp .env.example .env
   ```
2. Configurar Supabase local: obtener `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` desde Settings → API y actualizar `.env`.
3. Aplicar migraciones en SQL Editor (en orden):
   1. `supabase/migrations/20251123093001_create_initial_schema.sql`
   2. `supabase/migrations/20251123100005_create_security_and_audit_tables.sql`
   3. `supabase/migrations/20251123100140_create_payment_tables.sql`
4. Ejecutar entorno de desarrollo:
   ```bash
   npm run dev
   # Abrir http://localhost:5173
   ```
5. Validar flujo básico: registro, login, creación de agente, notificaciones en la campana.

## 5. Configuración de servicios externos

### 5.1 Supabase
- Crear proyecto `agenthub-production` o `agenthub-local` y guardar contraseña de BD.  
- Vincular CLI: `supabase login` y `supabase link --project-ref <ref>`.  
- Desplegar Edge Functions clave: `supabase functions deploy deploy-agent`, `track-usage`, `manage-credits`, `stripe-webhook`, `create-checkout`, `create-payment-intent`, `send-email`, `process-email-queue`, `process-document`, `semantic-search`.  
- Secrets básicos en Edge Functions:
  ```bash
  VITE_SUPABASE_URL=<url>
  VITE_SUPABASE_ANON_KEY=<anon>
  STRIPE_SECRET_KEY=sk_test...
  STRIPE_WEBHOOK_SECRET=whsec...
  OPENAI_API_KEY=sk-or-or-sk-openai...
  ```

### 5.2 Stripe
1. Activar modo test y obtener `Publishable key (pk_test_)` y `Secret key (sk_test_)`.  
2. Crear productos y precios:
   - Premium Basic: 3 agentes, 100 consultas/día → guardar `Price ID`.
   - Premium Ultra: 10 agentes, consultas ilimitadas → guardar `Price ID`.
3. Webhook en Developers → Webhooks:
   - Endpoint: `https://<project>.supabase.co/functions/v1/stripe-webhook`
   - Eventos: `customer.created`, `payment_intent.succeeded/failed`, `invoice.paid/payment_failed`, `customer.subscription.*`, `payment_method.attached`
   - Guardar `Signing secret (whsec_)`.
4. Configurar secrets en Supabase:
   ```bash
   STRIPE_SECRET_KEY=sk_test...
   STRIPE_WEBHOOK_SECRET=whsec...
   STRIPE_PRICE_BASIC=price_...
   STRIPE_PRICE_ULTRA=price_...
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test...
   ```

### 5.3 OpenRouter / OpenAI
- Crear API key en [openrouter.ai](https://openrouter.ai) u OpenAI (ej. `sk-or-...` o `sk-...`).
- Añadir como secret `OPENAI_API_KEY` en Supabase (el runtime usa esta clave para embeddings y completions).
- Requerido para pruebas reales de agentes y RAG.

### 5.4 Cloudflare Workers
- Credenciales necesarias (para despliegue real): `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`.  
- Añadir en Supabase Edge Functions → Secrets:
  ```bash
  CLOUDFLARE_ACCOUNT_ID=<account_id>
  CLOUDFLARE_API_TOKEN=<token_con_permisos_de_Edit_Workers>
  ```
- Modo simulación (sin credenciales): agentes creados en BD con URL simulada; despliegue y pruebas reales deshabilitados.
- Estructura del worker generado: ID `agent-{uuid16}`, URL pública `https://agent-{id}.{account-id}.workers.dev`, configuración embebida con modelo, contexto, tracking y límites por plan.

### 5.5 Proveedor de emails (SendGrid/SES)
- **SendGrid (recomendado)**: crear cuenta, generar API Key (`SG.`), verificar dominio (SPF/DKIM) y remitente.  
- **Amazon SES**: verificar dominio, crear credenciales SMTP (`SES_SMTP_USERNAME/PASSWORD/HOST`).  
- Secrets mínimos:
  ```bash
  SENDGRID_API_KEY=SG...
  FROM_EMAIL=noreply@tudominio.com
  # O bien credenciales SES
  SES_SMTP_USERNAME=...
  SES_SMTP_PASSWORD=...
  SES_SMTP_HOST=email-smtp.<region>.amazonaws.com
  ```

### 5.6 Observabilidad (Sentry)
- Variables en `.env`/hosting para habilitar: `VITE_SENTRY_DSN`, `VITE_APP_ENV`, `VITE_RELEASE`, `VITE_SENTRY_TRACES_SAMPLE_RATE`, `VITE_SENTRY_PROFILES_SAMPLE_RATE`, `VITE_SENTRY_ERROR_SAMPLE_RATE`, `VITE_SENTRY_REPLAYS_SAMPLE_RATE`, `VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE`, `VITE_SENTRY_CDN` (opcional).
- `initObservability()` en `src/main.tsx` inicia Sentry y logging centralizado; `traceAsyncOperation` envuelve operaciones críticas.
- Pasos mínimos para habilitar DSN y muestreo por entorno:
  1. Definir `VITE_SENTRY_DSN` en el servicio de secretos del entorno (Vercel/Cloudflare/Supabase) y validar que esté presente en los pipelines de build.
  2. Ajustar `VITE_APP_ENV` a `development`, `staging` o `production` y versionar `VITE_RELEASE` con el commit o tag desplegado.
  3. Fijar tasas de muestreo base (`VITE_SENTRY_ERROR_SAMPLE_RATE`, `VITE_SENTRY_TRACES_SAMPLE_RATE`, `VITE_SENTRY_PROFILES_SAMPLE_RATE`, `VITE_SENTRY_REPLAYS_SAMPLE_RATE`, `VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE`) según el entorno:
     - **Desarrollo**: `ERROR=1.0`, `TRACES=0.1`, `PROFILES=0.0`, `REPLAYS=0.0`, `REPLAYS_ON_ERROR=1.0`.
     - **Staging**: `ERROR=1.0`, `TRACES=0.3`, `PROFILES=0.1`, `REPLAYS=0.1`, `REPLAYS_ON_ERROR=1.0`.
     - **Producción**: `ERROR=1.0`, `TRACES=0.3` (aumentar si hay capacidad), `PROFILES=0.1`, `REPLAYS=0.0` (subir puntualmente para incidencias), `REPLAYS_ON_ERROR=1.0`.
  4. Verificar en consola de Sentry que el release aparece con las etiquetas `app`, `environment` y `runtime` una vez desplegado.

## 6. Implementación funcional

### 6.1 Sistema de Emails
**Estado**: Implementado y listo para configuración/testing. Arquitectura: `Usuario/Sistema → email_queue → process-email-queue → SendGrid/SES → Logs`.

**Componentes clave**
- Templates (`src/lib/email-templates.ts`): Welcome, Payment Confirmation, Low Credits Alert, Subscription Confirmation (HTML responsivo, texto plano, tracking).  
- Tablas: `email_logs` (tracking completo), `email_queue` (prioridad, reintentos, scheduling), `email_templates` (versionado).  
- Edge Functions: `send-email` (envío directo autenticado) y `process-email-queue` (batch 50 emails, retry con backoff, rate limit interno).

**Configuración y uso**
- Secrets mínimos: `SENDGRID_API_KEY`, `FROM_EMAIL`, opcional `OPENAI_API_KEY` si se usa con RAG en contenido dinámico.
- Envío directo:
  ```typescript
  await fetch(`${supabaseUrl}/functions/v1/send-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ to: 'user@example.com', subject: 'Test', html: '<h1>Hello</h1>', text: 'Hello' }),
  });
  ```
- Añadir a cola (recomendado): insertar en `email_queue` con prioridad (1-10) y `template_type`; `process-email-queue` se ejecuta cada 5 minutos (cron SQL `*/5 * * * *` o servicio externo) y aplica retries (5m/10m/15m).  
- Integración con Stripe: webhook `payment_intent.succeeded` ya añade confirmación de pago a la cola con prioridad alta.

**Monitoreo y mejores prácticas**
- Consultas rápidas:
  - Emails recientes: `SELECT to_email, subject, status, sent_at FROM email_logs ORDER BY sent_at DESC LIMIT 50;`
  - Cola pendiente por prioridad: `SELECT COUNT(*) AS pending, priority FROM email_queue WHERE status='pending' GROUP BY priority ORDER BY priority DESC;`
- Límites: SendGrid Free 100 emails/día; aplicar throttling y prioridad para mensajes críticos.  
- Compliance: incluir enlace de baja, SPF/DKIM configurados, GDPR/CAN-SPAM.  
- Testing: curl a `send-email` y `process-email-queue` para validar permisos y envío.

### 6.2 Sistema RAG
**Estado**: Implementado con pgvector y listo para ingestión y consulta. Arquitectura: `Documento → chunking (1000 chars, 200 overlap) → embeddings → pgvector → búsqueda semántica → contexto para LLM`.

**Componentes clave**
- Tablas: `documents` (metadata/estado), `document_chunks` (vectores 1536 dims con IVFFlat), `rag_queries` (logs de consultas).  
- Función SQL: `search_similar_chunks(query_embedding vector(1536), p_agent_id uuid, match_threshold float, match_count int)`.
- Edge Functions: `process-document` (chunking, embeddings OpenAI, persistencia) y `semantic-search` (top-K, logging, uso por workers sin auth).

**Flujo recomendado**
1. Subida y registro:
   ```typescript
   const { data: document } = await supabase
     .from('documents')
     .insert({ user_id: userId, agent_id: agentId, filename: file.name, file_type: file.type, file_size: file.size, raw_content: text, processing_status: 'pending' })
     .select()
     .single();
   ```
2. Procesamiento:
   ```typescript
   await fetch(`${supabaseUrl}/functions/v1/process-document`, {
     method: 'POST',
     headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
     body: JSON.stringify({ documentId: document.id, content: text, agentId }),
   });
   ```
3. Búsqueda semántica para workers o frontend:
   ```typescript
   const response = await fetch(`${supabaseUrl}/functions/v1/semantic-search`, {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ query: userQuery, agentId, matchThreshold: 0.7, matchCount: 5 }),
   });
   const { context, matches } = await response.json();
   ```
4. Inyección en prompt del agente: usar `context` en el mensaje de sistema; si no hay contexto relevante, instruir al modelo a indicarlo explícitamente.

**Monitoreo y tuning**
- Distribución de similitud reciente:
  ```sql
  SELECT CASE WHEN similarity > 0.9 THEN 'excellent' WHEN similarity > 0.8 THEN 'good' WHEN similarity > 0.7 THEN 'fair' ELSE 'poor' END AS quality, COUNT(*)
  FROM (SELECT jsonb_array_elements(relevance_scores) AS similarity FROM rag_queries WHERE created_at > NOW() - INTERVAL '7 days') sub
  GROUP BY quality;
  ```
- Uso por agente (documentos y tiempo medio): agrupar en `rag_queries` y `documents` para identificar hotspots.  
- Pendientes futuros: parsing avanzado PDF/DOCX, optimización de chunking y analytics de relevancia.

## 7. Despliegue y hosting
- **Frontend**:
  - Vercel (recomendado): `npm i -g vercel && vercel && vercel --prod` con variables `VITE_*` definidas en dashboard.
  - Netlify: `npm run build` y `netlify deploy --prod --dir=dist`.
  - Cloudflare Pages: conectar repo, build `npm run build`, output `dist`, añadir variables.
- **Backend (Supabase)**: usar `supabase functions deploy ...` para todas las Edge Functions; mantener secrets sincronizados.
- **DNS y dominio**: apuntar CNAME según hosting (Vercel/Netlify/Cloudflare). SSL automático en proveedores mencionados.
- **Paso a producción**: desactivar test mode en Stripe, actualizar keys y webhook; considerar plan Pro de Supabase para backups automáticos.
- **Costos guía**: MVP 0-100 usuarios ~USD 50-100/mes (OpenRouter principal), crecimiento 100-1000 usuarios ~USD 300-600/mes incluyendo Sentry y planes pagos de infra.

## 8. Operaciones, monitoreo y runbooks
- **Observabilidad**: Sentry captura tracing, errores y logs desde `initObservability`. Helpers `logInfo/logWarning/logError/captureException` y `traceAsyncOperation` en `src/observability/*`.  
- **Métricas Edge Functions**: latencia (`edge_latency_ms`), fallos (`edge_failure_total`), profundidad de cola (`edge_queue_depth`) etiquetadas por `feature`/`queue`; enviar a Pushgateway si se define `PROM_PUSHGATEWAY_URL`.
- **Alertas sugeridas**:
  - p99 latencia `process-document` >2s por 5m.
  - Ratio de fallos pagos/agents >2% en 5m.
  - `edge_queue_depth{queue="email"}` >50 sostenido 10m.
  - Frontend: errores por release y trazas lentas `feature:dashboard` en Sentry.
- **Runbooks**:
  - Picos de latencia: revisar Grafana/Prometheus, correlacionar spans Sentry por `feature`, escalar workers/colas si `edge_queue_depth` alto.
  - Aumento de fallos: verificar despliegue reciente (`VITE_RELEASE`), revisar logs estructurados en Sentry, aplicar rollback si >2% 10m.
  - Colas saturadas: aumentar concurrencia de función, pausar ingesta, validar dependencias externas (SMTP/OpenAI) y aplicar backoff.
  - Autenticación/Dashboard: filtrar issues en Sentry por `feature:auth` o `feature:dashboard` y spans `dashboard.*`.
- **Troubleshooting rápido**:
  - "Stripe not configured" → revisar secrets `STRIPE_*` en Supabase y `VITE_STRIPE_PUBLISHABLE_KEY` en entorno.
  - "Agent not deploying" → sin credenciales Cloudflare se usa modo simulación; si hay credenciales, revisar logs de `deploy-agent`.
  - "Notifications not showing" → revisar tabla `notifications` y webhooks de Stripe; esperar auto-refresh o click en campana.
- "AI service unavailable" → validar `OPENAI_API_KEY` y créditos disponibles.

## 9. Checklists y anexos rápidos
- **Seguridad antes de producción**: HTTPS activo, CSP configurado, rate limiting probado, RLS validado, secrets fuera de código, políticas de contraseña, audit logs, Términos/Privacidad/Cookies/GDPR.
- **Funcionalidad pre-release**: registro/login, creación y despliegue de agente, testing de agente, notificaciones, checkout Stripe, webhooks funcionando, créditos actualizados, stats correctas.
- **Pagos (modo test)**: usar tarjetas Stripe 4242 (éxito), 4000...0002 (decline), 4000...3155 (3DS); verificar eventos y créditos/notificaciones.
- **Cron y colas**: `process-email-queue` cada 5m; monitorear `email_queue` y `edge_queue_depth`.
- **Variables esenciales (resumen)**:
  - Front (`.env`/hosting): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_SENTRY_*`.
  - Functions/Secrets: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_BASIC`, `STRIPE_PRICE_ULTRA`, `OPENAI_API_KEY`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `SENDGRID_API_KEY` o credenciales SES, `FROM_EMAIL`.

---
Este manual unifica las guías de inicio rápido, despliegue, Cloudflare, emails, RAG y observabilidad para servir como referencia única para equipos de desarrollo y operaciones.
