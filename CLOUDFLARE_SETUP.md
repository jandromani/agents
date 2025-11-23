# Configuración de Cloudflare Workers

Este documento explica cómo configurar las credenciales de Cloudflare para el despliegue automático de agentes.

## Variables de Entorno Requeridas

Para habilitar el despliegue real de Cloudflare Workers, necesitas configurar las siguientes variables de entorno en Supabase:

### 1. CLOUDFLARE_ACCOUNT_ID

Tu ID de cuenta de Cloudflare.

**Cómo obtenerlo:**
1. Inicia sesión en [Cloudflare Dashboard](https://dash.cloudflare.com)
2. En el panel lateral, ve a "Workers & Pages"
3. El Account ID aparece en la URL: `https://dash.cloudflare.com/{ACCOUNT_ID}/workers`
4. También está visible en el panel de Workers

### 2. CLOUDFLARE_API_TOKEN

Un token de API con permisos para gestionar Workers.

**Cómo crearlo:**
1. Ve a [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Click en "Create Token"
3. Selecciona la plantilla "Edit Cloudflare Workers" o crea uno custom con estos permisos:
   - **Account** → Workers Scripts → Edit
   - **Account** → Workers KV Storage → Edit (opcional, para futuras mejoras)
4. Copia el token generado (solo se muestra una vez)

### 3. OPENROUTER_API_KEY

Tu clave API de OpenRouter para acceder a los modelos de IA.

**Cómo obtenerla:**
1. Regístrate en [OpenRouter](https://openrouter.ai/)
2. Ve a tu [API Keys](https://openrouter.ai/keys)
3. Crea una nueva API key
4. Copia la clave

## Configuración en Supabase

### Método 1: Dashboard de Supabase (Recomendado)

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Navega a **Project Settings** → **Edge Functions** → **Secrets**
3. Añade las siguientes secrets:
   ```
   CLOUDFLARE_ACCOUNT_ID=tu_account_id_aqui
   CLOUDFLARE_API_TOKEN=tu_api_token_aqui
   OPENROUTER_API_KEY=tu_openrouter_key_aqui
   ```

### Método 2: Supabase CLI (Alternativo)

Si prefieres usar la CLI:

```bash
# Configurar CLOUDFLARE_ACCOUNT_ID
supabase secrets set CLOUDFLARE_ACCOUNT_ID=tu_account_id_aqui

# Configurar CLOUDFLARE_API_TOKEN
supabase secrets set CLOUDFLARE_API_TOKEN=tu_api_token_aqui

# Configurar OPENROUTER_API_KEY
supabase secrets set OPENROUTER_API_KEY=tu_openrouter_key_aqui
```

## Modo de Simulación

**IMPORTANTE:** Si no configuras las credenciales de Cloudflare, el sistema funcionará en **modo simulación**:

- Los agentes se crearán correctamente en la base de datos
- Se generará un URL simulado para cada agente
- NO se desplegará un worker real en Cloudflare
- Las pruebas del agente no funcionarán

Este modo es útil para:
- Desarrollo y pruebas del frontend
- Demostración de la interfaz
- Testing de la base de datos y autenticación

## Verificación de Configuración

Para verificar que todo está configurado correctamente:

1. Crea un agente en la plataforma
2. Haz click en "Desplegar Agente"
3. Si ves un mensaje de éxito con un URL válido, la configuración es correcta
4. Prueba el agente con el botón "Probar Agente"

## Estructura del Worker Generado

Cada agente genera un Cloudflare Worker con:

- **ID único**: `agent-{primeros-16-chars-del-uuid}`
- **URL pública**: `https://agent-{id}.{account-id}.workers.dev`
- **Configuración embebida**:
  - Modelo de IA seleccionado
  - Base de conocimiento (contexto, FAQ, documentos)
  - Integración con OpenRouter
  - Sistema de tracking de uso
  - Límites según plan del usuario

## Seguridad

- ✅ Los tokens y credenciales están protegidos como secrets
- ✅ Solo usuarios autenticados pueden desplegar workers
- ✅ Cada worker solo puede ser gestionado por su creador
- ✅ Las API keys de OpenRouter se usan desde el worker (no expuestas al cliente)
- ✅ Sistema de tracking para prevenir abusos

## Costos

### Cloudflare Workers
- **Plan Free**: 100,000 requests/día, 10ms CPU por request
- **Plan Paid** ($5/mes): 10 millones requests/mes, hasta 50ms CPU

### OpenRouter
- Varía según el modelo usado
- Modelo básico (gpt-3.5-turbo): ~$0.001 por 1K tokens
- Modelo avanzado (gpt-4): ~$0.03 por 1K tokens

## Troubleshooting

### Error: "Cloudflare credentials not configured"
- **Solución**: Configura las variables de entorno en Supabase

### Error: "Deployment failed"
- **Causa común**: Token de API sin permisos suficientes
- **Solución**: Verifica que el token tiene permisos de "Edit Workers Scripts"

### Error: "AI service unavailable"
- **Causa**: API key de OpenRouter inválida o sin créditos
- **Solución**: Verifica tu key en OpenRouter y recarga créditos

### El worker se despliega pero no responde
- **Causa**: La API key de OpenRouter no está configurada como secret
- **Solución**: Añade OPENROUTER_API_KEY a los secrets de Supabase

## Recursos Adicionales

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare Workers API](https://developers.cloudflare.com/api/operations/worker-script-upload-worker-module)
- [OpenRouter Documentation](https://openrouter.ai/docs)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

## Soporte

Si encuentras problemas con la configuración, verifica:
1. ✅ Las credenciales están correctamente configuradas en Supabase
2. ✅ El token de Cloudflare tiene los permisos necesarios
3. ✅ La cuenta de OpenRouter tiene créditos disponibles
4. ✅ Los logs de la Edge Function en Supabase Dashboard para más detalles
