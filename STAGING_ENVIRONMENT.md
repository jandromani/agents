# Entorno Staging con Paridad de Producción

Este documento describe cómo montar un entorno **staging** que replica producción: mismas variables, mismos secrets y misma observabilidad. Incluye el plan de pruebas y las incidencias resueltas antes del lanzamiento.

## 1. Configuración de entorno (frontend Vite)

1. Duplica la plantilla de staging y mantén los mismos valores que producción para detectar drift:
   ```bash
   cp .env.staging.example .env.staging
   ```
2. Variables clave (todas viven en `.env.staging` o variables de despliegue Vercel/Netlify):

| Variable | Propósito | Valor esperado en staging |
|----------|-----------|---------------------------|
| `VITE_APP_ENV` | Etiqueta de entorno para Sentry/feature flags | `staging` (igual a prod para monitoreo) |
| `VITE_RELEASE` | SHA o tag del despliegue | Usa el mismo release tag que prod para pruebas de regresión |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Conexión al proyecto Supabase | URL de staging con el **mismo anon key** que producción |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Clave pública de Stripe | Misma publishable key que prod (modo test/real según rollout) |
| `VITE_SENTRY_*` | DSN y muestreo | Igual que prod para comparar señal/ruido |
| `VITE_TURNSTILE_SITE_KEY` | Captcha | Mismo site key que prod |
| `VITE_SENDGRID_KEY` / `VITE_TWILIO_AUTH_TOKEN` | Integraciones de notificaciones | Misma configuración que prod |
| `VITE_APP_URL` | Dominio público | `https://staging.agenthub.com` o el dominio de staging |

> Mantener los mismos secrets evita sorpresas en Workers, Stripe o Sentry; solo cambian dominios/URLs públicas.

## 2. Configuración de Supabase Edge Functions

1. Carga los secrets de staging con la misma fuente de verdad que producción (1Password/Vault) usando la plantilla incluida:
   ```bash
   supabase secrets set --env-file supabase/.env.staging.example
   ```
2. Variables críticas y su paridad:

| Variable | Por qué importa | Nota de staging |
|----------|-----------------|-----------------|
| `SUPABASE_SERVICE_ROLE_KEY` | RLS y funciones | Igual que prod para replicar permisos |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRICE_*` | Pagos | Mismos IDs para validar flujos reales |
| `OPENAI_API_KEY` | RAG/embeddings | Misma cuenta para resultados comparables |
| `SENDGRID_API_KEY` / `FROM_EMAIL` | Emails | Misma cuenta y remitente que prod |
| `TURNSTILE_SECRET_KEY` / `TOTP_ENCRYPTION_KEY` | Seguridad | Idénticos para reproducir 2FA/CAPTCHA |
| `SENTRY_DSN` / `PROM_PUSHGATEWAY_URL` | Observabilidad | Igual que prod, con `ENVIRONMENT=staging` |
| `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` | Workers | Mismos tokens para generar workers reales |

3. Después de cargar secrets:
   - Aplica migraciones: `npx supabase db push`
   - Despliega funciones: `supabase functions deploy --project-ref <staging-ref> <function-name>` (todas las funciones listadas en `supabase/functions`).

## 3. Observabilidad y releases
- Usa `VITE_APP_ENV=staging` en frontend y `ENVIRONMENT=staging` en Edge Functions para etiquetar trazas.
- Reutiliza `VITE_RELEASE` / `RELEASE` con el mismo SHA que prod para comparar issues cross-env.
- Mantén muestreo (`VITE_SENTRY_TRACES_SAMPLE_RATE`, `SENTRY_TRACES_SAMPLE_RATE`, etc.) igual a prod para evaluar señal/ruido antes del lanzamiento.

## 4. Pruebas ejecutadas

### Automáticas
- `npm run lint` *(pendiente de repetir tras poder instalar dependencias: el registro de npm devolvió 403 al bajar Playwright)*
- `npm run typecheck` *(pendiente por la misma razón)*
- `npm run test:unit` *(pendiente por la misma razón)*

### Manuales
- Validación de paridad de variables: las plantillas `.env.staging.example` y `supabase/.env.staging.example` cubren todas las referencias de `import.meta.env` y `Deno.env.get` detectadas en frontend y Edge Functions.
- Revisión de flujo de despliegue: se documentó el comando único `supabase secrets set --env-file ...` para evitar cargas parciales y se alineó `VITE_APP_ENV`/`ENVIRONMENT` con Sentry.

## 5. Incidencias encontradas y resolución
- **Variables faltantes en plantillas**: el `.env.example` anterior omitía claves críticas (Turnstile, SendGrid/Twilio, muestreo Sentry). Esto impedía montar staging con la misma matriz de secrets que producción.
  - **Resolución**: se ampliaron `.env.example` y `.env.staging.example` con todos los valores usados por el frontend y se añadió `supabase/.env.staging.example` para los Edge Functions, asegurando paridad completa.
- **Bloqueo al instalar dependencias**: `npm install` devolvió 403 al descargar `@playwright/test` desde el registro público, bloqueando la ejecución de lint/typecheck/tests.
  - **Resolución**: usar un mirror interno/permitido del registro de npm o inyectar las dependencias desde caché corporativa antes de reejecutar los comandos automáticos.
- **Carga manual propensa a errores**: no había un flujo único para subir secrets de staging a Supabase.
  - **Resolución**: se documentó `supabase secrets set --env-file supabase/.env.staging.example` como paso canónico para evitar drift entre entornos.
