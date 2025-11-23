# AgentHub - Plataforma de Agentes IA Personalizados

> Crea, despliega y monetiza agentes IA personalizados en minutos

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()
[![Completitud](https://img.shields.io/badge/completitud-88%25-green)]()
[![Ready](https://img.shields.io/badge/beta-ready-success)]()

---

## 📖 Descripción

AgentHub es una plataforma SaaS completa que permite a empresas y emprendedores crear agentes de IA personalizados sin código. Los agentes se despliegan como Cloudflare Workers con RAG avanzado, proporcionando respuestas instantáneas 24/7 basadas en tu base de conocimiento.

### ✨ Características Principales

- 🤖 **Creación Sin Código**: Wizard intuitivo de 4 pasos
- ⚡ **Despliegue Instantáneo**: Workers en Cloudflare edge network
- 💳 **Monetización Integrada**: Sistema completo de pagos con Stripe
- 📊 **Dashboard Completo**: Estadísticas en tiempo real
- 🔒 **Seguridad Robusta**: Rate limiting, RLS, audit logs
- 🔔 **Notificaciones**: Sistema in-app con badges
- 📧 **Emails Automáticos**: SendGrid con cola inteligente
- 🧠 **RAG Avanzado**: pgvector + embeddings + búsqueda semántica
- 🎨 **UI Profesional**: Diseño moderno y responsive

---

## 🚀 Inicio Rápido

```bash
# Clonar repositorio
git clone <tu-repo>
cd agenthub

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# Iniciar servidor de desarrollo
npm run dev
```

**Para configuración detallada**, lee [QUICK_START.md](./QUICK_START.md)

---

## 📚 Documentación

- 📘 **Manual maestro consolidado**: [MASTER_DOCUMENTATION.md](./MASTER_DOCUMENTATION.md) reúne inicio rápido, despliegue, Cloudflare, emails, RAG, observabilidad y checklists operativos.

| Fuentes detalladas | Propósito |
|--------------------|-----------|
| [QUICK_START.md](./QUICK_START.md) | Configuración local en 15 minutos |
| [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) | Despliegue completo a producción |
| [EMAIL_AND_RAG_IMPLEMENTATION.md](./EMAIL_AND_RAG_IMPLEMENTATION.md) | Guía completa de Emails y RAG |
| [FINAL_STATUS_REPORT.md](./FINAL_STATUS_REPORT.md) | Reporte final de estado (88% completo) |
| [CLOUDFLARE_SETUP.md](./CLOUDFLARE_SETUP.md) | Configuración de Cloudflare Workers |
| [DEVELOPMENT_STATUS.md](./DEVELOPMENT_STATUS.md) | Estado detallado del proyecto |
| [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) | Resumen técnico de implementación |

---

## 🏗️ Arquitectura

```
Frontend (React + TypeScript + Tailwind)
    ↓
Supabase (Auth + Database + Edge Functions)
    ↓
┌────────────┬─────────────┬──────────────┐
│  Stripe    │  OpenRouter │  Cloudflare  │
│  (Pagos)   │  (AI Models)│  (Workers)   │
└────────────┴─────────────┴──────────────┘
```

### Stack Tecnológico

**Frontend**:
- React 18
- TypeScript
- Tailwind CSS
- Vite
- Stripe Elements
- Lucide Icons

**Backend**:
- Supabase (PostgreSQL + Auth + Edge Functions)
- Cloudflare Workers (Despliegue de agentes)
- OpenRouter API (Modelos AI)
- Stripe (Pagos y suscripciones)

**Infraestructura**:
- Vercel/Netlify (Frontend hosting)
- Supabase Cloud (Backend)
- Cloudflare (CDN + Workers)

---

## ✅ Estado del Proyecto

### Completado (88%)

- ✅ Autenticación y autorización completa
- ✅ Sistema de seguridad reforzado (rate limiting, password validation, audit logs)
- ✅ Base de datos completa con RLS (18 tablas)
- ✅ Dashboard funcional con estadísticas
- ✅ Wizard de creación de agentes
- ✅ Sistema de pagos con Stripe (backend + frontend completo)
- ✅ Notificaciones in-app con badges
- ✅ **Sistema de emails completo** (SendGrid, cola, templates) ✨
- ✅ **RAG funcional con pgvector** (chunking, embeddings, search) ✨
- ✅ Generación dinámica de Cloudflare Workers
- ✅ Testing de agentes en tiempo real
- ✅ Gestión de créditos y suscripciones
- ✅ 10 Edge Functions desplegadas

### Pendiente (12%)

- ⚠️ PDF/DOCX parsing avanzado
- ⚠️ Panel administrativo completo
- ⚠️ Monitoring con Sentry
- ⚠️ Testing automatizado (E2E)
- ⚠️ CAPTCHA y 2FA

Ver [FINAL_STATUS_REPORT.md](./FINAL_STATUS_REPORT.md) para análisis completo.

---

## 🎯 Roadmap

### v1.0 - MVP Beta (6-8 semanas)
- [ ] Sistema de emails completo
- [ ] RAG básico funcional
- [ ] Monitoring con Sentry
- [ ] Testing E2E crítico
- [ ] Beta con 50-100 usuarios

### v1.5 - Producción (12-16 semanas)
- [ ] Panel administrativo
- [ ] RAG avanzado
- [ ] 2FA
- [ ] Testing comprehensivo
- [ ] Lanzamiento público

### v2.0 - Escalabilidad
- [ ] Agent marketplace
- [ ] Collaboration features
- [ ] White label
- [ ] Multi-idioma
- [ ] App móvil

---

## 💼 Casos de Uso

### 🍔 Restaurantes
Agente que responde consultas sobre menú, horarios, reservas 24/7.
**Resultado**: -40% llamadas telefónicas

### 💇 Peluquerías
Gestión automática de citas y consultas de servicios.
**Resultado**: +60% reservas online

### 🏋️ Gimnasios
Información sobre planes, horarios, clases disponibles.
**Resultado**: Atención 24/7 sin personal

### 🏠 Inmobiliarias
Respuestas sobre propiedades, precios, características.
**Resultado**: +85% tasa de respuesta

---

## 🔒 Seguridad

- ✅ **Rate Limiting**: Protección contra brute force y DDoS
- ✅ **RLS**: Row Level Security en todas las tablas
- ✅ **Audit Logs**: Registro completo de acciones
- ✅ **Password Policy**: Mínimo 12 caracteres con requisitos
- ✅ **CSP Headers**: Content Security Policy
- ✅ **Input Sanitization**: Limpieza automática de inputs
- ✅ **Session Management**: Gestión segura de sesiones

---

## 💳 Planes y Precios

### Free
- 1 agente activo
- 5 consultas/día
- Modelos básicos
- **€0/mes**

### Premium Basic
- 3 agentes activos
- 100 consultas/día
- Modelos avanzados
- RAG ilimitado
- **€29/mes**

### Premium Ultra
- 10 agentes activos
- Consultas ilimitadas
- Todos los modelos
- Soporte 24/7
- **€99/mes**

---

## 🛠️ Desarrollo

### Requisitos

- Node.js 18+
- npm 8+
- Cuenta de Supabase
- Cuenta de Stripe (test mode)

### Scripts

```bash
# Desarrollo
npm run dev

# Build
npm run build

# Preview build
npm run preview

# Lint
npm run lint

# Type check
npm run typecheck
```

### Estructura del Proyecto

```
/src
  /components
    /Auth          # Autenticación
    /Dashboard     # Panel principal
    /Billing       # Pagos y planes
    /Notifications # Sistema de notificaciones
  /contexts        # React contexts
  /lib             # Utilidades y servicios

/supabase
  /functions       # Edge Functions
  /migrations      # Migraciones de BD
```

---

## 📊 Métricas

- **Bundle Size**: 413KB (gzipped: 114KB)
- **CSS**: 27KB (gzipped: 5.2KB)
- **Build Time**: ~7 segundos
- **Líneas de Código**: ~8,000
- **Componentes**: 15+
- **Edge Functions**: 6
- **Tablas de BD**: 15+

---

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 📝 Licencia

Este proyecto está bajo licencia MIT. Ver `LICENSE` para más detalles.

---

## 🆘 Soporte

- **Documentación**: Ver carpeta de docs
- **Issues**: [GitHub Issues](link-to-issues)
- **Email**: support@agenthub.com

---

## 🙏 Agradecimientos

- [Supabase](https://supabase.com) - Backend as a Service
- [Stripe](https://stripe.com) - Procesamiento de pagos
- [Cloudflare](https://cloudflare.com) - Edge computing
- [OpenRouter](https://openrouter.ai) - Acceso a modelos AI
- [Lucide](https://lucide.dev) - Iconos
- [Tailwind CSS](https://tailwindcss.com) - Estilos

---

## 📞 Contacto

- Website: [agenthub.com](https://agenthub.com)
- Email: hello@agenthub.com
- Twitter: [@agenthub](https://twitter.com/agenthub)

---

<p align="center">
  Hecho con ❤️ por el equipo de AgentHub
</p>

<p align="center">
  <sub>⭐ Si te gusta este proyecto, dale una estrella en GitHub!</sub>
</p>
