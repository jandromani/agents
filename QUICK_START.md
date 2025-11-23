# AgentHub - Guía de Inicio Rápido

Haz que AgentHub funcione en tu máquina local en **menos de 15 minutos**.

---

## 📋 Pre-requisitos

- Node.js 18+ instalado
- Cuenta de Supabase (gratis)
- Cuenta de Stripe (test mode)

---

## 🚀 Paso 1: Clonar y Configurar (2 min)

```bash
# Clonar proyecto
git clone <tu-repositorio>
cd agenthub

# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env
```

### Variables de entorno imprescindibles
- **Frontend**: `VITE_APP_ENV`, `VITE_APP_NAME`, `VITE_APP_URL`, `VITE_RELEASE`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_TURNSTILE_SITE_KEY`, `VITE_SENDGRID_KEY`, `VITE_TWILIO_AUTH_TOKEN`, `VITE_SENTRY_DSN`, `VITE_SENTRY_CDN`, `VITE_SENTRY_MONITOR_SLUG`, `VITE_SENTRY_TRACES_SAMPLE_RATE`, `VITE_SENTRY_PROFILES_SAMPLE_RATE`, `VITE_SENTRY_ERROR_SAMPLE_RATE`, `VITE_SENTRY_REPLAYS_SAMPLE_RATE`, `VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE`, `VITE_APDEX_THRESHOLD`.
- **Edge Functions / Backend**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_BASIC`, `STRIPE_PRICE_ULTRA`, `OPENAI_API_KEY`, `SENDGRID_API_KEY`, `FROM_EMAIL`, `TURNSTILE_SECRET_KEY`, `TOTP_ENCRYPTION_KEY`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `SENTRY_DSN`, `SENTRY_TRACES_SAMPLE_RATE`, `SENTRY_PROFILES_SAMPLE_RATE`, `SENTRY_ERROR_SAMPLE_RATE`, `SENTRY_DEBUG`, `ENVIRONMENT`, `RELEASE`, `PROM_PUSHGATEWAY_URL`, `HOSTNAME`.
- Valida que todas estén definidas antes de desplegar con: `ENV_FILE=.env npm run lint:env`.

---

## 🔧 Paso 2: Configurar Supabase (5 min)

### 2.1 Crear Proyecto

1. Ve a [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Nombre: `agenthub-local`
4. Región: Más cercana
5. Password: Guarda esto

### 2.2 Obtener Credenciales

En **Settings** → **API**:
- Copia `Project URL`
- Copia `anon public key`

### 2.3 Actualizar .env

Edita `.env`:
```bash
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...tu-key...
```

### 2.4 Aplicar Migraciones

En Supabase Dashboard → **SQL Editor**, ejecuta en orden:

1. Copia todo el contenido de `supabase/migrations/20251123093001_create_initial_schema.sql`
2. Pégalo en el editor y ejecuta (**Run**)
3. Repite con `20251123100005_create_security_and_audit_tables.sql`
4. Repite con `20251123100140_create_payment_tables.sql`

---

## 💳 Paso 3: Configurar Stripe (5 min)

### 3.1 Obtener Keys

1. Ve a [dashboard.stripe.com](https://dashboard.stripe.com)
2. Activa **Test Mode** (toggle arriba derecha)
3. Ve a **Developers** → **API keys**
4. Copia `Publishable key` (empieza con `pk_test_`)

### 3.2 Actualizar .env

Edita `.env`:
```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...tu-key...
```

### 3.3 Configurar Secret Key en Supabase

En Supabase Dashboard → **Edge Functions** → **Secrets**:

Click **Add Secret**:
- Name: `STRIPE_SECRET_KEY`
- Value: `sk_test_...` (de Stripe Dashboard)

---

## ▶️ Paso 4: Ejecutar Localmente (1 min)

```bash
# Iniciar servidor de desarrollo
npm run dev
```

Abre: [http://localhost:5173](http://localhost:5173)

---

## ✅ Paso 5: Probar (2 min)

### 5.1 Registrarse

1. Click **"Empezar Gratis"**
2. Completa el formulario (email + password 12+ chars)
3. Click **"Crear Cuenta"**

### 5.2 Crear Agente

1. En Dashboard, click **"Crear Nuevo Agente"**
2. Completa los 4 pasos del wizard
3. Click **"Crear Agente"**

### 5.3 Ver Notificaciones

1. Click en el icono de campana (arriba derecha)
2. Deberías ver notificaciones de bienvenida

---

## 🎨 Funcionalidades Disponibles

### ✅ Funcionan Sin Configuración Adicional

- ✅ Registro y login
- ✅ Crear agentes
- ✅ Dashboard con estadísticas
- ✅ Notificaciones in-app
- ✅ Seguridad y rate limiting
- ✅ Validación de contraseñas

### ⚠️ Requieren Configuración Adicional

- ⚠️ **Desplegar agentes**: Necesita Cloudflare (ver `CLOUDFLARE_SETUP.md`)
- ⚠️ **Probar agentes**: Necesita API key de OpenRouter/OpenAI
- ⚠️ **Comprar créditos**: Necesita webhook de Stripe
- ⚠️ **Suscripciones**: Necesita productos creados en Stripe

---

## 🔧 Configuración Adicional (Opcional)

### OpenRouter / OpenAI (Para probar agentes)

1. Ve a [openrouter.ai](https://openrouter.ai) u [platform.openai.com](https://platform.openai.com)
2. Crea API key (ej. `sk-or-...` o `sk-...`)
3. En Supabase → Edge Functions → Secrets:
   - Name: `OPENAI_API_KEY`
   - Value: `tu-api-key`

### Webhook de Stripe (Para pagos)

1. En Stripe Dashboard → **Developers** → **Webhooks**
2. Click **Add endpoint**
3. URL: `https://tu-proyecto.supabase.co/functions/v1/stripe-webhook`
4. Eventos: Selecciona todos de `customer.*`, `payment.*`, `invoice.*`
5. Copia `Signing secret` (empieza con `whsec_`)
6. En Supabase Secrets:
   - Name: `STRIPE_WEBHOOK_SECRET`
   - Value: `whsec_...`

---

## 🐛 Troubleshooting Rápido

### "Cannot connect to Supabase"
- Verifica que `.env` tiene las URLs correctas
- Reinicia el servidor (`Ctrl+C` y `npm run dev`)

### "Password is too weak"
- Contraseña debe tener 12+ caracteres
- Incluir mayúsculas, minúsculas, números y símbolos

### "Agent not deploying"
- Es normal sin Cloudflare configurado
- El agente se crea pero no se despliega
- Ver `CLOUDFLARE_SETUP.md` para configuración completa

### "Notifications not showing"
- Espera 30 segundos (auto-refresh)
- Click en la campana para forzar actualización

---

## 📚 Próximos Pasos

### Para Desarrollo Local
1. Lee `DEVELOPMENT_STATUS.md` - Estado completo del proyecto
2. Lee `CLOUDFLARE_SETUP.md` - Desplegar agentes reales

### Para Producción
1. Lee `DEPLOYMENT_GUIDE.md` - Guía completa de despliegue
2. Configura todos los servicios (Stripe, OpenRouter, Cloudflare)
3. Sigue checklist de seguridad

---

## 🆘 ¿Necesitas Ayuda?

- **Documentación Completa**: Ver `DEPLOYMENT_GUIDE.md`
- **Estado del Proyecto**: Ver `DEVELOPMENT_STATUS.md`
- **Configuración Cloudflare**: Ver `CLOUDFLARE_SETUP.md`
- **Resumen Técnico**: Ver `IMPLEMENTATION_SUMMARY.md`

---

## 🎉 ¡Listo!

Ya tienes AgentHub corriendo localmente. El proyecto incluye:

✅ Autenticación segura con Supabase
✅ Dashboard funcional con estadísticas
✅ Sistema de notificaciones
✅ Wizard de creación de agentes
✅ Integración con Stripe (frontend)
✅ Rate limiting y seguridad robusta

**Tiempo total**: ~15 minutos

**¡Disfruta desarrollando!** 🚀
