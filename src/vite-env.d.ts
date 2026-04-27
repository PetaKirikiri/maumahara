/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_OPENAI_API_KEY: string;
  readonly VITE_AI4THAI_API_KEY: string;
  readonly VITE_GOOGLE_TTS_API_KEY: string;
  readonly VITE_PURAKAU_APP_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
