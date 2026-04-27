import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StudySession from '@/features/study/StudySession';
import { usePortalStudentProfile } from '@/hooks/usePortalStudentProfile';
import { useStudentCourses } from '@/hooks/useStudentCourses';
import { useSupabaseSession } from '@/hooks/useSupabaseSession';
import { supabase } from '@/lib/supabase';

const SELECTED_COURSE_KEY = 'maumahara:selectedCourseId';

function readStoredCourseId(): number | null {
  const raw = localStorage.getItem(SELECTED_COURSE_KEY);
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

export default function HomePage() {
  const { user } = useSupabaseSession();
  const navigate = useNavigate();
  const { loading: profileLoading, studentId } = usePortalStudentProfile(user);
  const coursesQ = useStudentCourses(studentId, Boolean(user) && !profileLoading);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(() => readStoredCourseId());

  const courses = useMemo(() => coursesQ.data ?? [], [coursesQ.data]);

  useEffect(() => {
    if (courses.length === 0) {
      setSelectedCourseId(null);
      return;
    }
    const stored = readStoredCourseId();
    const match = stored != null ? courses.find((c) => c.id === stored) : null;
    const nextId = match ? match.id : courses[0].id;
    setSelectedCourseId(nextId);
    localStorage.setItem(SELECTED_COURSE_KEY, String(nextId));
  }, [courses]);

  const selectedCourse = useMemo(() => {
    if (courses.length === 0) return null;
    const id = selectedCourseId ?? courses[0].id;
    return courses.find((c) => c.id === id) ?? courses[0];
  }, [courses, selectedCourseId]);

  const onPickCourse = useCallback((id: number) => {
    setSelectedCourseId(id);
    localStorage.setItem(SELECTED_COURSE_KEY, String(id));
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  }, [navigate]);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-portal-bg px-6 py-10 text-portal-ink">
      <div className="mx-auto max-w-2xl rounded-xl border border-portal-border bg-portal-surface p-8 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">maumahara</h1>
            <p className="mt-1 text-sm text-portal-muted">
              Flash cards for your class vocabulary — audio and mastery. Port{' '}
              <code className="text-xs">5175</code>.
            </p>
            <p className="mt-1 text-xs text-portal-muted">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            className="shrink-0 rounded border border-portal-border px-3 py-1.5 text-sm"
          >
            Sign out
          </button>
        </div>

        {profileLoading ? (
          <p className="mt-6 text-sm text-portal-muted">Loading your class…</p>
        ) : studentId == null ? (
          <p className="mt-6 text-sm text-portal-muted">
            No student profile is linked to this login. Use the same account as in akomanga after a staff member
            links your student record.
          </p>
        ) : coursesQ.isPending ? (
          <p className="mt-6 text-sm text-portal-muted">Loading your courses…</p>
        ) : coursesQ.isError ? (
          <p className="mt-6 text-sm text-portal-danger">{(coursesQ.error as Error).message}</p>
        ) : courses.length === 0 ? (
          <p className="mt-6 text-sm text-portal-muted">
            You are not enrolled in a class yet. After enrollment in akomanga, your course vocabulary will show
            here.
          </p>
        ) : (
          <>
            <div className="mt-6 rounded-lg border border-portal-border bg-portal-bg/60 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-portal-muted">Your course</p>
              {courses.length === 1 ? (
                <p className="mt-1 text-sm font-medium text-portal-ink">{selectedCourse.name}</p>
              ) : (
                <label className="mt-2 block text-sm text-portal-ink">
                  <span className="sr-only">Select course</span>
                  <select
                    className="mt-1 w-full max-w-md rounded border border-portal-border bg-white px-3 py-2 text-sm"
                    value={selectedCourse.id}
                    onChange={(e) => onPickCourse(Number(e.target.value))}
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {selectedCourse?.description ? (
                <p className="mt-2 text-xs text-portal-muted">{selectedCourse.description}</p>
              ) : null}
            </div>
            <StudySession user={user} courseId={selectedCourse.id} courseName={selectedCourse.name} />
          </>
        )}
      </div>
    </div>
  );
}
