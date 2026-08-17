-- Nền tảng học (M0) — mở rộng Chăm sang flashcard/SRS từ vựng + kanji tiếng Nhật.
-- Khác bảng `kv` (0001_kv.sql, key-value cho state cá nhân của Chăm): đây là dữ
-- liệu QUAN HỆ vì nội dung học (từ vựng, kanji, câu) dùng CHUNG cho mọi user và
-- cần truy vấn/lọc (theo cấp độ, theo deck) — không hợp với mô hình blob kv.
--
-- Nguồn nội dung dự kiến: JMdict (CC BY-SA), KANJIDIC2, Tatoeba (CC BY), danh
-- sách JLPT của Tanos/Jonathan Waller (CC BY). Xem docs/hoc-tap/nguon-du-lieu.md.
--
-- Chạy SAU 0001_kv.sql, trong Supabase Dashboard → SQL Editor.

-- ===== Nội dung hệ thống (đọc công khai cho user đã đăng nhập, ghi chỉ qua
-- service role — script ingestion, xem scripts/seed-n5-sample.mjs) =====

create table if not exists public.vocab (
  id uuid primary key default gen_random_uuid(),
  lang text not null default 'ja' check (lang in ('ja', 'en')),
  level text, -- "N5".."N1" (tiếng Nhật) hoặc null
  term text not null, -- "食べる"
  reading text, -- "たべる" (furigana/kana) — null cho tiếng Anh
  meaning_vi text not null,
  pos text, -- từ loại: "động từ nhóm 2", "danh từ"...
  source text not null default 'JMdict',
  created_at timestamptz not null default now()
);

create table if not exists public.kanji (
  id uuid primary key default gen_random_uuid(),
  character text not null unique, -- "食"
  level text, -- "N5".."N1"
  meaning_vi text not null,
  onyomi text[] not null default '{}',
  kunyomi text[] not null default '{}',
  stroke_count int,
  source text not null default 'KANJIDIC2',
  created_at timestamptz not null default now()
);

create table if not exists public.sentences (
  id uuid primary key default gen_random_uuid(),
  lang text not null default 'ja' check (lang in ('ja', 'en')),
  level text,
  text_original text not null, -- câu tiếng Nhật/Anh
  text_vi text not null, -- nghĩa tiếng Việt
  source text not null default 'Tatoeba',
  created_at timestamptz not null default now()
);

-- Deck: bộ thẻ. owner_id NULL = deck hệ thống (curated, mọi người thấy);
-- owner_id = user = deck do user tự tạo (M6 "sổ tay + tự tạo thẻ", tạo bảng
-- trước để không phải migrate thêm lần nữa khi làm M6).
create table if not exists public.decks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users (id) on delete cascade, -- null = hệ thống
  lang text not null default 'ja' check (lang in ('ja', 'en')),
  level text,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.deck_items (
  deck_id uuid not null references public.decks (id) on delete cascade,
  item_type text not null check (item_type in ('vocab', 'kanji', 'sentence')),
  item_id uuid not null,
  position int not null default 0,
  primary key (deck_id, item_type, item_id)
);

-- ===== Dữ liệu người dùng — khoá theo auth.uid(), cùng khuôn với `kv` =====

-- Trạng thái SRS của một thẻ, theo user. mastery: 4 mức độc lập (xem
-- src/logic/cardReview.ts) — {recognition, recall, listening, speaking} mỗi
-- mức true/false, một thẻ có thể "nhớ mặt chữ" nhưng chưa "nghe ra".
create table if not exists public.card_reviews (
  user_id uuid not null references auth.users (id) on delete cascade,
  item_type text not null check (item_type in ('vocab', 'kanji', 'sentence')),
  item_id uuid not null,
  interval_index int not null default 0,
  next_review_date date not null,
  mastery jsonb not null default '{}',
  history jsonb not null default '[]',
  archived boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, item_type, item_id)
);

alter table public.vocab enable row level security;
alter table public.kanji enable row level security;
alter table public.sentences enable row level security;
alter table public.decks enable row level security;
alter table public.deck_items enable row level security;
alter table public.card_reviews enable row level security;

-- Nội dung hệ thống: mọi user đã đăng nhập được ĐỌC. Không có policy
-- insert/update/delete cho role authenticated — chỉ service role (bypass RLS
-- mặc định) mới ghi được, dùng trong script ingestion.
create policy "vocab_select_authenticated" on public.vocab
  for select using (auth.role() = 'authenticated');

create policy "kanji_select_authenticated" on public.kanji
  for select using (auth.role() = 'authenticated');

create policy "sentences_select_authenticated" on public.sentences
  for select using (auth.role() = 'authenticated');

-- Deck: đọc được nếu ĐÃ ĐĂNG NHẬP và (là deck hệ thống HOẶC là deck của chính
-- mình); chỉ được ghi/sửa/xoá deck CỦA MÌNH (deck hệ thống chỉ service role sửa).
-- auth.role() = 'authenticated' bắt buộc — thiếu điều kiện này thì owner_id is
-- null sẽ khớp cả với request ẩn danh (auth.uid() cũng NULL khi chưa đăng nhập).
create policy "decks_select_visible" on public.decks
  for select using (auth.role() = 'authenticated' and (owner_id is null or owner_id = auth.uid()));

create policy "decks_insert_own" on public.decks
  for insert with check (owner_id = auth.uid());

create policy "decks_update_own" on public.decks
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "decks_delete_own" on public.decks
  for delete using (owner_id = auth.uid());

-- deck_items: nhìn thấy nếu ĐÃ ĐĂNG NHẬP và deck cha nhìn thấy được; chỉ sửa
-- được deck_items của deck do CHÍNH MÌNH sở hữu.
create policy "deck_items_select_visible" on public.deck_items
  for select using (
    auth.role() = 'authenticated' and exists (
      select 1 from public.decks d
      where d.id = deck_items.deck_id and (d.owner_id is null or d.owner_id = auth.uid())
    )
  );

create policy "deck_items_insert_own" on public.deck_items
  for insert with check (
    exists (select 1 from public.decks d where d.id = deck_items.deck_id and d.owner_id = auth.uid())
  );

create policy "deck_items_delete_own" on public.deck_items
  for delete using (
    exists (select 1 from public.decks d where d.id = deck_items.deck_id and d.owner_id = auth.uid())
  );

-- card_reviews: giống hệt khuôn của `kv` — mỗi user chỉ đụng dòng của mình.
create policy "card_reviews_select_own" on public.card_reviews
  for select using (auth.uid() = user_id);

create policy "card_reviews_insert_own" on public.card_reviews
  for insert with check (auth.uid() = user_id);

create policy "card_reviews_update_own" on public.card_reviews
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "card_reviews_delete_own" on public.card_reviews
  for delete using (auth.uid() = user_id);

create trigger card_reviews_updated_at
  before update on public.card_reviews
  for each row execute function public.kv_set_updated_at();
