import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2, Bus } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { ModuleRoute } from '../constants/permissions';

interface ProtectedRouteProps {
  children: React.ReactElement;
  /** If provided, the authenticated user's role must have access to this module. */
  requiredModule?: ModuleRoute;
}

function FullScreenLoader() {
  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
        <Bus className="w-6 h-6 text-emerald-400" />
      </div>
      <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Verifying session…
      </div>
    </div>
  );
}

/**
 * Wraps a route element and enforces both authentication and (optionally)
 * module-level role access. Unauthenticated users are redirected to /login
 * (preserving the intended destination so they land back here after signing
 * in); authenticated users lacking module access are redirected to /403.
 */
export default function ProtectedRoute({ children, requiredModule }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, hasModuleAccess } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <FullScreenLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredModule && !hasModuleAccess(requiredModule)) {
    return <Navigate to="/403" replace />;
  }

  return children;
}
