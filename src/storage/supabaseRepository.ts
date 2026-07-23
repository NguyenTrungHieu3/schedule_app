// Repository CHÍNH của app — lưu vào bảng `kv` của Supabase thay vì localStorage,
// để đồng bộ dữ liệu học giữa nhiều máy (đăng nhập bằng magic link, xem AuthGate).
//
// timerState (TRANSIENT_KEYS) KHÔNG đi qua đây — Pomodoro đang chạy là trạng
// thái CỦA MÁY, luôn dùng localStorageRepository (xem repository.ts). Nếu không
// tách, mở app trên máy khác giữa phiên Pomodoro sẽ thấy timer "đã hết giờ" và
// cộng nhầm 1 pomodoro (đúng bẫy mà TRANSIENT_KEYS vốn được tạo ra để tránh).
//
// Cache in-memory: init() nạp toàn bộ key/value của user 1 lần bằng 1 query —
// get() sau đó đọc cache, không round-trip mạng cho mỗi lần đọc (mọi call site
// hiện tại đang gọi get() nhiều lần đồng thời trong appStore.load()).

import { supabase } from './supabaseClient';
import { STORAGE_ERROR_EVENT, SCHEMA_VERSION, TRANSIENT_KEYS, localStorageRepository, type Repository, type StorageKey } from './repository';

interface KvRow {
  key: string;
  value: unknown;
}

export class SupabaseRepository implements Repository {
  private cache = new Map<StorageKey, unknown>();
  private userId: string | null = null;

  // Gọi đúng 1 lần ngay sau khi có session (AuthGate) — trước khi app đọc gì.
  async init(userId: string): Promise<void> {
    this.userId = userId;
    const { data, error } = await supabase.from('kv').select('key,value').eq('user_id', userId);
    if (error) throw error;
    this.cache = new Map((data as KvRow[] | null ?? []).map((row) => [row.key as StorageKey, row.value]));
  }

  // Có dữ liệu trong cloud chưa? — AuthGate dùng để quyết định seed mới hay
  // migrate từ localStorage (xem AuthGate.tsx).
  hasAnyData(): boolean {
    return this.cache.size > 0;
  }

  private requireUserId(): string {
    if (!this.userId) throw new Error('SupabaseRepository chưa init() — gọi init(userId) sau khi đăng nhập.');
    return this.userId;
  }

  async get<T>(key: StorageKey): Promise<T | null> {
    if (TRANSIENT_KEYS.includes(key)) return localStorageRepository.get<T>(key);
    return this.cache.has(key) ? (this.cache.get(key) as T) : null;
  }

  async set<T>(key: StorageKey, value: T): Promise<void> {
    if (TRANSIENT_KEYS.includes(key)) return localStorageRepository.set(key, value);
    const userId = this.requireUserId();
    this.cache.set(key, value);
    const { error } = await supabase
      .from('kv')
      .upsert({ user_id: userId, key, value, updated_at: new Date().toISOString() }, { onConflict: 'user_id,key' });
    if (error) {
      // Mất mạng / RLS chặn: KHÔNG ném lỗi (app vẫn chạy tiếp với cache trong bộ
      // nhớ) nhưng báo để UI hiện cảnh báo — cùng cơ chế với LocalStorageRepository.
      console.error(`[study_app] Không ghi được "${key}" lên Supabase:`, error);
      window.dispatchEvent(new CustomEvent(STORAGE_ERROR_EVENT));
    }
  }

  async remove(key: StorageKey): Promise<void> {
    if (TRANSIENT_KEYS.includes(key)) return localStorageRepository.remove(key);
    this.cache.delete(key);
    const userId = this.requireUserId();
    const { error } = await supabase.from('kv').delete().eq('user_id', userId).eq('key', key);
    if (error) console.error(`[study_app] Không xoá được "${key}" trên Supabase:`, error);
  }

  async exportAll(): Promise<string> {
    const data: Record<string, unknown> = {};
    for (const [key, value] of this.cache) data[key] = value;
    return JSON.stringify({ schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), data }, null, 2);
  }

  async importAll(json: string): Promise<void> {
    const parsed = JSON.parse(json) as { schemaVersion?: number; data?: Record<string, unknown> };
    if (typeof parsed !== 'object' || parsed === null || typeof parsed.data !== 'object' || parsed.data === null) {
      throw new Error('File import không đúng định dạng.');
    }
    await this.clearAll();
    for (const [key, value] of Object.entries(parsed.data)) {
      if (TRANSIENT_KEYS.includes(key as StorageKey)) continue; // trạng thái phiên — không import
      await this.set(key as StorageKey, value);
    }
  }

  async clearAll(): Promise<void> {
    const userId = this.requireUserId();
    this.cache.clear();
    const { error } = await supabase.from('kv').delete().eq('user_id', userId);
    if (error) console.error('[study_app] Không xoá được dữ liệu trên Supabase:', error);
  }
}

// Instance dùng chung toàn app — mọi nơi khác import { repository } từ đây
// (thay vì từ repository.ts, nơi chỉ còn giữ LocalStorageRepository làm chi tiết
// triển khai cho timerState + migration).
export const repository = new SupabaseRepository();
