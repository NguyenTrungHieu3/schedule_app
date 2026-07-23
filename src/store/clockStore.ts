// Đồng hồ ngày logic — sinh ra để app TỰ chuyển sang ngày mới lúc 04:00
// mà không cần reload trang, và để UI có "bây giờ" luôn tươi.
//
// Trước đây getLogicalDate() chỉ được gọi lúc render: mở app qua 04:00 thì
// trang Hôm nay vẫn hiện ngày cũ, tick block ghi nhầm vào DayLog ngày cũ,
// freeze token cũng không reset khi sang tháng (chỉ reset trong load()).
//
// Chỉ tick mỗi 30s (đủ cho nhãn "Đang tới giờ") — KHÔNG dùng làm đồng hồ
// đếm giây; Pomodoro vẫn tính từ endTimestamp (xem timerStore).

import { create } from 'zustand';
import { getLogicalDate, getNowLogicalMinutes } from '../logic/date';
import { useAppStore } from './appStore';

const TICK_MS = 30_000;

interface ClockStore {
  logicalDate: string; // ngày logic hiện tại — đổi → toàn app theo ngày mới
  nowMinutes: number; // phút hiện tại trên trục ngày logic (04:00 → 28:00)
  tick(): Promise<void>;
}

export const useClockStore = create<ClockStore>((set, get) => ({
  logicalDate: getLogicalDate(),
  nowMinutes: getNowLogicalMinutes(),

  async tick() {
    const now = getLogicalDate();
    set({ nowMinutes: getNowLogicalMinutes() });
    if (now !== get().logicalDate) {
      set({ logicalDate: now });
      // Sang ngày logic mới: nạp lại store — reconcile chuỗi, reset freeze
      // token nếu sang tháng, và toàn bộ màn hình tự vẽ lại theo ngày mới.
      await useAppStore.getState().load();
    }
  },
}));

// Gọi một lần từ Layout — interval sống suốt phiên mở app.
// Trả về hàm dọn dẹp (cleanup của useEffect).
export function startLogicalClock(): () => void {
  const id = setInterval(() => void useClockStore.getState().tick(), TICK_MS);
  return () => clearInterval(id);
}
