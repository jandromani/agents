import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { authenticator } from 'npm:otplib@12.0.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const encoder = new TextEncoder();
const encryptionSecret = Deno.env.get('TOTP_ENCRYPTION_KEY');

if (!encryptionSecret) {
  throw new Error('TOTP_ENCRYPTION_KEY is not configured');
}

type Action = 'status' | 'initiate' | 'activate' | 'disable' | 'verify-backup';

interface RequestBody {
  action: Action;
  secret?: string;
  token?: string;
  backupCode?: string;
}

function validateAction(body: RequestBody) {
  if (!body || typeof body.action !== 'string') {
    throw new Error('Invalid request payload');
  }

  const validActions: Action[] = ['status', 'initiate', 'activate', 'disable', 'verify-backup'];
  if (!validActions.includes(body.action)) {
    throw new Error('Unsupported action');
  }

  if (body.action === 'activate') {
    if (!body.secret || !body.token) {
      throw new Error('Missing activation parameters');
    }
    if (body.secret.length < 16 || body.token.length < 6) {
      throw new Error('Invalid activation payload');
    }
  }

  if (body.action === 'verify-backup') {
    if (!body.backupCode || body.backupCode.trim().length < 8) {
      throw new Error('Missing or invalid backup code');
    }
  }
}

async function deriveKey(userId: string) {
  const material = encoder.encode(`${encryptionSecret}:${userId}`);
  const digest = await crypto.subtle.digest('SHA-256', material);
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

async function encryptForUser(userId: string, value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(userId);
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(value))
  );

  const ivString = btoa(String.fromCharCode(...iv));
  const cipherText = btoa(String.fromCharCode(...encrypted));

  return `${ivString}.${cipherText}`;
}

async function decryptForUser(userId: string, encrypted: string): Promise<string> {
  const [ivString, cipherText] = encrypted.split('.');
  if (!ivString || !cipherText) throw new Error('Invalid encrypted format');

  const iv = Uint8Array.from(atob(ivString), c => c.charCodeAt(0));
  const cipher = Uint8Array.from(atob(cipherText), c => c.charCodeAt(0));
  const key = await deriveKey(userId);

  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
  return new TextDecoder().decode(decrypted);
}

function generateBackupCodes() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 8 }, () =>
    Array.from({ length: 10 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const body: RequestBody = await req.json();
    validateAction(body);

    if (body.action === 'status') {
      const { data } = await supabase
        .from('user_security_settings')
        .select('totp_enabled, updated_at')
        .eq('user_id', user.id)
        .maybeSingle();

      return new Response(
        JSON.stringify({ success: true, totpEnabled: data?.totp_enabled || false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (body.action === 'initiate') {
      const secret = authenticator.generateSecret();
      const otpauthUrl = authenticator.keyuri(user.email || user.id, 'AgentHub', secret);

      return new Response(
        JSON.stringify({ success: true, secret, otpauthUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (body.action === 'activate') {
      const { secret, token } = body;

      const isValid = authenticator.verify({ token: token!, secret: secret! });
      if (!isValid) {
        throw new Error('Código TOTP inválido');
      }

      const encryptedSecret = await encryptForUser(user.id, secret!);
      const backupCodes = generateBackupCodes();
      const encryptedBackupCodes = await encryptForUser(user.id, JSON.stringify(backupCodes));

      await supabase.from('user_security_settings').upsert({
        user_id: user.id,
        totp_enabled: true,
        totp_secret_encrypted: encryptedSecret,
        backup_codes_encrypted: encryptedBackupCodes,
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });

      return new Response(
        JSON.stringify({ success: true, backupCodes }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (body.action === 'verify-backup') {
      const { backupCode } = body;
      const normalizedCode = backupCode!.trim().toUpperCase();

      const { data: settings } = await supabase
        .from('user_security_settings')
        .select('totp_enabled, backup_codes_encrypted')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!settings?.totp_enabled || !settings?.backup_codes_encrypted) {
        throw new Error('2FA no está activa para esta cuenta');
      }

      const decryptedCodes = await decryptForUser(user.id, settings.backup_codes_encrypted);
      const backupCodes: string[] = JSON.parse(decryptedCodes);

      const codeIndex = backupCodes.indexOf(normalizedCode);
      if (codeIndex === -1) {
        throw new Error('Código de respaldo inválido');
      }

      const updatedCodes = backupCodes.filter((_, i) => i !== codeIndex);
      const encryptedUpdatedCodes = await encryptForUser(user.id, JSON.stringify(updatedCodes));

      await supabase
        .from('user_security_settings')
        .update({
          backup_codes_encrypted: encryptedUpdatedCodes,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      return new Response(
        JSON.stringify({
          success: true,
          remainingCodes: updatedCodes.length,
          message: updatedCodes.length <= 2
            ? 'Quedan pocos códigos de respaldo. Genera nuevos desde Configuración de Seguridad.'
            : undefined,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (body.action === 'disable') {
      await supabase.from('user_security_settings').upsert({
        user_id: user.id,
        totp_enabled: false,
        totp_secret_encrypted: null,
        backup_codes_encrypted: null,
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });

      return new Response(
        JSON.stringify({ success: true, totpEnabled: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Unsupported action');
  } catch (error) {
    console.error('2FA error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
