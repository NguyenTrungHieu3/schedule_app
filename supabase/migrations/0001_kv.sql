-- Bảng key-value duy nhất của app — mỗi user_id có nhiều dòng, mỗi dòng là 1
-- StorageKey (xem src/storage/repository.ts). Khớp với cách app trước đây lưu
-- "study_app:<key>" trong localStorage, chỉ đổi chỗ chứa từ trình duyệt sang
-- Postgres để đồng bộ nhiều máy.
--
-- Chạy file này trong Supabase Dashboard → SQL Editor (chạy 1 lần khi tạo project).

create table if not exists public.kv (
  user_id uuid not null references auth.users (id) on delete cascade,
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.kv enable row level security;

-- Mỗi user CHỈ đọc/ghi được dòng của chính mình — bắt buộc vì anon key nằm
-- công khai trong frontend.
create policy "kv_select_own" on public.kv
  for select using (auth.uid() = user_id);

create policy "kv_insert_own" on public.kv
  for insert with check (auth.uid() = user_id);

create policy "kv_update_own" on public.kv
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "kv_delete_own" on public.kv
  for delete using (auth.uid() = user_id);

-- updated_at tự cập nhật mỗi lần ghi (tiện để debug đồng bộ sau này).
create or replace function public.kv_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger kv_updated_at
  before update on public.kv
  for each row execute function public.kv_set_updated_at();
