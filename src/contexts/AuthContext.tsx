import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, Profile } from '../lib/supabase';
import { logError, logInfo, traceAsyncOperation } from '../observability';
import { createAuditLog } from '../lib/security';

export interface MfaChallengeState {
  factorId: string;
  challengeId: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null; mfaChallenge?: MfaChallengeState }>;
  verifyMfaChallenge: (challenge: MfaChallengeState, code: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => traceAsyncOperation('auth.fetchProfile', async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      logError('No se pudo obtener el perfil del usuario', { userId, error });
      return null;
    }

    if (data) {
      setProfile(data);
      logInfo('Perfil cargado correctamente', { userId, plan: data.plan_type });
    }
    return data;
  }, { op: 'db', tags: { feature: 'auth' }, data: { userId } });

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => traceAsyncOperation('auth.signUp', async () => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      logError('Error durante el registro', { email, error });
    }

    if (data?.user && !error) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        email,
        full_name: fullName,
        plan_type: 'free',
        credits: 0,
      });
      await createAuditLog('user_registered', data.user.id, 'user', data.user.id, { email });
      logInfo('Perfil inicial creado tras registro', { email });
    }

    return { error };
  }, { op: 'auth', tags: { feature: 'signup' }, data: { email } });

  const startMfaChallenge = async (email: string): Promise<{ challenge?: MfaChallengeState; error?: AuthError | null }> => {
    const factorResponse = await supabase.auth.mfa.listFactors();
    if (factorResponse.error) {
      return { error: factorResponse.error };
    }

    const totpFactor = factorResponse.data?.totp?.find(factor => factor.status === 'verified');
    if (!totpFactor) {
      return { error: new AuthError('No hay un factor TOTP activo', 400) };
    }

    const challengeResponse = await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
    if (challengeResponse.error) {
      return { error: challengeResponse.error };
    }

    return {
      challenge: {
        factorId: totpFactor.id,
        challengeId: challengeResponse.data.id,
        email,
      },
      error: null,
    };
  };

  const signIn = async (email: string, password: string) => traceAsyncOperation('auth.signIn', async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error?.message?.toLowerCase().includes('mfa')) {
      logInfo('Inicio de sesión requiere 2FA', { email });
      const { challenge, error: mfaError } = await startMfaChallenge(email);
      return { error: mfaError ?? null, mfaChallenge: challenge };
    }

    if (error) {
      logError('Fallo al iniciar sesión', { email, error });
      return { error };
    }

    if (data?.session?.user) {
      await createAuditLog('login_success', data.session.user.id, 'auth', data.session.user.id, { method: 'password' });
      logInfo('Inicio de sesión correcto', { email });
    }

    return { error: null };
  }, { op: 'auth', tags: { feature: 'signin' }, data: { email } });

  const verifyMfaChallenge = async (challenge: MfaChallengeState, code: string) => traceAsyncOperation('auth.verifyMfa', async () => {
    const verification = await supabase.auth.mfa.verify({
      factorId: challenge.factorId,
      challengeId: challenge.challengeId,
      code,
    });

    if (verification.error) {
      logError('Fallo al verificar 2FA', { email: challenge.email, error: verification.error });
      return { error: verification.error };
    }

    const verifiedSession = verification.data.session;
    setSession(verifiedSession);
    setUser(verifiedSession?.user ?? null);

    if (verifiedSession?.user) {
      await fetchProfile(verifiedSession.user.id);
      await createAuditLog('login_mfa_success', verifiedSession.user.id, 'auth', verifiedSession.user.id, {
        method: 'totp',
      });
    }

    logInfo('2FA verificada correctamente', { email: challenge.email });
    return { error: null };
  }, { op: 'auth', tags: { feature: 'mfa' }, data: { email: challenge.email } });

  const signOut = async () => traceAsyncOperation('auth.signOut', async () => {
    await supabase.auth.signOut();
    setProfile(null);
    if (user?.id) {
      await createAuditLog('logout', user.id, 'auth', user.id);
    }
    logInfo('Sesión cerrada correctamente');
  }, { op: 'auth', tags: { feature: 'signout' } });

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      session,
      loading,
      signUp,
      signIn,
      verifyMfaChallenge,
      signOut,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
