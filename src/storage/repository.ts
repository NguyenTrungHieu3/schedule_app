// Lớp lưu trữ duy nhất của app — theo §3.1 của spec.
// KHÔNG được gọi localStorage ở bất kỳ file nào khác ngoài file này.
// Mọi hàm đều async kể cả khi localStorage là đồng bộ — để sau này
// thay bằng backend thì tầng UI không phải sửa dòng nào.

const PREFIX = 'study_app:';

export const SCHEMA_VERSION = 1;

// Sự kiện bắn ra khi GHI storage thất bại (hết quota, trình duyệt chặn ghi).
// Layout lắng nghe để hiện cảnh báo backup — app vẫn chạy tiếp với state
// trong bộ nhớ thay vì crash hay reject thầm lặng ở mọi action.
export const STORAGE_ERROR_EVENT = 'study_app:storage-error';

// Các key chứa TRẠNG THÁI PHIÊN (transient) — không đưa vào file backup, và
// (kể từ khi có SupabaseRepository) không đồng bộ lên cloud — luôn ở lại máy.
// timerState nếu được khôi phục từ bản backup cũ/máy khác sẽ khiến
// timerStore.hydrate() thấy một timer "đã hết giờ" và cộng một pomodoro ảo.
export const TRANSIENT_KEYS: StorageKey[] = ['timerState'];

export type StorageKey =
  | 'schemaVersion'
  | 'scheduleBlocks'
  | 'dayLogs'
  | 'streak'
  | 'reviewItems'
  | 'errorEntries'
  | 'rewardSlips'
  | 'rewardDraws'
  | 'weeklyReviews'
  | 'settings'
  | 'timerState'
  | 'pendingRewards'
  | 'vocabWrongWords';

export interface Repository {
  get<T>(key: StorageKey): Promise<T | null>;
  set<T>(key: StorageKey, value: T): Promise<void>;
  remove(key: StorageKey): Promise<void>;
  exportAll(): Promise<string>; // JSON string
  importAll(json: string): Promise<void>;
  clearAll(): Promise<void>;
}

export class LocalStorageRepository implements Repository {
  async get<T>(key: StorageKey): Promise<T | null> {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      // Dữ liệu hỏng — coi như không có, không crash app.
      return null;
    }
  }

  async set<T>(key: StorageKey, value: T): Promise<void> {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch (err) {
      // Hết quota / trình duyệt chặn ghi: KHÔNG ném lỗi (app vẫn chạy tiếp
      // với state trong bộ nhớ) nhưng phải báo để UI hiện cảnh báo backup.
      console.error(`[study_app] Không ghi được "${key}":`, err);
      window.dispatchEvent(new CustomEvent(STORAGE_ERROR_EVENT));
    }
  }

  async remove(key: StorageKey): Promise<void> {
    localStorage.removeItem(PREFIX + key);
  }

  private allPrefixedKeys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key !== null && key.startsWith(PREFIX)) keys.push(key);
    }
    return keys;
  }

  async exportAll(): Promise<string> {
    const data: Record<string, unknown> = {};
    for (const fullKey of this.allPrefixedKeys()) {
      const shortKey = fullKey.slice(PREFIX.length) as StorageKey;
      if (TRANSIENT_KEYS.includes(shortKey)) continue; // trạng thái phiên — không backup
      const raw = localStorage.getItem(fullKey);
      if (raw !== null) {
        data[shortKey] = JSON.parse(raw);
      }
    }
    return JSON.stringify({ schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), data }, null, 2);
  }

  async importAll(json: string): Promise<void> {
    const parsed = JSON.parse(json) as { schemaVersion?: number; data?: Record<string, unknown> };
    if (typeof parsed !== 'object' || parsed === null || typeof parsed.data !== 'object' || parsed.data === null) {
      throw new Error('File import không đúng định dạng.');
    }
    // TODO: khi SCHEMA_VERSION tăng, viết migrate từ version cũ ở đây.
    await this.clearAll();
    for (const [key, value] of Object.entries(parsed.data)) {
      // Bỏ qua key transient — phòng file backup được tạo bởi bản app cũ.
      if (TRANSIENT_KEYS.includes(key as StorageKey)) continue;
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    }
  }

  async clearAll(): Promise<void> {
    for (const fullKey of this.allPrefixedKeys()) {
      localStorage.removeItem(fullKey);
    }
  }
}

// Instance localStorage thuần — dùng cho: (1) timerState (luôn ở lại máy, xem
// TRANSIENT_KEYS), (2) đọc dữ liệu cũ một lần để migrate lên Supabase.
// Repository CHÍNH của app (đồng bộ cloud) nằm ở supabaseRepository.ts.
export const localStorageRepository: Repository = new LocalStorageRepository();
