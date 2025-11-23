# Materiales de Marketing, Onboarding y Soporte (Beta y Producción)

## 1. Manuales de Usuario

### 1.1 Estructura del Manual (PDF/HTML)
- **Introducción**: Qué es AgentHub, casos de uso y requisitos previos (cuenta Supabase/Stripe opcional según rol).
- **Acceso y roles**: Inicio de sesión, recuperación de contraseña, permisos (Owner, Editor, Viewer) y configuración de MFA cuando esté disponible.
- **Crear un agente (Wizard 4 pasos)**:
  1) **Objetivo y tono**: Selección de propósito, voz y dominios permitidos.
  2) **Conexión de fuentes**: CSV, URLs, PDFs/DOCX (notas de parsing limitado), carga masiva y estado de indexación.
  3) **Entrenamiento RAG**: Chunking, embeddings, búsqueda semántica y métricas de cobertura.
  4) **Revisar y publicar**: Vista previa de respuestas, checklist de seguridad, deploy a Cloudflare Worker.
- **Dashboard**: KPIs en tiempo real (sesiones, CSAT, coste por sesión), filtros por agente y exportables.
- **Pagos y monetización**: Planes, precios, Stripe Elements, cupones, gestión de facturas y reembolsos.
- **Notificaciones y alertas**: Badges in-app, emails automáticos, límites de uso y auditoría de eventos.
- **Soporte y resolución de incidencias**: Guía rápida de errores comunes (401/429, fallos de embeddings, límites de tasa) y rutas de escalado.

### 1.2 Manuales por segmento
- **Beta privada (founders/PMs)**: Enfoque en iteración rápida, cómo enviar feedback, cómo habilitar logging detallado.
- **Producción (equipos de operaciones y éxito de cliente)**: Procedimientos estándar, SLAs, compliance y checklist de lanzamiento.

## 2. Tutoriales de Onboarding

### 2.1 Formatos
- **Tutorial interactivo in-app** (pasos guiados con tooltips y confeti de éxito).
- **Video corto (2-3 min)**: “Crea y lanza tu primer agente”.
- **Mini-fichas** (1 página) para soporte y ventas.

### 2.2 Flujo recomendado
1. **Crear cuenta y perfil**: Completar datos de empresa, dominios permitidos y logo.
2. **Crear primer agente**: Wizard con presets por industria (restaurantes, e-commerce, SaaS B2B).
3. **Cargar conocimiento**: Demo con CSV + URL; advertir parsing limitado en PDF/DOCX durante beta.
4. **Probar y ajustar**: Modo test con trazas de RAG visibles y métricas de relevancia.
5. **Publicar**: Deploy automático y compartir enlace público/iframe.
6. **Cobrar**: Activar Stripe y probar pago de prueba.
7. **Medir**: Revisar dashboard y exportar informe semanal.

## 3. FAQs Ampliadas

### 3.1 Beta privada
- **¿Qué datos puedo subir?** CSV/URL sin límite, PDF/DOCX con parsing básico; evita datos sensibles.
- **¿Cómo envío feedback rápido?** Botón “Enviar feedback” en el header → modal con captura de pantalla y logs.
- **¿Puedo desactivar logs detallados?** Sí, en Ajustes > Privacidad.
- **¿Cómo reporto un mal output del agente?** Usa el botón “Reportar respuesta” junto a cada mensaje; se guarda el thread y la fuente usada.
- **¿Qué pasa si supero el rate limit?** Se muestra error 429 y badge de alerta; abre ticket para elevar límites.

### 3.2 Producción
- **¿Cómo garantizo respuestas seguras?** Activa filtros de contenido, dominios permitidos y lista de stop-phrases.
- **¿Puedo usar mi propio modelo?** Sí, configurando la API Key de OpenRouter y seleccionando el modelo en Ajustes > Modelos.
- **¿Cómo integro con mi web?** Via iframe, script embebido o API REST del Worker.
- **¿Cómo gestiono reembolsos?** Desde Billing > Pagos con Stripe; guía detallada en el manual.
- **¿Dónde veo trazas y auditoría?** Dashboard > Logs; exportable a CSV.

## 4. Recursos de Soporte
- **Centro de ayuda**: Base de conocimiento con artículos cortos (≤400 palabras) y GIFs.
- **Playbooks**: Guías de resolución para 401/403, 429, fallos de embeddings, webhook fallidos y pagos fallidos.
- **Plantillas de respuesta**: Macros para soporte (instalación, billing, performance, seguridad).
- **Status Page**: Banner automático en la app + link a página de estado.
- **SLAs**:
  - Beta: 8x5, tiempo de primera respuesta <2h.
  - Producción: 24/7 crítico, <30 min P1, <4h P2.

## 5. Canales de Feedback y Soporte Activo (Beta)
- **Botón in-app “Ayuda y feedback”**: Modal con categorías (bug, UX, rendimiento, feature) y adjuntos; envía a triage en Slack #beta-feedback.
- **Widget de chat**: Atención en horario laboral; respuestas automáticas con rutas a agentes humanos.
- **Encuestas rápidas**: NPS semanal + CSAT post-sesión; exporte automático a Sheets.
- **Rituales**: Sync quincenal con usuarios clave; reporte de insights y backlog priorizado.
- **Métricas de calidad**: Tasa de éxito de intentos, CSAT, ratio de alucinación (flags), tiempo medio de primera respuesta.

## 6. Operación Continua
- **Cadencia de releases**: Beta semanal, Producción quincenal con changelog visible en la app.
- **Runbooks**: Checklist de pre-release (tests críticos, emails, banners) y post-release (monitoring, rollback plan).
- **Escalado**: Circuito de guardias (ingeniería/producto/soporte) y canal de incidentes con plantillas.
- **Gobernanza de contenido**: Revisión mensual de manuales, FAQs y tutoriales; dueño asignado por sección.

## 7. Entregables
- Manual PDF/HTML (2 versiones: Beta y Producción).
- 2 videos cortos + 1 tutorial interactivo in-app.
- 15 FAQs validadas con soporte.
- Base de conocimiento + macros + playbooks.
- Dashboard interno de feedback (NPS/CSAT + tags) conectado al backlog.
