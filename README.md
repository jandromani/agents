# AgentHub — Documentación Única

Esta guía fusiona todas las referencias previas (inicio rápido, despliegue, Cloudflare, emails, RAG, seguridad, observabilidad, planes y estado). Aquí encontrarás lo necesario para desarrollar, lanzar y operar AgentHub sin consultar múltiples archivos.

## 1. Visión general
- SaaS para crear y desplegar agentes IA sin código sobre React + TypeScript + Tailwind, con backend en Supabase y workers en Cloudflare.
- Integraciones: Stripe (pagos/suscripciones), OpenRouter/OpenAI (LLM + embeddings), SendGrid/SES (emails), pgvector (RAG) y Sentry + Prometheus (observabilidad).
- Seguridad base: RLS en todas las tablas, rate limiting, políticas de contraseñas (12+ chars con complejidad), audit/security logs y CSP.
- Estado actual: ~88% completado, listo para beta privada; pendientes principales: parsing avanzado de PDF/DOCX, panel admin completo, E2E, CAPTCHA/2FA extendidos y monitorización Sentry en producción.

## 2. Inicio rápido local (≤15 min)
1. Clona e instala:
   ```bash
   git clone <tu-repo>
   cd agenthub
   npm install
   cp .env.example .env
   ```
2. Completa `.env` (ver matriz de variables en la sección 3) y valida con `ENV_FILE=.env npm run lint:env`.
3. Configura Supabase: crea proyecto, copia `Project URL` y `anon public key`, actualiza `.env` y aplica migraciones en el SQL Editor en orden:
   - `supabase/migrations/20251123093001_create_initial_schema.sql`
   - `supabase/migrations/20251123100005_create_security_and_audit_tables.sql`
   - `supabase/migrations/20251123100140_create_payment_tables.sql`
4. Ejecuta local: `npm run dev` y abre http://localhost:5173. Flujo de humo: registro (password 12+), login, crear agente (modo simulación si no hay Cloudflare), ver notificaciones.

## 3. Variables y secrets imprescindibles
- **Frontend (Vite)**: `VITE_APP_ENV`, `VITE_APP_NAME`, `VITE_APP_URL`, `VITE_RELEASE`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_TURNSTILE_SITE_KEY`, `VITE_SENDGRID_KEY`, `VITE_TWILIO_AUTH_TOKEN`, `VITE_SENTRY_DSN`, `VITE_SENTRY_CDN`, `VITE_SENTRY_MONITOR_SLUG`, `VITE_SENTRY_TRACES_SAMPLE_RATE`, `VITE_SENTRY_PROFILES_SAMPLE_RATE`, `VITE_SENTRY_ERROR_SAMPLE_RATE`, `VITE_SENTRY_REPLAYS_SAMPLE_RATE`, `VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE`, `VITE_APDEX_THRESHOLD`.
- **Edge Functions / backend (Supabase → Edge Functions → Secrets)**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_BASIC`, `STRIPE_PRICE_ULTRA`, `OPENAI_API_KEY`, `SENDGRID_API_KEY`, `FROM_EMAIL`, `TURNSTILE_SECRET_KEY`, `TOTP_ENCRYPTION_KEY`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `SENTRY_DSN`, `SENTRY_TRACES_SAMPLE_RATE`, `SENTRY_PROFILES_SAMPLE_RATE`, `SENTRY_ERROR_SAMPLE_RATE`, `SENTRY_DEBUG`, `ENVIRONMENT`, `RELEASE`, `PROM_PUSHGATEWAY_URL`, `HOSTNAME`.
- Usa los mismos valores en staging y producción para detectar drift; carga staging con `supabase secrets set --env-file supabase/.env.staging.example`.

## 4. Servicios externos y configuración
- **Supabase**: linkea proyecto (`supabase login` + `supabase link --project-ref <ref>`). Despliega funciones clave: `deploy-agent`, `track-usage`, `manage-credits`, `stripe-webhook`, `create-checkout`, `create-payment-intent`, `send-email`, `process-email-queue`, `process-document`, `semantic-search`.
- **Stripe**: modo test; crea productos Premium Basic (€29/mes, 3 agentes, 100 consultas/día) y Premium Ultra (€99/mes, 10 agentes, consultas ilimitadas). Webhook en `https://<project>.supabase.co/functions/v1/stripe-webhook` con eventos `customer.*`, `payment_intent.*`, `invoice.*`, `customer.subscription.*`, `payment_method.attached`. Define `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_BASIC`, `STRIPE_PRICE_ULTRA`, `VITE_STRIPE_PUBLISHABLE_KEY`.
- **OpenRouter/OpenAI**: crea API key (`sk-or-...` o `sk-...`) y guárdala como `OPENAI_API_KEY`; necesaria para pruebas reales y RAG.
- **Cloudflare Workers**: requiere `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN` (permiso Edit Workers). Sin credenciales funciona en modo simulación: crea agentes y URLs simuladas pero no despliega ni prueba workers. Con credenciales, se genera worker `agent-{uuid16}` en `https://agent-{id}.{account}.workers.dev` con modelo, contexto y límites por plan.
- **Emails (SendGrid/SES)**: usar `SENDGRID_API_KEY` y `FROM_EMAIL` (o credenciales SES). Arquitectura: templates (`src/lib/email-templates.ts`) + tablas `email_queue`/`email_logs`/`email_templates` + Edge Functions `send-email` (envío directo) y `process-email-queue` (batch, prioridad, retry exponencial). Webhooks Stripe añaden correos de confirmación a la cola.
- **Observabilidad (Sentry/Prometheus)**: `initObservability` en `src/main.tsx` carga Sentry desde CDN; helpers de logging/tracing en `src/observability/*`. Ajusta muestreos por entorno (ej. dev: traces 0.1; prod: traces 0.3, profiles 0.1). `recordUptimeHeartbeat` soporta Monitors; `PROM_PUSHGATEWAY_URL` habilita métricas de Edge (`edge_latency_ms`, `edge_failure_total`, `edge_queue_depth`).

## 5. Despliegue
- **Frontend**: build con `npm run build`; host en Vercel/Netlify/Cloudflare Pages. Define todas las variables `VITE_` y DSN de Sentry. Usa `VITE_RELEASE` con el SHA/tag desplegado.
- **Supabase**: `npx supabase db push` para migraciones y `supabase functions deploy <fn>` para funciones. Mantén secrets iguales en staging/prod; etiqueta entorno con `ENVIRONMENT` y `VITE_APP_ENV`.
- **Workers**: tras configurar Cloudflare, `deploy-agent` generará y publicará el worker al crear un agente. Si falla, revisa permisos del token y créditos OpenRouter.

## 6. Operación y runbooks clave
- **Seguridad**: rate limits en login/registro/reset/deploy/queries; password policy reforzada; limpieza de intentos fallidos; RLS estricta; CSP y sanitización en `src/lib/security.ts`. Pen-tests recomendados con OWASP ASVS/API y 2FA/CAPTCHA activo; preparar staging con cuentas efímeras y auditoría via `audit_logs` y `security_logs`.
- **Pagos**: `stripe-webhook` maneja `customer.*`, `payment_intent.*`, `invoice.*`, `customer.subscription.*`, `payment_method.attached`, calcula comisión 10%, actualiza créditos y notificaciones. Usa productos/price IDs reales y webhook `whsec_` en secrets.
- **Emails**: consulta `email_logs` para últimos envíos y `email_queue` para pendientes por prioridad; `process-email-queue` cada 5 min (cron SQL o externo) con 3 reintentos (5m/10m/15m).
- **RAG**: flujo `documents` → `process-document` (chunking 1000 chars, overlap 200, embeddings OpenAI, `document_chunks` con pgvector) → `semantic-search` (top-K con `search_similar_chunks`). Logs en `rag_queries`.
- **Observabilidad**: dashboards en Sentry con tags `app`, `environment`, `feature`; alertas sugeridas: p99 >2s para `process-document`, ratio de fallos >2% en pagos/agentes, `edge_queue_depth` email >50 por 10m. Uptime vía Monitors (`<slug>.<servicio>`). Usa `traceAsyncOperation` y `log*` helpers en nuevas rutas.
- **Staging paritario**: duplica `.env.staging.example`, usa mismas claves que producción (URLs distintas). Carga secrets con CLI, despliega funciones y aplica migraciones. Repite lint/typecheck/tests cuando el mirror de npm permita instalar Playwright.

## 7. Lanzamiento y soporte
- **Marketing/soporte**: onboarding con manuales breves, FAQ y assets de landing; canal de soporte con SLA para beta privada; notificaciones in-app y emails automáticos ya integrados.
- **KPIs de readiness**: beta privada activada con seguridad, pagos, emails y RAG funcionales; plan de pruebas de penetración en cola; métricas y alertas configuradas.

## 8. Estado y roadmap
- Completitud promedio 88% (landing, auth, seguridad, dashboard, agentes, pagos, notificaciones, emails, RAG, BD y functions casi listas para producción).
- Pendientes inmediatos: parser avanzado de documentos, panel admin, E2E automatizado, refuerzo CAPTCHA/2FA, monitorización Sentry en prod y migrar dependencias de Playwright a un registro accesible.
- Próximas versiones: v1.0 beta (emails y RAG básicos, monitoring, E2E crítico, beta 50-100 usuarios); v1.5 producción (admin panel, RAG avanzado, 2FA, testing amplio); v2.0 escalabilidad (marketplace, colaboración, white label, multi-idioma, móvil).

## 9. Comandos de utilidad
- Desarrollo: `npm run dev`
- Build: `npm run build`
- Preview: `npm run preview`
- Lint: `npm run lint`
- Type check: `npm run typecheck`

## 10. Contacto
- Soporte: support@agenthub.com | hello@agenthub.com | Twitter @agenthub
- Issues: abre tickets en GitHub.
