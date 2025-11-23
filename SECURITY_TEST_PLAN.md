# Plan y ejecución de pruebas de penetración externas

## Objetivos
- Validar la robustez de autenticación multifactor (2FA) y flujos protegidos con CAPTCHA.
- Revisar la trazabilidad de acciones de usuario y administrador mediante `audit_logs` y `security_logs`.
- Comprobar exposición de datos y controles de acceso en panel público y administrador.

## Alcance
- Entorno: staging aislado con datos de prueba y reglas equivalentes a producción.
- Superficie: frontend (Vite React), funciones Edge (`create-payment-intent`, `create-checkout`, `manage-2fa`, `verify-captcha`), API de Supabase (auth, storage, RLS) y webhooks de Stripe.
- Cuentas objetivo: usuarios con y sin 2FA, roles admin/soporte/finanzas.

## Proveedores y calendario
- Proveedor externo recomendado: CREST/OSCP con experiencia en SaaS (p. ej. Cure53, BishopFox o Tarlogic).
- Ventana sugerida: 10 días hábiles después de cada release mayor o cambios de autenticación/pagos.
- Coordinación: firma de NDA, intercambio de claves públicas para listas de allowlist y contacto de emergencia on-call.

## Metodología
- OWASP ASVS 4.0 y OWASP API Security v2023 como baseline.
- Técnicas: fuzzing de endpoints Edge, bypass de CAPTCHA/2FA, abuso de sesiones (token replay), CSRF en pagos, validación de RLS con cuentas cruzadas, revisión de CSP y cabeceras de seguridad.
- Herramientas orientativas: Burp Suite Pro, ZAP, nmap, nuclei, jwt_tool, zap-cli para automatizar regresiones.

## Ejecución mínima requerida
1. Preparar usuarios y factores TOTP en staging; provisionar API keys limitadas.
2. Entregar guía de pruebas y credenciales efímeras al proveedor (vigencia <48h).
3. Ejecutar reconocimiento y enumeración de hosts/API.
4. Lanzar pruebas activas con límite de solicitudes para no afectar cuotas de terceros.
5. Verificar rutas críticas:
   - Inicio de sesión con 2FA (con y sin código correcto, intentos bloqueados).
   - Registro y restablecimiento protegidos por Turnstile.
   - Creación y confirmación de pagos/checkout con validación de CAPTCHA.
   - Acceso al panel admin y operaciones de auditoría.
6. Registrar hallazgos con pruebas de concepto, severidad CVSS y rutas reproducibles.

## Salida esperada
- Informe ejecutivo con riesgos priorizados, matriz de severidad e impacto.
- Evidencia técnica por hallazgo y plan de remediación con SLAs (p. ej. críticas <72h).
- Validación posterior (retest) incluida en el contrato.

## Estado
- Plan listo; a la espera de selección de proveedor y ventanas de prueba.
