export async function verifyTurnstileToken(token: string | null, action: string) {
  if (!token) {
    throw new Error('Token de verificación inválido.');
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-captcha`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, action }),
    }
  );

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'No se pudo validar el desafío de seguridad');
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Desafío de seguridad fallido');
  }
}
