import { useState } from 'react';
import type { ClassLeaderboardRow } from '@/hooks/useClassLeaderboard';

function TrophyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden>
      <path d="M8 4h8v3.5a4 4 0 0 1-8 0V4Z" />
      <path d="M8 6H5.5a2 2 0 0 0 0 4H8M16 6h2.5a2 2 0 0 1 0 4H16" />
      <path d="M12 11.5V16M9 20h6M10 16h4v4h-4z" />
    </svg>
  );
}

type Props = {
  rows: ClassLeaderboardRow[];
  loading?: boolean;
};

export function ChampionNavItem({ rows, loading }: Props) {
  const [open, setOpen] = useState(false);
  const current = rows.find((r) => r.is_current_user);
  const rank = current ? `#${current.rank} / ${rows.length}` : 'Class rank unavailable';
  const title = current
    ? `Class leaderboard: ${current.display_name} is ${rank} with ${current.points} points`
    : 'Class leaderboard';

  return (
    <div className="relative">
      <button
        type="button"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-portal-border bg-portal-bg text-portal-accent shadow-sm hover:bg-portal-surface hover:text-portal-ink"
        title={title}
        aria-label={title}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <TrophyIcon />
      </button>

      {open ? (
        <div
          className="fixed right-0 top-14 z-20 w-[min(22rem,100vw)] rounded-bl-xl border-b border-l border-portal-border bg-portal-surface p-3 text-left shadow-lg"
          role="dialog"
          aria-label="Class leaderboard"
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-portal-ink">Student champions</p>
              <p className="text-xs text-portal-muted">
                {current ? `${rank} · ${current.points} pts` : 'Your class points'}
              </p>
            </div>
            <button
              type="button"
              className="rounded-full px-2 text-sm text-portal-muted hover:bg-portal-bg hover:text-portal-ink"
              aria-label="Close leaderboard"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </div>

          {loading ? (
            <p className="py-4 text-center text-sm text-portal-muted">Loading class points…</p>
          ) : rows.length === 0 ? (
            <p className="py-4 text-center text-sm text-portal-muted">No class points yet.</p>
          ) : (
            <ol className="max-h-[calc(100vh-9rem)] space-y-1 overflow-y-auto">
              {rows.map((row) => (
                <li
                  key={row.student_id}
                  className={`grid grid-cols-[2.5rem_1fr_auto] items-center gap-2 rounded-lg px-2 py-2 text-sm ${
                    row.is_current_user ? 'bg-portal-bg text-portal-ink' : 'text-portal-ink'
                  }`}
                >
                  <span className="text-xs font-semibold text-portal-muted">#{row.rank}</span>
                  <span className="min-w-0 truncate font-medium">
                    {row.display_name}
                    {row.is_current_user ? <span className="ml-1 text-xs text-portal-muted">(you)</span> : null}
                  </span>
                  <span className="text-sm font-semibold tabular-nums">{row.points} pts</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      ) : null}
    </div>
  );
}
