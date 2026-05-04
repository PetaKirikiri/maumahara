import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CardSetupRow, CoursePatternSlotContext, PatternSetupCard } from '@/lib/study/cardSetup';
import type { PatternSlotRulesJson, SlotRuleJson } from '@/lib/study/patternSlotRules';
import { parsePatternSlotRules } from '@/lib/study/patternSlotRules';
import { normalizeLemma } from '@/lib/study/wordSubcategories';

type Props = {
  card: PatternSetupCard;
  context: CoursePatternSlotContext;
  onSave: (row: CardSetupRow) => void;
  disabled?: boolean;
};

type Tab = 'words' | 'categories';

type SlotBoolMaps = { words: Record<string, boolean>; cats: Record<string, boolean> };

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === 'object' && !Array.isArray(x);
}

function wordsForPos(posId: number, ctx: CoursePatternSlotContext): string[] {
  return ctx.courseWords.filter((w) => w.pos_type_id === posId).map((w) => w.word_text);
}

function categoryOptionsForPos(posId: number, ctx: CoursePatternSlotContext): string[] {
  const s = new Set<string>();
  for (const w of ctx.courseWords) {
    if (w.pos_type_id !== posId) continue;
    for (const c of ctx.categoriesByWord[w.word_text] ?? []) s.add(c);
  }
  return [...s].sort();
}

function readRawSlot(rules: unknown, slotIndex: number): Record<string, unknown> | null {
  if (!isRecord(rules)) return null;
  const slots = rules.slots;
  if (!isRecord(slots)) return null;
  const v = slots[String(slotIndex)];
  return isRecord(v) ? v : null;
}

function initSlotMaps(
  slotIndex: number,
  posId: number,
  ctx: CoursePatternSlotContext,
  rulesJson: unknown,
): SlotBoolMaps {
  const wordOpts = wordsForPos(posId, ctx);
  const catOpts = categoryOptionsForPos(posId, ctx);
  const parsed = parsePatternSlotRules(rulesJson).get(slotIndex);
  const allow = parsed?.allow ?? null;
  const req = parsed?.requireAnyCategory ?? null;

  const words: Record<string, boolean> = {};
  if (!allow?.length) for (const w of wordOpts) words[w] = true;
  else {
    const allowSet = new Set(allow.map(normalizeLemma));
    for (const w of wordOpts) words[w] = allowSet.has(normalizeLemma(w));
  }

  const cats: Record<string, boolean> = {};
  if (!req?.length) for (const c of catOpts) cats[c] = true;
  else {
    const reqSet = new Set(req.map((s) => s.toLowerCase()));
    for (const c of catOpts) cats[c] = reqSet.has(c.toLowerCase());
  }

  return { words, cats };
}

function serializeSlotPart(
  wordOpts: string[],
  words: Record<string, boolean>,
  catOpts: string[],
  cats: Record<string, boolean>,
): Pick<SlotRuleJson, 'allow' | 'requireAnyCategory'> | null {
  const wordsOn = wordOpts.filter((w) => words[w]);
  const allow = wordOpts.length > 0 && wordsOn.length < wordOpts.length ? wordsOn : undefined;

  const catsOn = catOpts.filter((c) => cats[c]);
  let requireAnyCategory: string[] | undefined;
  if (catOpts.length > 0) {
    if (catsOn.length > 0 && catsOn.length < catOpts.length) {
      requireAnyCategory = catsOn.map((c) => c.toLowerCase());
    }
  }

  if (!allow && !requireAnyCategory) return null;
  const out: Pick<SlotRuleJson, 'allow' | 'requireAnyCategory'> = {};
  if (allow) out.allow = allow;
  if (requireAnyCategory) out.requireAnyCategory = requireAnyCategory;
  return out;
}

function mergeSlotJson(prev: Record<string, unknown> | null, simple: ReturnType<typeof serializeSlotPart>): SlotRuleJson | null {
  const base: Record<string, unknown> = prev ? { ...prev } : {};
  delete base.allow;
  delete base.requireAnyCategory;
  delete base.requireAllCategoryGroups;
  if (simple) {
    if (simple.allow) base.allow = simple.allow;
    if (simple.requireAnyCategory) base.requireAnyCategory = simple.requireAnyCategory;
  }
  const has =
    (Array.isArray(base.allow) && base.allow.length > 0) ||
    (Array.isArray(base.requireAnyCategory) && base.requireAnyCategory.length > 0) ||
    (Array.isArray(base.requireAllCategoryGroups) && base.requireAllCategoryGroups.length > 0) ||
    (Array.isArray(base.whenBranches) && base.whenBranches.length > 0) ||
    (isRecord(base.default) && Object.keys(base.default).length > 0);
  return has ? (base as SlotRuleJson) : null;
}

function buildFullPatternSlotRules(
  sequencePosIds: number[],
  ctx: CoursePatternSlotContext,
  bySlot: Record<number, SlotBoolMaps>,
  previousFull: unknown,
): PatternSlotRulesJson | null {
  const slots: Record<string, SlotRuleJson> = {};
  for (let i = 0; i < sequencePosIds.length; i++) {
    const posId = sequencePosIds[i];
    const wordOpts = wordsForPos(posId, ctx);
    const catOpts = categoryOptionsForPos(posId, ctx);
    const maps = bySlot[i] ?? { words: {}, cats: {} };
    const simple = serializeSlotPart(wordOpts, maps.words, catOpts, maps.cats);
    const prevRaw = readRawSlot(previousFull, i);
    const merged = mergeSlotJson(prevRaw, simple);
    if (merged) slots[String(i)] = merged;
  }
  return Object.keys(slots).length > 0 ? { slots } : null;
}

function SwitchRow({
  label,
  on,
  disabled,
  onToggle,
}: {
  label: string;
  on: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-portal-border/40 py-1.5 last:border-b-0">
      <span className="min-w-0 truncate text-[11px] text-portal-ink" title={label}>
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={disabled}
        onClick={onToggle}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          on ? 'bg-portal-ink' : 'bg-portal-border'
        } ${disabled ? 'opacity-50' : ''}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
            on ? 'translate-x-[1.125rem]' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}

export function PatternSlotFilterPanel({ card, context, onSave, disabled }: Props) {
  const rulesJson = card.stableSetupRow?.pattern_slot_rules ?? null;
  const rulesRef = useRef(rulesJson);
  useEffect(() => {
    rulesRef.current = rulesJson;
  }, [rulesJson, card.rulesStorageKey]);

  const [bySlot, setBySlot] = useState<Record<number, SlotBoolMaps>>(() => {
    const init: Record<number, SlotBoolMaps> = {};
    card.sequencePosIds.forEach((posId, i) => {
      init[i] = initSlotMaps(i, posId, context, rulesJson);
    });
    return init;
  });
  const [tabBySlot, setTabBySlot] = useState<Record<number, Tab>>({});

  const rulesSig = JSON.stringify(rulesJson);
  const seqSig = card.sequencePosIds.join(',');

  useEffect(() => {
    const init: Record<number, SlotBoolMaps> = {};
    card.sequencePosIds.forEach((posId, i) => {
      init[i] = initSlotMaps(i, posId, context, rulesJson);
    });
    setBySlot(init);
  }, [card.rulesStorageKey, rulesSig, seqSig, context.courseWords.length]);

  const baseStableRow = useCallback((): CardSetupRow => {
    return (
      card.stableSetupRow ?? {
        course_id: card.setup.course_id,
        card_key: card.rulesStorageKey,
        card_type: 'pattern',
        enabled: true,
        sort_order: null,
        front_text_override: null,
        answer_override: null,
        notes: null,
        pattern_slot_rules: null,
      }
    );
  }, [card.rulesStorageKey, card.setup.course_id, card.stableSetupRow]);

  const persist = useCallback(
    (next: Record<number, SlotBoolMaps>) => {
      const json = buildFullPatternSlotRules(card.sequencePosIds, context, next, rulesRef.current);
      rulesRef.current = json;
      onSave({ ...baseStableRow(), pattern_slot_rules: json });
    },
    [baseStableRow, card.sequencePosIds, context, onSave],
  );

  const posLabel = useCallback(
    (posId: number) =>
      context.posTypes.find((p) => p.id === posId)?.label ??
      context.posTypes.find((p) => p.id === posId)?.code ??
      `POS ${posId}`,
    [context.posTypes],
  );

  const slotSummaries = useMemo(() => {
    return card.sequencePosIds.map((posId, slotIndex) => {
      const wordOpts = wordsForPos(posId, context);
      const catOpts = categoryOptionsForPos(posId, context);
      const m = bySlot[slotIndex] ?? { words: {}, cats: {} };
      const wOn = wordOpts.filter((w) => m.words[w]).length;
      const cOn = catOpts.filter((c) => m.cats[c]).length;
      const raw = readRawSlot(rulesJson, slotIndex);
      const branches =
        raw && Array.isArray(raw.whenBranches) && raw.whenBranches.length > 0 ? raw.whenBranches.length : 0;
      return { wOn, wTot: wordOpts.length, cOn, cTot: catOpts.length, branches };
    });
  }, [bySlot, card.sequencePosIds, context, rulesJson]);

  const setWord = (slotIndex: number, word: string, nextOn: boolean, posId: number) => {
    setBySlot((prev) => {
      const wordOpts = wordsForPos(posId, context);
      const cur = prev[slotIndex] ?? initSlotMaps(slotIndex, posId, context, rulesRef.current);
      const nextWords = { ...cur.words, [word]: nextOn };
      const onCount = wordOpts.filter((w) => nextWords[w]).length;
      if (onCount === 0) return prev;
      const next = { ...prev, [slotIndex]: { ...cur, words: nextWords } };
      persist(next);
      return next;
    });
  };

  const setCat = (slotIndex: number, cat: string, nextOn: boolean, posId: number) => {
    setBySlot((prev) => {
      const cur = prev[slotIndex] ?? initSlotMaps(slotIndex, posId, context, rulesRef.current);
      const nextCats = { ...cur.cats, [cat]: nextOn };
      const next = { ...prev, [slotIndex]: { ...cur, cats: nextCats } };
      persist(next);
      return next;
    });
  };

  return (
    <div className="mt-2 space-y-1.5">
      {card.sequencePosIds.map((posId, slotIndex) => {
        const wordOpts = wordsForPos(posId, context);
        const catOpts = categoryOptionsForPos(posId, context);
        const maps = bySlot[slotIndex] ?? initSlotMaps(slotIndex, posId, context, rulesJson);
        const tab = tabBySlot[slotIndex] ?? 'words';
        const sum = slotSummaries[slotIndex];
        const summaryBits = [`${sum.wOn}/${sum.wTot} words`];
        if (sum.cTot > 0) summaryBits.push(`${sum.cOn}/${sum.cTot} tags`);
        if (sum.branches > 0) summaryBits.push(`${sum.branches} branch rules`);

        return (
          <details
            key={slotIndex}
            className="rounded-md border border-portal-border bg-portal-surface open:shadow-sm"
          >
            <summary className="cursor-pointer select-none px-3 py-2 text-xs font-medium text-portal-ink marker:text-portal-muted">
              <span className="text-portal-muted">{slotIndex}</span>
              <span className="mx-1.5 text-portal-border">·</span>
              {posLabel(posId)}
              <span className="ml-2 font-normal text-[10px] text-portal-muted">{summaryBits.join(' · ')}</span>
            </summary>
            <div className="border-t border-portal-border px-2 pb-2 pt-1">
              <div className="flex rounded-md border border-portal-border bg-white p-0.5 text-[10px] font-medium">
                {(['words', 'categories'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    disabled={disabled}
                    className={`flex-1 rounded px-2 py-1 capitalize ${
                      tab === t ? 'bg-portal-ink text-white' : 'text-portal-muted hover:text-portal-ink'
                    }`}
                    onClick={(e) => {
                      e.preventDefault();
                      setTabBySlot((prev) => ({ ...prev, [slotIndex]: t }));
                    }}
                  >
                    {t === 'words' ? 'Words' : 'Categories'}
                  </button>
                ))}
              </div>
              <div className="mt-1 max-h-48 overflow-y-auto rounded border border-portal-border/80 bg-white px-1">
                {tab === 'words' ? (
                  wordOpts.length === 0 ? (
                    <p className="px-2 py-2 text-[11px] text-portal-muted">No lemmas for this POS in the course.</p>
                  ) : (
                    wordOpts.map((w) => (
                      <SwitchRow
                        key={w}
                        label={w}
                        on={maps.words[w] !== false}
                        disabled={disabled}
                        onToggle={() => setWord(slotIndex, w, !(maps.words[w] !== false), posId)}
                      />
                    ))
                  )
                ) : catOpts.length === 0 ? (
                  <p className="px-2 py-2 text-[11px] text-portal-muted">No tags for words in this POS.</p>
                ) : (
                  catOpts.map((c) => (
                    <SwitchRow
                      key={c}
                      label={c}
                      on={maps.cats[c] !== false}
                      disabled={disabled}
                      onToggle={() => setCat(slotIndex, c, !(maps.cats[c] !== false), posId)}
                    />
                  ))
                )}
              </div>
            </div>
          </details>
        );
      })}
    </div>
  );
}
