# AgentHub - Guía de Despliegue Completa

## Resumen Ejecutivo

Esta guía te llevará paso a paso desde cero hasta tener AgentHub funcionando en producción con todos los servicios configurados.

---

## FASE 1: CONFIGURACIÓN INICIAL

### 1.1 Requisitos Previos

- Cuenta de GitHub (para despliegue)
- Cuenta de Supabase (gratuita para empezar)
- Cuenta de Stripe (test mode para desarrollo)
- Cuenta de SendGrid o Amazon SES (para emails)
- Cuenta de Cloudflare (opcional, para workers)
- Node.js 18+ instalado localmente

### 1.2 Clonar y Configurar Proyecto

```bash
# Clonar repositorio
git clone <tu-repo>
cd agenthub

# Instalar dependencias
npm install

# Copiar archivo de entorno
cp .env.example .env
```

---

## FASE 2: CONFIGURACIÓN DE SUPABASE

### 2.1 Crear Proyecto

1. Ve a [supabase.com](https://supabase.com)
2. Click en "New Project"
3. Nombre: "agenthub-production"
4. Región: Elige la más cercana a tus usuarios
5. Contraseña de BD: Guárdala de forma segura

### 2.2 Obtener Credenciales

En Settings → API:
- `Project URL`: Copia esto
- `anon public key`: Copia esto

Actualiza tu `.env`:
```bash
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

### 2.3 Checklist de Variables de Entorno

Antes de desplegar funciones o frontend, revisa que cada variable tenga un valor real (test o producción según corresponda):

**Frontend (`VITE_`, visibles en el bundle):**
- `VITE_APP_ENV`, `VITE_APP_URL`, `VITE_RELEASE`
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- `VITE_STRIPE_PUBLISHABLE_KEY`
- `VITE_SENTRY_DSN`, `VITE_SENTRY_CDN`, `VITE_SENTRY_TRACES_SAMPLE_RATE`, `VITE_SENTRY_PROFILES_SAMPLE_RATE`, `VITE_SENTRY_ERROR_SAMPLE_RATE`, `VITE_SENTRY_REPLAYS_SAMPLE_RATE`, `VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE`
- `VITE_TURNSTILE_SITE_KEY`
- `VITE_SENDGRID_KEY`, `VITE_TWILIO_AUTH_TOKEN`

**Backend / Edge Functions (configurar en Supabase → Edge Functions → Secrets):**
- Núcleo Supabase: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_BASIC`, `STRIPE_PRICE_ULTRA`
- OpenAI: `OPENAI_API_KEY`
- Cloudflare (deploy-agent): `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`
- Captcha: `TURNSTILE_SECRET_KEY`
- MFA: `TOTP_ENCRYPTION_KEY`
- Emails: `SENDGRID_API_KEY`, `FROM_EMAIL`
- Observabilidad en edge: `SENTRY_DSN`, `SENTRY_TRACES_SAMPLE_RATE`, `SENTRY_PROFILES_SAMPLE_RATE`, `SENTRY_ERROR_SAMPLE_RATE`, `SENTRY_DEBUG`, `RELEASE`, `MODE`, `PROM_PUSHGATEWAY_URL`

💡 Recomendación: usa valores de producción en staging para detectar diferencias y evita exponer claves secretas sin el prefijo `VITE_`.

### 2.4 Aplicar Migraciones

Ve a SQL Editor en Supabase Dashboard y ejecuta **en orden**:

1. `supabase/migrations/20251123093001_create_initial_schema.sql`
2. `supabase/migrations/20251123100005_create_security_and_audit_tables.sql`
3. `supabase/migrations/20251123100140_create_payment_tables.sql`
4. Las nuevas migraciones de seguridad y auditoría

O desde CLI:
```bash
npx supabase db push
```

### 2.5 Configurar Edge Functions

Desde tu proyecto local:

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Link proyecto
supabase link --project-ref tu-project-ref

# Deploy functions
supabase functions deploy deploy-agent
supabase functions deploy track-usage
supabase functions deploy manage-credits
supabase functions deploy stripe-webhook
supabase functions deploy create-checkout
supabase functions deploy create-payment-intent
```

---

## FASE 3: CONFIGURACIÓN DE STRIPE

### 3.1 Crear Cuenta

1. Ve a [stripe.com](https://stripe.com)
2. Crea cuenta y verifica email
3. Activa test mode (toggle arriba a la derecha)

### 3.2 Obtener API Keys

En Developers → API keys:
- `Publishable key`: Empieza con `pk_test_`
- `Secret key`: Empieza con `sk_test_`

### 3.3 Crear Productos y Precios

En Products → Add Product:

**Premium Basic**:
- Nombre: "Premium Basic"
- Descripción: "3 agentes, 100 consultas/día"
- Precio: €29/mes
- Copia el `Price ID` (empieza con `price_`)

**Premium Ultra**:
- Nombre: "Premium Ultra"
- Descripción: "10 agentes, consultas ilimitadas"
- Precio: €99/mes
- Copia el `Price ID`

### 3.4 Configurar Webhook

En Developers → Webhooks → Add endpoint:
- URL: `https://tu-proyecto.supabase.co/functions/v1/stripe-webhook`
- Eventos a escuchar:
  - `customer.created`
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `invoice.paid`
  - `invoice.payment_failed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `payment_method.attached`

Copia el `Signing secret` (empieza con `whsec_`)

### 3.5 Configurar Secrets en Supabase

En Supabase Dashboard → Edge Functions → Secrets:

```bash
STRIPE_SECRET_KEY=sk_test_tu_secret_key
STRIPE_WEBHOOK_SECRET=whsec_tu_webhook_secret
STRIPE_PRICE_BASIC=price_id_basic
STRIPE_PRICE_ULTRA=price_id_ultra
```

También actualiza `.env` local:
```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_tu_publishable_key
```

---

## FASE 4: CONFIGURACIÓN DE OPENROUTER

### 4.1 Crear Cuenta

1. Ve a [openrouter.ai](https://openrouter.ai)
2. Regístrate y verifica email
3. Añade créditos ($10-20 para empezar)

### 4.2 Obtener API Key

En Keys → Create Key:
- Nombre: "AgentHub Production"
- Copia la key (empieza con `sk-or-`)

### 4.3 Configurar en Supabase

En Edge Functions Secrets:
```bash
OPENROUTER_API_KEY=sk-or-tu_api_key
```

---

## FASE 5: CLOUDFLARE WORKERS (OPCIONAL)

### 5.1 Si NO Usas Cloudflare

El sistema funcionará en **modo simulación**:
- Los agentes se crearán en BD
- URLs simuladas generadas
- **No habrá workers reales desplegados**

Para desarrollo/testing está bien.

### 5.2 Si SÍ Usas Cloudflare

Ver `CLOUDFLARE_SETUP.md` para instrucciones completas.

Resumen:
1. Crea cuenta en Cloudflare
2. Ve a Workers & Pages
3. Obtén Account ID y crea API Token
4. Configura en Supabase Secrets:
   ```bash
   CLOUDFLARE_ACCOUNT_ID=tu_account_id
   CLOUDFLARE_API_TOKEN=tu_api_token
   ```

---

## FASE 6: EMAILS (SENDGRID O SES)

### Opción A: SendGrid

1. Ve a [sendgrid.com](https://sendgrid.com)
2. Crea cuenta gratuita (100 emails/día)
3. Settings → API Keys → Create API Key
4. Copia la key (empieza con `SG.`)

Configura en Supabase:
```bash
SENDGRID_API_KEY=SG.tu_api_key
FROM_EMAIL=noreply@tudominio.com
```

### Opción B: Amazon SES

1. Ve a AWS Console → SES
2. Verifica tu dominio
3. Crea credenciales SMTP
4. Configura en Supabase:
   ```bash
   SES_SMTP_USERNAME=tu_username
   SES_SMTP_PASSWORD=tu_password
   SES_SMTP_HOST=email-smtp.region.amazonaws.com
   FROM_EMAIL=noreply@tudominio.com
   ```

**NOTA**: Necesitarás crear Edge Function para enviar emails. Ver sección "Desarrollo Pendiente" abajo.

---

## FASE 7: DESPLIEGUE FRONTEND

### Opción A: Vercel (Recomendado)

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel

# Producción
vercel --prod
```

En Vercel Dashboard → Settings → Environment Variables:
- Añade todas las variables `VITE_*` de tu `.env`

### Opción B: Netlify

```bash
# Instalar Netlify CLI
npm i -g netlify-cli

# Build
npm run build

# Deploy
netlify deploy --prod --dir=dist
```

### Opción C: Cloudflare Pages

1. Push código a GitHub
2. Ve a Cloudflare Dashboard → Pages
3. Connect to Git → Selecciona tu repo
4. Build command: `npm run build`
5. Output directory: `dist`
6. Añade variables de entorno

---

## FASE 8: CONFIGURACIÓN DNS Y DOMINIO

### 8.1 Comprar Dominio

En Namecheap, GoDaddy, Cloudflare, etc:
- Ejemplo: `agenthub.com`

### 8.2 Configurar DNS

Apunta tu dominio al servicio de hosting:

**Para Vercel**:
- CNAME: `cname.vercel-dns.com`

**Para Netlify**:
- CNAME: `tu-site.netlify.app`

**Para Cloudflare Pages**:
- Automático si dominio en Cloudflare

### 8.3 Configurar SSL

Todos los servicios (Vercel/Netlify/Cloudflare) proveen SSL gratis automáticamente.

---

## FASE 9: PRUEBAS PRE-PRODUCCIÓN

### 9.1 Checklist de Seguridad

- [ ] HTTPS habilitado
- [ ] CSP headers configurados
- [ ] Rate limiting probado
- [ ] RLS policies verificadas
- [ ] Secrets NO expuestas en código
- [ ] Passwords fuertes requeridas
- [ ] Audit logs funcionando

### 9.2 Checklist de Funcionalidad

- [ ] Registro de usuario funciona
- [ ] Login funciona
- [ ] Creación de agente funciona
- [ ] Despliegue de agente funciona
- [ ] Testing de agente funciona
- [ ] Notificaciones aparecen
- [ ] Checkout de Stripe funciona
- [ ] Webhooks de Stripe funcionan
- [ ] Créditos se actualizan correctamente
- [ ] Stats en dashboard correctos

### 9.3 Pruebas de Pago (Test Mode)

Tarjetas de prueba Stripe:
- Éxito: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Requiere 3DS: `4000 0025 0000 3155`

Prueba:
1. Comprar créditos
2. Suscribirse a plan
3. Verificar webhook events en Stripe Dashboard
4. Verificar créditos en dashboard
5. Verificar notificaciones

---

## FASE 10: LANZAMIENTO A PRODUCCIÓN

### 10.1 Cambiar a Modo Producción

**Stripe**:
1. Dashboard → Test mode OFF
2. Completa verificación de negocio
3. Actualiza API keys de producción
4. Actualiza webhook URL con keys de producción

**Supabase**:
- Si estás en plan Free, considera upgrade para mayor capacidad

### 10.2 Monitoring y Alertas

**Recomendado**: Añadir Sentry (ver sección "Desarrollo Pendiente")

**Mínimo**:
- Monitorea Supabase Dashboard → Logs
- Revisa Stripe Dashboard → Events
- Configura alertas de uptime (UptimeRobot, Pingdom)

### 10.3 Backups

**Supabase** (Plan Pro):
- Backups automáticos diarios
- Point-in-time recovery

**Supabase Free**:
- Exporta BD manualmente semanal
- `pg_dump` desde SQL Editor

### 10.4 Legal y Compliance

**CRÍTICO ANTES DE LANZAR**:
- [ ] Términos de Servicio
- [ ] Política de Privacidad
- [ ] Política de Cookies
- [ ] GDPR compliance (si UE)
- [ ] Aviso de precios e IVA

---

## DESARROLLO PENDIENTE (NO BLOQUEANTE)

### Alta Prioridad

1. **Sistema de Emails Completo**
   - Edge Function para enviar emails
   - Templates HTML profesionales
   - Email de bienvenida
   - Email de confirmación de pago
   - Email de alerta de créditos bajos

2. **RAG Funcional**
   - Parsing de PDFs/DOCX
   - Generación de embeddings
   - Vector database (Pinecone o pgvector)
   - Búsqueda semántica

3. **Panel Administrativo**
   - Dashboard de métricas
   - Gestión de usuarios
   - Moderación de agentes
   - Revenue tracking

### Media Prioridad

4. **2FA (Autenticación de Dos Factores)**
   - TOTP con Google Authenticator
   - Backup codes

5. **Testing Automatizado**
   - E2E tests con Playwright
   - Unit tests críticos
   - CI/CD pipeline

6. **Monitoring Avanzado**
   - Sentry integration
   - Performance monitoring
   - Error tracking

### Baja Prioridad

7. **Features Adicionales**
   - Dark mode
   - Multi-idioma
   - Agent marketplace
   - Collaboration features
   - White label

---

## COSTOS ESTIMADOS MENSUALES

**Mínimo Viable** (0-100 usuarios):
- Supabase Free: $0
- Vercel/Netlify Free: $0
- Stripe: 2.9% + $0.30 por transacción
- SendGrid Free: $0 (100 emails/día)
- OpenRouter: ~$50-100 (variable)
- Dominio: ~$15/año

**Total**: ~$50-100/mes + fees por transacción

**Crecimiento** (100-1000 usuarios):
- Supabase Pro: $25/mes
- Vercel Pro: $20/mes (opcional)
- Cloudflare Workers: $5/mes
- SendGrid Basic: $15/mes
- OpenRouter: $200-500/mes
- Monitoring (Sentry): $26/mes

**Total**: ~$300-600/mes

---

## SOPORTE Y TROUBLESHOOTING

### Logs y Debugging

**Supabase**:
- Dashboard → Logs → Edge Functions
- Ver errores de funciones
- Ver queries lentas

**Stripe**:
- Dashboard → Events
- Ver todos los webhooks
- Retry webhooks fallidos

**Browser Console**:
- F12 → Console
- Ver errores de JavaScript
- Ver network requests

### Problemas Comunes

**"Stripe not configured"**:
- Verifica secrets en Supabase
- Verifica que VITE_STRIPE_PUBLISHABLE_KEY está en .env

**"Agent not deploying"**:
- Cloudflare no configurado → modo simulación
- Revisa logs de deploy-agent function

**"Notifications not showing"**:
- Revisa tabla notifications en BD
- Verifica que webhooks de Stripe funcionan

**"Credits not updating"**:
- Verifica webhook de Stripe llegó
- Revisa logs de stripe-webhook function
- Verifica comisión 10% se calcula correctamente

### Contacto

Para ayuda adicional, revisa:
- `DEVELOPMENT_STATUS.md` - Estado del proyecto
- `CLOUDFLARE_SETUP.md` - Configuración Cloudflare
- GitHub Issues - Problemas conocidos

---

## FASE 6: STAGING ESPEJO DE PRODUCCIÓN

Usa esta fase para validar todo antes del lanzamiento público. El objetivo es que staging use **los mismos secrets y configuraciones que producción** para detectar cualquier diferencia.

1) **Frontend Vite**
- Copia la plantilla de staging: `cp .env.staging.example .env.staging`
- Mantén los mismos valores de producción para Sentry (`VITE_SENTRY_*`), Stripe (`VITE_STRIPE_PUBLISHABLE_KEY`), Turnstile y Supabase (`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`).
- Ajusta solo `VITE_APP_URL` al dominio de staging.

2) **Supabase Edge Functions**
- Carga los secrets con un solo comando: `supabase secrets set --env-file supabase/.env.staging.example`
- Verifica que `SUPABASE_SERVICE_ROLE_KEY`, Stripe (`STRIPE_*`), OpenAI, SendGrid y Turnstile coincidan con producción.
- Despliega funciones contra el proyecto de staging: `supabase functions deploy --project-ref <staging-ref> <function-name>`.

3) **Observabilidad y QA**
- Usa `VITE_APP_ENV=staging` y `ENVIRONMENT=staging` para etiquetar trazas en Sentry.
- Ejecuta `npm run lint`, `npm run typecheck` y `npm run test:unit` antes de abrir tráfico.
- Consulta `STAGING_ENVIRONMENT.md` para el checklist completo y las incidencias resueltas.

---

## CONCLUSIÓN

Siguiendo esta guía, tendrás AgentHub funcionando en producción con:

✅ Autenticación segura
✅ Sistema de pagos completo
✅ Notificaciones in-app
✅ Generación y despliegue de agentes
✅ Dashboard funcional
✅ Estadísticas en tiempo real

El proyecto está en **~75-80% de completitud** para MVP.

**Tiempo estimado de setup inicial**: 4-6 horas

**Próximos pasos recomendados**:
1. Completar sistema de emails
2. Implementar RAG funcional
3. Añadir tests automatizados
4. Beta privada con 50 usuarios
5. Iterar según feedback
6. Lanzamiento público

¡Buena suerte con tu lanzamiento! 🚀
