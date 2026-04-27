import type { User } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type AppUserRow = {
  id: number;
  email: string;
  display_name: string | null;
  role: string;
};

function unwrapSnapshotPayload(data: unknown): unknown {
  if (data == null) return null;
  if (typeof data === 'string') {
    try {
      return JSON.parse(data) as unknown;
    } catch {
      return null;
    }
  }
  return data;
}

function coerceInt(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parseAuthSnapshot(data: unknown): { appUser: AppUserRow; studentId: number | null } | null {
  const raw = unwrapSnapshotPayload(data);
  if (raw == null || typeof raw !== 'object') return null;
  const o = raw as {
    app_user?: { id?: unknown; email?: unknown; display_name?: unknown; role?: unknown };
    student_id?: unknown;
  };
  const u = o.app_user;
  if (!u || typeof u !== 'object') return null;
  const id = coerceInt(u.id);
  if (id == null) return null;
  const sid = coerceInt(o.student_id);
  return {
    appUser: {
      id,
      email: String(u.email ?? ''),
      display_name: u.display_name == null || u.display_name === undefined ? null : String(u.display_name),
      role: String(u.role ?? ''),
    },
    studentId: sid,
  };
}

function isMissingSnapshotRpc(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  if (err.code === '42883' || err.code === 'PGRST202') return true;
  const m = String(err.message ?? '').toLowerCase();
  return m.includes('portal_get_auth_snapshot') || m.includes('does not exist') || m.includes('schema cache');
}

export function usePortalStudentProfile(user: User | null) {
  const [loading, setLoading] = useState(Boolean(user));
  const [appUser, setAppUser] = useState<AppUserRow | null>(null);
  const [studentId, setStudentId] = useState<number | null>(null);

  const load = useCallback(async (authUser: User | null) => {
    if (!authUser) {
      setAppUser(null);
      setStudentId(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      await supabase.rpc('claim_app_user_by_email');
      await supabase.rpc('portal_ensure_app_user_for_auth');

      const snap = await supabase.rpc('portal_get_auth_snapshot');
      const parsed = !snap.error ? parseAuthSnapshot(snap.data) : null;

      if (!snap.error && parsed) {
        setAppUser(parsed.appUser);
        setStudentId(parsed.studentId);
        return;
      }

      if (snap.error && !isMissingSnapshotRpc(snap.error)) {
        setAppUser(null);
        setStudentId(null);
        return;
      }

      const fetchAppUser = () =>
        supabase
          .from('app_users')
          .select('id, email, display_name, role')
          .eq('auth_user_id', authUser.id)
          .maybeSingle();

      let { data: au, error: auErr } = await fetchAppUser();
      if (auErr || !au) {
        ({ data: au, error: auErr } = await fetchAppUser());
      }

      if (auErr || !au) {
        setAppUser(null);
        setStudentId(null);
        return;
      }

      setAppUser({
        id: au.id as number,
        email: au.email as string,
        display_name: (au.display_name as string | null) ?? null,
        role: au.role as string,
      });
      const { data: st } = await supabase
        .from('students')
        .select('id')
        .eq('app_user_id', au.id)
        .maybeSingle();
      setStudentId(st?.id != null ? (st.id as number) : null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(user);
  }, [user, load]);

  return { loading, appUser, studentId, refreshProfile: () => void load(user) };
}
