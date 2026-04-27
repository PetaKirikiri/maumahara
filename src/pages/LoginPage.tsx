import { FormEvent, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/';

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    navigate(next, { replace: true });
  }

  async function onSignUp() {
    setError(null);
    setLoading(true);
    const { error: err } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    navigate(next, { replace: true });
  }

  return (
    <div className="min-h-screen bg-portal-bg px-6 py-10 text-portal-ink">
      <div className="mx-auto max-w-sm rounded-xl border border-portal-border bg-portal-surface p-8 shadow-sm">
        <h1 className="text-xl font-semibold">maumahara</h1>
        <p className="mt-2 text-sm text-portal-muted">Sign in to save your word progress.</p>
        <form className="mt-6 space-y-3" onSubmit={onSubmit}>
          <div>
            <label className="block text-sm font-medium" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              className="mt-1 w-full rounded border border-portal-border bg-white px-3 py-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={6}
              className="mt-1 w-full rounded border border-portal-border bg-white px-3 py-2 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error ? <p className="text-sm text-portal-danger">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded bg-portal-ink px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {loading ? '…' : 'Sign in'}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={onSignUp}
              className="rounded border border-portal-border px-4 py-2 text-sm disabled:opacity-50"
            >
              Create account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
