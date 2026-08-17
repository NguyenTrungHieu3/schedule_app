-- Cố định search_path cho kv_set_updated_at (Supabase security advisor cảnh
-- báo "Function Search Path Mutable") — best practice cho function dùng trong
-- trigger, tránh bị chiếm quyền qua search_path thao túng. Không đổi hành vi.
alter function public.kv_set_updated_at() set search_path = public;
