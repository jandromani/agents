import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, Profile } from '../lib/supabase';
import { captureException, logError, logInfo, traceAsyncOperation } from '../observability';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => traceAsyncOperation('profiles.fetch', async () => {
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
      logInfo('Perfil inicial creado tras registro', { email });
    }

    return { error };
  }, { op: 'auth', tags: { feature: 'signup' }, data: { email } });

  const signIn = async (email: string, password: string) => traceAsyncOperation('auth.signIn', async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      logError('Fallo al iniciar sesión', { email, error });
    } else {
      logInfo('Inicio de sesión correcto', { email });
    }

    return { error };
  }, { op: 'auth', tags: { feature: 'signin' }, data: { email } });

  const signOut = async () => traceAsyncOperation('auth.signOut', async () => {
    await supabase.auth.signOut();
    setProfile(null);
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
