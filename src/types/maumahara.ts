export type MasteryRow = {
  id: string;
  user_id: string;
  word_text: string;
  mastery: number;
  next_review_at: string;
  updated_at: string;
};

export type WordRegistryRow = {
  word_text: string;
  metadata: unknown;
};
