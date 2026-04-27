import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url?.trim() || !anon?.trim()) {
  console.warn(
    '[maumahara] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — copy from akomanga `.env` or fill `.env.example`.',
  );
}

export const supabase = createClient(url || '', anon || '');
