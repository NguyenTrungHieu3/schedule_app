// Client Supabase dùng chung toàn app — chỉ file này gọi createClient.

import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  throw new Error(
    'Thiếu VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copy .env.example thành .env.local và điền key từ Supabase project của bạn.',
  );
}

export const supabase = createClient(url, anonKey);
