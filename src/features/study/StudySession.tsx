import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sortWordQueue } from '@/lib/study/queueSort';
import {
  applyDidntMastery,
  applyKnewMastery,
  masteryToTextOpacity,
  nextReviewAfterDidnt,
  nextReviewAfterKnew,
} from '@/lib/srs/binaryMastery';
import { getWordAudioUrl } from '@/lib/wordAudioUrl';
import { supabase } from '@/lib/supabase';
import type { MasteryRow, WordRegistryRow } from '@/types/maumahara';
import type { User } from '@supabase/supabase-js';

type Props = { user: User; courseId: number; courseName: string };

function useWordsWithAudioForCourse(courseId: number) {
  return useQuery({
    queryKey: ['maumahara', 'words', 'audio', 'course', courseId],
    queryFn: async () => {
      const { data: cw, error: e1 } = await supabase
        .from('course_words')
        .select('word_text')
        .eq('course_id', courseId);
      if (e1) throw new Error(e1.message);
      const texts = [...new Set((cw ?? []).map((r) => r.word_text as string))];
      if (texts.length === 0) return [];
      const { data, error } = await supabase
        .from('word_registry')
        .select('word_text, metadata')
        .in('word_text', texts)
        .order('word_text', { ascending: true });
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as WordRegistryRow[];
      return rows.filter((r) => getWordAudioUrl(r.metadata) != null);
    },
    enabled: Number.isFinite(courseId) && courseId > 0,
  });
}

function useMasteryMap(userId: string) {
  return useQuery({
    queryKey: ['maumahara', 'mastery', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maumahara_word_mastery')
        .select('id, user_id, word_text, mastery, next_review_at, updated_at')
        .eq('user_id', userId);
      if (error) throw new Error(error.message);
      return new Map((data as MasteryRow[]).map((r) => [r.word_text, r]));
    },
  });
}

export default function StudySession({ user, courseId, courseName }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queryClient = useQueryClient();
  const wordsQ = useWordsWithAudioForCourse(courseId);
  const masteryQ = useMasteryMap(user.id);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const masteryByText = useMemo(
    () => masteryQ.data ?? new Map<string, MasteryRow>(),
    [masteryQ.data],
  );

  const sorted = useMemo(() => {
    if (!wordsQ.data?.length) return [];
    return sortWordQueue(wordsQ.data, masteryByText);
  }, [wordsQ.data, masteryByText]);

  const current = sorted[0];
  const audioUrl = current ? getWordAudioUrl(current.metadata) : null;
  const mastery = current ? masteryByText.get(current.word_text)?.mastery ?? 0 : 0;
  const opacity = masteryToTextOpacity(mastery);

  const rateMutation = useMutation({
    mutationFn: async ({ card, knew }: { card: WordRegistryRow; knew: boolean }) => {
      const now = new Date();
      const prevMastery = masteryByText.get(card.word_text)?.mastery ?? 0;
      const m = knew ? applyKnewMastery(prevMastery) : applyDidntMastery(prevMastery);
      const nextAt = knew ? nextReviewAfterKnew(m, now) : nextReviewAfterDidnt(now);
      const row = {
        user_id: user.id,
        word_text: card.word_text,
        mastery: m,
        next_review_at: nextAt.toISOString(),
        updated_at: now.toISOString(),
      };
      const { error } = await supabase.from('maumahara_word_mastery').upsert(row, {
        onConflict: 'user_id,word_text',
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maumahara', 'mastery', user.id] });
    },
  });

  const onRate = useCallback(
    async (knew: boolean) => {
      if (!current) return;
      setErrMsg(null);
      try {
        await rateMutation.mutateAsync({ card: current, knew });
      } catch (e) {
        setErrMsg((e as Error).message);
      }
    },
    [current, rateMutation.mutateAsync],
  );

  const play = useCallback(() => {
    if (!audioRef.current) return;
    void audioRef.current.play().catch(() => {});
  }, []);

  const wordKey = current?.word_text;
  useEffect(() => {
    if (!wordKey || !audioUrl) return;
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = 0;
    void el.play().catch(() => {});
  }, [wordKey, audioUrl]);

  if (wordsQ.isPending || masteryQ.isPending) {
    return <p className="text-sm text-portal-muted">Loading cards…</p>;
  }
  if (wordsQ.isError) {
    return <p className="text-sm text-portal-danger">{(wordsQ.error as Error).message}</p>;
  }
  if (masteryQ.isError) {
    return <p className="text-sm text-portal-danger">{(masteryQ.error as Error).message}</p>;
  }
  if (!current || !audioUrl) {
    return (
      <p className="text-sm text-portal-muted">
        No words with audio in <span className="font-medium text-portal-ink">{courseName}</span> yet — add
        pronunciations or course words in the registry.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-6">
      <div className="text-center">
        <p
          className="text-3xl font-medium tracking-tight"
          style={{ opacity }}
          title={current.word_text}
        >
          {current.word_text}
        </p>
        <p className="mt-1 text-xs text-portal-muted" aria-hidden>
          Text fades as you mark “Knew it” so you rely on audio.
        </p>
      </div>

      <div className="flex justify-center">
        <audio
          key={current.word_text}
          ref={audioRef}
          src={audioUrl}
          preload="auto"
          className="w-full max-w-md"
        />
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={play}
          className="rounded border border-portal-border px-4 py-2 text-sm"
        >
          Play audio
        </button>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          disabled={rateMutation.isPending}
          onClick={() => void onRate(true)}
          className="min-w-28 rounded bg-portal-ink px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          Knew it
        </button>
        <button
          type="button"
          disabled={rateMutation.isPending}
          onClick={() => void onRate(false)}
          className="min-w-28 rounded border border-portal-border px-4 py-2 text-sm disabled:opacity-50"
        >
          Didn’t
        </button>
      </div>

      {errMsg ? <p className="text-center text-sm text-portal-danger">{errMsg}</p> : null}
      {rateMutation.isPending ? <p className="text-center text-xs text-portal-muted">Saving…</p> : null}
    </div>
  );
}
