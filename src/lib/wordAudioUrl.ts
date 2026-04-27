type Json = Record<string, unknown>;

function isRecord(x: unknown): x is Json {
  return x !== null && typeof x === 'object' && !Array.isArray(x);
}

/** Picks Te Aka / top-level dict URLs from word_registry.metadata. */
export function getWordAudioUrl(metadata: unknown): string | null {
  if (!isRecord(metadata)) return null;
  const topPron = metadata.pronunciation_url;
  if (typeof topPron === 'string' && topPron.length > 0) return topPron;

  const teAka = metadata.te_aka;
  if (isRecord(teAka)) {
    const a = teAka.audioUrl;
    if (typeof a === 'string' && a.length > 0) return a;
  }
  return null;
}
