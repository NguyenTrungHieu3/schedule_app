// Logic chuỗi (streak) — theo §4.3 của spec. Hàm thuần, không dính React.
//
// Tại sao TÍNH LẠI TỪ ĐẦU thay vì cộng dồn tăng dần: freeze token có thể được
// gắn cho một ngày TRONG QUÁ KHỨ (≤7 ngày), tức là lịch sử thay đổi sau khi đã
// "chốt sổ". Sổ sách cộng dồn phải xử lý mọi kiểu sửa lùi — đó chính là chỗ
// dễ sai nhất mà spec cảnh báo. Tính lại toàn bộ từ lịch sử thì không có
// trạng thái trung gian nào để sai; với dữ liệu cỡ vài năm (~1000 ngày) vẫn
// tức thời.

import type { DayLog, DayTier, ScheduleBlock, StreakState } from '../types';
import { addDaysToDate, daysBetween, getDayOfWeek } from './date';
import { computeTier, hasStudyBlocks } from './tier';

export const SUCCESS_TIERS: DayTier[] = ['gold', 'silver', 'minimum'];
export const STREAK_MILESTONES = [7, 14, 30, 60, 100];
export const FREEZE_TOKENS_PER_MONTH = 2;
export const FREEZE_MAX_DAYS_BACK = 7;

export function isSuccessTier(tier: DayTier): boolean {
  return SUCCESS_TIERS.includes(tier);
}

// Tier CHỐT của một ngày đã qua. Ngày không có log = 'broken'.
// Log có tier 'frozen' thì giữ nguyên (freeze là quyết định của người dùng),
// còn lại tính lại từ completedBlockIds — vì log có thể bị lưu dở với tier
// 'pending' nếu người dùng đóng app giữa chừng.
export function finalTierForPastDay(
  log: DayLog | undefined,
  dayBlocks: ScheduleBlock[],
): DayTier {
  if (!log) return 'broken';
  if (log.tier === 'frozen') return 'frozen';
  return computeTier({
    dayBlocks,
    completedBlockIds: log.completedBlockIds,
    isToday: false,
    frozen: false,
  });
}

// Truy hồi chuỗi từ toàn bộ lịch sử đến hết NGÀY HÔM QUA.
// KHÔNG xử lý hôm nay — hôm nay còn đang diễn ra (xem displayStreak bên dưới).
export function reconcileStreak(args: {
  streak: StreakState;
  dayLogs: Record<string, DayLog>;
  scheduleBlocks: ScheduleBlock[];
  today: string; // ngày logic
}): StreakState {
  const { streak, dayLogs, scheduleBlocks, today } = args;
  const yesterday = addDaysToDate(today, -1);

  const loggedDates = Object.keys(dayLogs).filter((d) => d < today);
  if (loggedDates.length === 0) {
    // Chưa có lịch sử gì — chuỗi 0, coi như đã "chốt" đến hôm qua.
    return { ...streak, currentStreak: 0, lastCountedDate: yesterday };
  }

  const firstDate = loggedDates.sort()[0];
  let current = 0;
  let longest = streak.longestStreak;

  // Đi từng ngày từ ngày có log đầu tiên đến hôm qua.
  // Ngày thiếu log nằm giữa cũng phải xét (nghỉ 5 ngày → 5 ngày 'broken').
  for (let date = firstDate; date <= yesterday; date = addDaysToDate(date, 1)) {
    const dayBlocks = scheduleBlocks.filter((b) => b.dayOfWeek === getDayOfWeek(date));
    // Ngày không có block HỌC nào (lịch trống / toàn nghỉ) → TRUNG LẬP:
    // bỏ qua, không tăng cũng không gãy chuỗi — nghỉ phép không bị phạt.
    if (!hasStudyBlocks(dayBlocks)) continue;
    const tier = finalTierForPastDay(dayLogs[date], dayBlocks);
    if (isSuccessTier(tier)) {
      current += 1;
      longest = Math.max(longest, current);
    } else if (tier === 'frozen') {
      // giữ nguyên chuỗi
    } else {
      current = 0;
    }
  }

  return { ...streak, currentStreak: current, longestStreak: longest, lastCountedDate: yesterday };
}

// Chuỗi HIỂN THỊ = chuỗi đã chốt + 1 nếu hôm nay đang đạt tier thành công.
// Hôm nay chưa chốt nên không ghi vào state — bỏ tick là tụt lại ngay.
export function displayStreak(reconciled: StreakState, todayTier: DayTier): number {
  return reconciled.currentStreak + (isSuccessTier(todayTier) ? 1 : 0);
}

// Reset freeze token về 2 khi sang tháng mới — KHÔNG cộng dồn.
export function resetFreezeTokensIfNewMonth(streak: StreakState, currentMonth: string): StreakState {
  if (streak.freezeTokensMonth === currentMonth) return streak;
  return {
    ...streak,
    freezeTokensRemaining: FREEZE_TOKENS_PER_MONTH,
    freezeTokensMonth: currentMonth,
  };
}

// Điều kiện dùng freeze token cho một ngày: trong quá khứ ≤7 ngày,
// còn token, và ngày đó đang ở tier 'broken'.
export function canUseFreezeToken(args: {
  date: string;
  today: string;
  streak: StreakState;
  dayLogs: Record<string, DayLog>;
  scheduleBlocks: ScheduleBlock[];
}): boolean {
  const { date, today, streak, dayLogs, scheduleBlocks } = args;
  if (date >= today) return false;
  if (daysBetween(date, today) > FREEZE_MAX_DAYS_BACK) return false;
  if (streak.freezeTokensRemaining <= 0) return false;
  const dayBlocks = scheduleBlocks.filter((b) => b.dayOfWeek === getDayOfWeek(date));
  // Ngày trống lịch đã trung lập với chuỗi → không cần (và không được) freeze.
  if (!hasStudyBlocks(dayBlocks)) return false;
  return finalTierForPastDay(dayLogs[date], dayBlocks) === 'broken';
}

// Điều kiện HUỶ freeze (gắn nhầm thì cứu được): ngày đó đang frozen và là
// ngày quá khứ. Huỷ xong ngày quay về tier tính từ blocks (thường là broken
// → chuỗi tụt lại) và token được hoàn lại.
export function canUnfreezeDay(log: DayLog | undefined, date: string, today: string): boolean {
  return log?.tier === 'frozen' && date < today;
}

// Các mốc thưởng chuỗi vừa chạm tới khi chuỗi hiển thị đi từ base → display.
export function crossedMilestones(baseStreak: number, display: number): number[] {
  return STREAK_MILESTONES.filter((m) => display >= m && baseStreak < m);
}
