// Ranh giới ngày logic — theo §4.1 của spec.
//
// Tại sao không dùng nửa đêm: người dùng học đến 22–23h và đôi khi muộn hơn.
// Nếu ngày reset lúc 00:00 thì tick task lúc 00:15 sẽ tính sang hôm sau và
// làm đứt chuỗi oan. Vì vậy ngày logic bắt đầu lúc 04:00 giờ Việt Nam.
//
// MỌI chỗ cần "hôm nay" trong codebase phải gọi getLogicalDate().
// Cấm gọi new Date().toISOString().slice(0,10) ở bất kỳ đâu.

import { format, subHours, addDays, parseISO, differenceInCalendarDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

export const VN_TIMEZONE = 'Asia/Ho_Chi_Minh';

export function getLogicalDate(now: Date = new Date()): string {
  const vn = toZonedTime(now, VN_TIMEZONE);
  const shifted = subHours(vn, 4);
  return format(shifted, 'yyyy-MM-dd');
}

// "2026-07" — dùng cho việc reset freeze token mỗi tháng.
export function getLogicalMonth(now: Date = new Date()): string {
  return getLogicalDate(now).slice(0, 7);
}

// Thứ trong tuần của một ngày logic (0 = Chủ nhật) — để chọn lịch trong template.
export function getDayOfWeek(logicalDate: string): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  return parseISO(logicalDate).getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

// Cộng n ngày vào một ngày logic dạng "yyyy-MM-dd".
export function addDaysToDate(logicalDate: string, days: number): string {
  return format(addDays(parseISO(logicalDate), days), 'yyyy-MM-dd');
}

// Số ngày giữa hai ngày logic (b - a).
export function daysBetween(a: string, b: string): number {
  return differenceInCalendarDays(parseISO(b), parseISO(a));
}

// Số phút giữa "HH:mm" → dùng để tính thời lượng block.
export function minutesBetweenTimes(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  return eh * 60 + em - (sh * 60 + sm);
}

// Độ dài block trên trục NGÀY LOGIC — khác minutesBetweenTimes ở chỗ
// HỖ TRỢ block qua nửa đêm (22:00–00:30 = 150 phút, vì giờ < 04:00 được +24h).
// Nhập ngược rõ ràng (09:00–07:00) vẫn ra âm → form vẫn chặn được.
export function blockDurationMinutes(startTime: string, endTime: string): number {
  return timeToLogicalMinutes(endTime) - timeToLogicalMinutes(startTime);
}

// Hai khung giờ có chồng nhau trên trục ngày logic không?
// Dùng cho cảnh báo block chồng giờ trong Cài đặt (chồng giờ làm phút học
// bị tính trùng → completionRate thấp oan).
export function timeRangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  const a1 = timeToLogicalMinutes(aStart);
  const a2 = a1 + blockDurationMinutes(aStart, aEnd);
  const b1 = timeToLogicalMinutes(bStart);
  const b2 = b1 + blockDurationMinutes(bStart, bEnd);
  return a1 < b2 && b1 < a2;
}

// "HH:mm" → số phút trên trục NGÀY LOGIC (04:00 → 28:00).
// Giờ trước 04:00 sáng thuộc về ngày logic hôm trước nên cộng thêm 24h,
// nhờ vậy so sánh "block đã qua giờ chưa" lúc 00:30 vẫn đúng.
export function timeToLogicalMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  const minutes = h * 60 + m;
  return h < 4 ? minutes + 24 * 60 : minutes;
}

// Phút hiện tại (giờ VN) trên cùng trục ngày logic — để so với giờ block.
export function getNowLogicalMinutes(now: Date = new Date()): number {
  const vn = toZonedTime(now, VN_TIMEZONE);
  return timeToLogicalMinutes(format(vn, 'HH:mm'));
}
