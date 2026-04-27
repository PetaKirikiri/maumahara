import { describe, expect, it } from 'vitest';
import { getWordAudioUrl } from './wordAudioUrl';

describe('getWordAudioUrl', () => {
  it('uses pronunciation_url', () => {
    expect(
      getWordAudioUrl({ pronunciation_url: 'https://example.com/a.mp3', te_aka: {} }),
    ).toBe('https://example.com/a.mp3');
  });
  it('uses te_aka.audioUrl when no pronunciation_url', () => {
    expect(
      getWordAudioUrl({ te_aka: { audioUrl: 'https://b.example/b.mp3' } }),
    ).toBe('https://b.example/b.mp3');
  });
  it('returns null for empty', () => {
    expect(getWordAudioUrl({})).toBeNull();
  });
});
