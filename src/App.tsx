import { useEffect, useMemo, useState, lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useRouter } from './contexts/RouterContext';
import { RoleType } from './lib/supabase';

const Dashboard = lazy(() => import('./components/Dashboard/Dashboard').then(module => ({ default: module.Dashboard })));
const AuthModal = lazy(() => import('./components/Auth/AuthModal').then(module => ({ default: module.AuthModal })));
const LandingPage = lazy(() => import('./components/Landing').then(module => ({ default: module.LandingPage })));
const AdminRouter = lazy(() => import('./components/Admin/AdminRouter').then(module => ({ default: module.AdminRouter })));

const ADMIN_ROLES: RoleType[] = ['superadmin', 'soporte', 'finanzas', 'moderador'];

function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-600">{message}</p>
      </div>
    </div>
  );
}

function HomeExperience() {
  const { user, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  if (loading) {
    return <LoadingScreen message="Cargando..." />;
  }

  if (user) {
    return (
      <Suspense fallback={<LoadingScreen message="Preparando tu panel..." />}>
        <Dashboard />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<LoadingScreen message="Cargando experiencia..." />}>
      <LandingPage onGetStarted={() => setShowAuthModal(true)} />
      <Suspense fallback={<LoadingScreen message="Cargando autenticación..." />}>
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          defaultMode="signup"
        />
      </Suspense>
    </Suspense>
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
    return <LoadingScreen message="Verificando acceso..." />;
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

  return (
    <Suspense fallback={<LoadingScreen message="Cargando panel admin..." />}>
      <AdminRouter />
    </Suspense>
  );
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
