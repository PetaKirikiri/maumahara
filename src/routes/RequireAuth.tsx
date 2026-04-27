import { ReactNode, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSupabaseSession } from '@/hooks/useSupabaseSession';

type Props = { children: ReactNode };

export function RequireAuth({ children }: Props) {
  const { user, ready } = useSupabaseSession();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (ready && !user) {
      const from = location.pathname + location.search;
      const q = from !== '/login' ? new URLSearchParams({ next: from }) : new URLSearchParams();
      navigate(`/login${q.toString() ? `?${q}` : ''}`, { replace: true });
    }
  }, [ready, user, navigate, location.pathname, location.search]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-portal-bg px-6 py-10 text-portal-ink">
        <p className="text-sm text-portal-muted">Loading…</p>
      </div>
    );
  }
  if (!user) {
    return null;
  }
  return <>{children}</>;
}
