# Aplicación inicial del Plan Integral

Este repositorio incorpora artefactos iniciales que materializan el plan de producción descrito en `FULL_DELIVERY_PLAN.md`.

## RAG y Parsing
- Nuevo módulo `src/lib/rag/parsers.ts` con `DocumentParser`, normalización, tokenización y chunking parametrizable para PDFs/DOCX a través de adaptadores.
- Soporta metadatos, deduplicación por sección y estructura jerárquica básica para chunks RAG.

## Notificaciones Multi-Canal
- Servicio `src/lib/notifications/service.ts` con cola en memoria, idempotencia por `messageKey`, registro de eventos y métricas agregadas por canal.
- Punto de partida para orquestar correo, push, SMS e in-app.

## Observabilidad
- Inicialización segura y opcional de Sentry en `src/lib/observability/index.ts` con recolección de breadcrumbs y captura de excepciones.
- Tipos locales en `src/types/sentry.d.ts` para mantener el tipado hasta integrar el SDK oficial en CI/CD.

## Panel Administrativo
- Componente `src/components/Admin/AdminDashboard.tsx` que unifica visibilidad de usuarios, agentes, seguridad y estado de la cola de notificaciones, alineado con el panel operativo descrito en el plan.

## Próximos pasos sugeridos
- Conectar adaptadores reales (`pdf-parse`, `mammoth`) y workers de parsing.
- Sustituir la cola en memoria por BullMQ/Redis y enlazar con plantillas SendGrid/SES.
- Añadir rutas protegidas y RBAC para el panel admin.
- Conectar Sentry/OTel en frontend y edge functions con DSN y exporters productivos.
