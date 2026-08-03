import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { services } from '../../services';
import type { Role } from '../../types/domain';
import { LoadingSkeleton } from '../ui';

export function RequireAuth() {
  const auth = useAuth();
  const location = useLocation();
  if (!auth.isInitialized) return <div className="mx-auto max-w-4xl p-8"><LoadingSkeleton rows={4} /></div>;
  if (!auth.isAuthenticated) return <Navigate to="/" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

export function RequireRole({ allowed }: { allowed: Role[] }) {
  const { roles } = useAuth();
  if (!roles.some((role) => allowed.includes(role))) return <Navigate to="/unauthorized" replace />;
  return <Outlet />;
}

export function RequireProfile() {
  const { roles } = useAuth();
  const query = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: services.profiles.getMe,
    retry: false,
    enabled: !roles.includes('Admin'),
  });

  if (roles.includes('Admin')) return <Outlet />;
  if (query.isPending) return <div className="mx-auto max-w-4xl p-8"><LoadingSkeleton rows={3} /></div>;
  if (query.isError) return <Navigate to="/onboarding" replace />;
  return <Outlet />;
}
