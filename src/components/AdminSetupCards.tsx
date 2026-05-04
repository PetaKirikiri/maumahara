import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PatternSlotFilterPanel } from '@/components/PatternSlotFilterPanel';
import {
  loadCourseSetupCards,
  upsertCardSetup,
  type CardSetupRow,
  type PatternSetupCard,
  type WordSetupCard,
} from '@/lib/study/cardSetup';

type Props = { courseId: number; courseName: string };
type SetupCard = WordSetupCard | PatternSetupCard;
type Filter = 'all' | 'word' | 'pattern' | 'missing_audio' | 'missing_answer' | 'cannot_generate' | 'disabled';

function touchingUnderline(text: string, color: string, title?: string) {
  return (
    <span
      className="rounded"
      title={title}
      style={{
        backgroundImage: `linear-gradient(${color}, ${color})`,
        backgroundPosition: '0 100%',
        backgroundRepeat: 'no-repeat',
        backgroundSize: '100% 0.12em',
        paddingBottom: '0.16em',
      }}
    >
      {text}
    </span>
  );
}

function patternPhrase(card: PatternSetupCard) {
  return card.tokens.map((token, index) => {
    const text = token.text + (index < card.tokens.length - 1 ? ' ' : '');
    return (
      <span key={`${card.key}-${index}`}>
        {touchingUnderline(text, token.underlineColor, token.posLabel)}
      </span>
    );
  });
}

function visibleForFilter(card: SetupCard, filter: Filter): boolean {
  if (filter === 'all') return true;
  if (filter === 'word') return card.cardType === 'word';
  if (filter === 'pattern') return card.cardType === 'pattern';
  if (filter === 'disabled') return !card.enabled;
  if (filter === 'missing_audio') return card.attention.includes('Missing audio');
  if (filter === 'missing_answer') return card.attention.includes('Missing answer');
  if (filter === 'cannot_generate') return card.attention.includes('Cannot generate with current course POS inventory');
  return true;
}

function sectionRows(cards: SetupCard[], filter: Filter) {
  const visible = cards.filter((card) => visibleForFilter(card, filter));
  return {
    active: visible.filter((card) => card.enabled && card.canStudy && card.attention.length === 0),
    needs: visible.filter((card) => card.enabled && card.attention.length > 0),
    disabled: visible.filter((card) => !card.enabled),
  };
}

function partitionSetupStreams(cards: SetupCard[]) {
  const words: SetupCard[] = [];
  const chunks: SetupCard[] = [];
  const sentences: SetupCard[] = [];
  for (const c of cards) {
    if (c.cardType === 'word') words.push(c);
    else if ((c as PatternSetupCard).patternSource === 'chunk') chunks.push(c);
    else sentences.push(c);
  }
  return { words, chunks, sentences };
}

function setupPatch(card: SetupCard, patch: Partial<CardSetupRow>): CardSetupRow {
  return {
    ...card.setup,
    course_id: card.setup.course_id,
    card_key: card.key,
    card_type: card.cardType,
    enabled: card.enabled,
    sort_order: card.setup.sort_order,
    front_text_override: card.setup.front_text_override,
    answer_override: card.setup.answer_override,
    notes: card.setup.notes,
    pattern_slot_rules: card.setup.pattern_slot_rules,
    ...patch,
  };
}

function textOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function shortSourceLabel(sourceLabel: string): string {
  if (sourceLabel === 'word_registry') return 'registry';
  if (sourceLabel === 'pos_chunk_patterns') return 'chunk';
  if (sourceLabel === 'sentence_patterns') return 'sentence';
  return sourceLabel;
}

export function AdminSetupCards({ courseId, courseName }: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const queryClient = useQueryClient();
  const cardsQ = useQuery({
    queryKey: ['maumahara', 'admin-setup-cards', courseId],
    queryFn: () => loadCourseSetupCards(courseId),
  });
  const saveSetup = useMutation({
    mutationFn: upsertCardSetup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maumahara', 'admin-setup-cards', courseId] });
      queryClient.invalidateQueries({ queryKey: ['maumahara', 'setup-cards', courseId] });
    },
  });

  const totals = useMemo(() => {
    const data = cardsQ.data;
    const patterns = data?.patterns ?? [];
    const chunks = patterns.filter((p) => p.patternSource === 'chunk').length;
    const sentences = patterns.filter((p) => p.patternSource === 'sentence').length;
    return { words: data?.words.length ?? 0, chunks, sentences };
  }, [cardsQ.data]);
  const rows = useMemo(() => sectionRows(cardsQ.data?.all ?? [], filter), [cardsQ.data?.all, filter]);
  const activeParts = useMemo(() => partitionSetupStreams(rows.active), [rows.active]);
  const needsParts = useMemo(() => partitionSetupStreams(rows.needs), [rows.needs]);
  const disabledParts = useMemo(() => partitionSetupStreams(rows.disabled), [rows.disabled]);

  if (cardsQ.isPending) return <p className="text-xs text-portal-muted">Loading…</p>;
  if (cardsQ.isError) return <p className="text-sm text-portal-danger">{(cardsQ.error as Error).message}</p>;

  const filters: { id: Filter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'word', label: 'Words' },
    { id: 'pattern', label: 'Patterns' },
    { id: 'missing_audio', label: 'No audio' },
    { id: 'missing_answer', label: 'No gloss' },
    { id: 'cannot_generate', label: 'Blocked' },
    { id: 'disabled', label: 'Off' },
  ];

  function save(card: SetupCard, patch: Partial<CardSetupRow>) {
    saveSetup.mutate(setupPatch(card, patch));
  }

  function renderCard(card: SetupCard) {
    const typeTag = card.cardType === 'word' ? 'W' : 'P';
    const fixed = card.cardType === 'pattern' && card.phraseCardId ? ' · fixed' : '';
    const meta =
      card.cardType === 'pattern'
        ? `${typeTag} · ${shortSourceLabel(card.sourceLabel)} · ${card.patternName}${fixed}`
        : `${typeTag} · ${shortSourceLabel(card.sourceLabel)} · ${card.posLabel}`;
    const overrideOpen =
      card.cardType === 'pattern' &&
      Boolean(
        (card.setup.front_text_override ?? '').trim() ||
          (card.setup.answer_override ?? '').trim() ||
          (card.setup.notes ?? '').trim(),
      );

    if (card.cardType === 'word') {
      return (
        <div key={card.key} className="space-y-1.5 px-2 py-2 text-sm sm:px-2.5 sm:py-2">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold leading-snug text-portal-ink sm:text-lg">
                {touchingUnderline(card.front, card.underlineColor, card.posLabel)}
              </p>
              <p className="truncate text-[10px] leading-tight text-portal-muted" title={meta}>
                {meta}
              </p>
              {card.attention.length > 0 ? (
                <p className="mt-0.5 text-[10px] leading-tight text-portal-danger">{card.attention.join(' · ')}</p>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2 text-[11px] text-portal-ink">
              <label className="flex cursor-pointer items-center gap-1" title="Learners see this card">
                <input
                  type="checkbox"
                  checked={card.enabled}
                  onChange={(e) => save(card, { enabled: e.target.checked })}
                />
                On
              </label>
              <label className="flex items-center gap-0.5 text-portal-muted" title="Sort order (lower first)">
                <span className="tabular-nums">#</span>
                <input
                  type="number"
                  className="w-12 rounded border border-portal-border bg-white px-1 py-0.5 text-[11px] text-portal-ink"
                  defaultValue={card.setup.sort_order ?? ''}
                  onBlur={(e) => {
                    const value = e.target.value.trim();
                    save(card, { sort_order: value ? Number(value) : null });
                  }}
                />
              </label>
              <span
                className={`tabular-nums ${card.canStudy ? 'text-portal-muted' : 'text-portal-danger/80'}`}
                title={card.canStudy ? 'Has minimum data to study' : 'Not in study queue'}
              >
                {card.canStudy ? 'OK' : '—'}
              </span>
            </div>
          </div>
          <div className="grid gap-1.5 sm:grid-cols-3">
            <label className="block text-[11px] font-medium uppercase tracking-wide text-portal-muted">
              Front
              <input
                type="text"
                className="mt-0.5 w-full rounded border border-portal-border bg-white px-2 py-1.5 text-sm text-portal-ink"
                defaultValue={card.setup.front_text_override ?? ''}
                placeholder={card.originalFront}
                onBlur={(e) => save(card, { front_text_override: textOrNull(e.target.value) })}
              />
            </label>
            <label className="block text-[11px] font-medium uppercase tracking-wide text-portal-muted">
              Answer
              <input
                type="text"
                className="mt-0.5 w-full rounded border border-portal-border bg-white px-2 py-1.5 text-sm text-portal-ink"
                defaultValue={card.setup.answer_override ?? ''}
                placeholder={card.originalAnswer ?? '—'}
                onBlur={(e) => save(card, { answer_override: textOrNull(e.target.value) })}
              />
            </label>
            <label className="block text-[11px] font-medium uppercase tracking-wide text-portal-muted">
              Notes
              <input
                type="text"
                className="mt-0.5 w-full rounded border border-portal-border bg-white px-2 py-1.5 text-sm text-portal-ink"
                defaultValue={card.setup.notes ?? ''}
                placeholder="—"
                onBlur={(e) => save(card, { notes: textOrNull(e.target.value) })}
              />
            </label>
          </div>
        </div>
      );
    }

    const pCard = card as PatternSetupCard;
    return (
      <div key={card.key} className="space-y-2 px-2 py-2 text-sm sm:px-3 sm:py-2.5">
        <div className="rounded-lg border border-portal-border bg-white px-3 py-3 shadow-sm sm:px-4 sm:py-4">
          <p className="text-xl font-semibold leading-snug tracking-tight text-portal-ink sm:text-2xl">
            {pCard.available ? patternPhrase(pCard) : pCard.front}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] leading-tight text-portal-muted" title={meta}>
              {meta}
            </p>
            {card.attention.length > 0 ? (
              <p className="mt-0.5 text-[10px] leading-tight text-portal-danger">{card.attention.join(' · ')}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 text-[11px] text-portal-ink">
            <label className="flex cursor-pointer items-center gap-1" title="Learners see this card">
              <input
                type="checkbox"
                checked={card.enabled}
                onChange={(e) => save(card, { enabled: e.target.checked })}
              />
              On
            </label>
            <label className="flex items-center gap-0.5 text-portal-muted" title="Sort order (lower first)">
              <span className="tabular-nums">#</span>
              <input
                type="number"
                className="w-12 rounded border border-portal-border bg-white px-1 py-0.5 text-[11px] text-portal-ink"
                defaultValue={card.setup.sort_order ?? ''}
                onBlur={(e) => {
                  const value = e.target.value.trim();
                  save(card, { sort_order: value ? Number(value) : null });
                }}
              />
            </label>
            <span
              className={`tabular-nums ${card.canStudy ? 'text-portal-muted' : 'text-portal-danger/80'}`}
              title={card.canStudy ? 'Has minimum data to study' : 'Not in study queue'}
            >
              {card.canStudy ? 'OK' : '—'}
            </span>
          </div>
        </div>

        {cardsQ.data?.patternSlotContext ? (
          <>
            <PatternSlotFilterPanel
              key={card.key}
              card={pCard}
              context={cardsQ.data.patternSlotContext}
              disabled={saveSetup.isPending}
              onSave={(row) => saveSetup.mutate(row)}
            />
            {pCard.patternSource === 'sentence' ? (
              <p className="text-[10px] leading-snug text-portal-muted">
                Where this sentence’s POS sequence matches a chunk pattern, generation also applies that chunk’s
                slot filters (words and tags).
              </p>
            ) : null}
          </>
        ) : null}

        <details
          className="rounded border border-portal-border/70 bg-portal-surface/80"
          defaultOpen={overrideOpen}
        >
          <summary className="cursor-pointer select-none px-2 py-1.5 text-[10px] font-medium uppercase tracking-wide text-portal-muted marker:text-portal-muted">
            Overrides
          </summary>
          <div className="grid gap-1.5 border-t border-portal-border/60 px-2 pb-2 pt-1.5 sm:grid-cols-3">
            <label className="block text-[10px] font-medium uppercase tracking-wide text-portal-muted">
              Front
              <input
                type="text"
                className="mt-0.5 w-full rounded border border-portal-border bg-white px-1.5 py-1 text-xs text-portal-ink"
                defaultValue={card.setup.front_text_override ?? ''}
                placeholder={card.originalFront}
                onBlur={(e) => save(card, { front_text_override: textOrNull(e.target.value) })}
              />
            </label>
            <label className="block text-[10px] font-medium uppercase tracking-wide text-portal-muted">
              Answer
              <input
                type="text"
                className="mt-0.5 w-full rounded border border-portal-border bg-white px-1.5 py-1 text-xs text-portal-ink"
                defaultValue={card.setup.answer_override ?? ''}
                placeholder={card.originalAnswer ?? '—'}
                onBlur={(e) => save(card, { answer_override: textOrNull(e.target.value) })}
              />
            </label>
            <label className="block text-[10px] font-medium uppercase tracking-wide text-portal-muted sm:col-span-1">
              Notes
              <input
                type="text"
                className="mt-0.5 w-full rounded border border-portal-border bg-white px-1.5 py-1 text-xs text-portal-ink"
                defaultValue={card.setup.notes ?? ''}
                placeholder="—"
                onBlur={(e) => save(card, { notes: textOrNull(e.target.value) })}
              />
            </label>
          </div>
        </details>
      </div>
    );
  }

  function renderSection(title: string, cards: SetupCard[]) {
    return (
      <div className="rounded-lg border border-portal-border bg-portal-surface shadow-sm">
        <div className="flex items-center justify-between border-b border-portal-border px-3 py-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-portal-ink">{title}</h3>
          <span className="text-[11px] tabular-nums text-portal-muted">{cards.length}</span>
        </div>
        <div className="divide-y divide-portal-border">
          {cards.length > 0 ? cards.map(renderCard) : <p className="px-3 py-3 text-xs text-portal-muted">None</p>}
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-portal-ink">Setup · {courseName}</h2>
        <p className="text-xs tabular-nums text-portal-muted">
          {totals.words}W · {totals.chunks} chunk · {totals.sentences} sentence
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`rounded-md border border-portal-border px-2.5 py-1 text-xs ${
              filter === f.id ? 'bg-portal-ink text-white' : 'bg-portal-surface text-portal-ink hover:bg-portal-bg'
            }`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {saveSetup.isPending ? <p className="text-[11px] text-portal-muted">Saving…</p> : null}
      {saveSetup.isError ? <p className="text-xs text-portal-danger">{(saveSetup.error as Error).message}</p> : null}

      {renderSection('Active · Words', activeParts.words)}
      {renderSection('Active · Chunks', activeParts.chunks)}
      {renderSection('Active · Sentences', activeParts.sentences)}
      {renderSection('Issues · Words', needsParts.words)}
      {renderSection('Issues · Chunks', needsParts.chunks)}
      {renderSection('Issues · Sentences', needsParts.sentences)}
      {renderSection('Off · Words', disabledParts.words)}
      {renderSection('Off · Chunks', disabledParts.chunks)}
      {renderSection('Off · Sentences', disabledParts.sentences)}
    </section>
  );
}
