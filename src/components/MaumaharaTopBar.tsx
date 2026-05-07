import type { ReactNode } from 'react';
import { EcosystemAppSwitcher } from '@/components/EcosystemAppSwitcher';

type Props = {
  /** Right side: course select, profile, sign out */
  trailing?: ReactNode;
  /** Shown after the app name, akomanga-style (e.g. course title) */
  subtitle?: string | null;
};

/** Same row pattern as akomanga `PortalTopBar`: logo + wordmark + optional subtitle · actions. */
export function MaumaharaTopBar({ trailing, subtitle }: Props) {
  return (
    <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-portal-border bg-portal-surface px-4 py-3 shadow-sm sm:px-6">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-4">
        <div className="flex min-w-0 shrink-0 flex-wrap items-center gap-2">
          <EcosystemAppSwitcher />
          {subtitle ? (
            <span className="hidden max-w-[min(24rem,40vw)] truncate text-sm font-medium text-portal-muted sm:inline">
              · {subtitle}
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
        {trailing}
      </div>
    </header>
  );
}
