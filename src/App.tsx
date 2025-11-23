import { useEffect, useMemo, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Dashboard } from './components/Dashboard/Dashboard';
import { AuthModal } from './components/Auth/AuthModal';
import { LandingPage } from './components/Landing';
import { AdminRouter } from './components/Admin/AdminRouter';
import { useRouter } from './contexts/RouterContext';
import { RoleType } from './lib/supabase';

const ADMIN_ROLES: RoleType[] = ['superadmin', 'soporte', 'finanzas', 'moderador'];

function HomeExperience() {
  const { user, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <Dashboard />;
  }

  return (
    <>
      <LandingPage onGetStarted={() => setShowAuthModal(true)} />
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultMode="signup"
      />
    </>
  );
}

function AdminGate() {
  const { user, profile, loading } = useAuth();
  const { path, navigate } = useRouter();

  useEffect(() => {
    if (path === '/admin') {
      navigate('/admin/overview');
    }
  }, [navigate, path]);

  const isAuthorized = useMemo(() => {
    if (!profile?.role) return false;
    return ADMIN_ROLES.includes(profile.role) || profile.role === 'admin';
  }, [profile?.role]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <HomeExperience />;
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 max-w-xl text-center">
          <p className="text-sm uppercase tracking-wide text-amber-600 font-semibold">Acceso restringido</p>
          <h2 className="text-2xl font-bold text-slate-900 mt-2">No tienes permisos para acceder al panel admin</h2>
          <p className="text-slate-600 mt-2">Contacta con un superadmin para solicitar acceso o vuelve al panel principal.</p>
          <button
            onClick={() => navigate('/')}
            className="mt-6 px-5 py-2 rounded-lg bg-cyan-600 text-white font-semibold hover:bg-cyan-500 transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return <AdminRouter />;
}

function AppContent() {
  const { path } = useRouter();
  const isAdminRoute = path.startsWith('/admin');

  if (isAdminRoute) {
    return <AdminGate />;
  }

  return <HomeExperience />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
