// Tính hạng ngày (tier) — theo §4.2 của spec. Hàm thuần, không dính React.
//
// Các bẫy đã được spec cảnh báo:
// 1. Hôm nay chưa xong → 'pending', KHÔNG phải 'broken'. Chỉ chốt 'broken'
//    khi ngày đó đã trôi qua.
// 2. 'minimum' đòi ≥30 phút MỖI môn trong CẢ 3 môn, không phải tổng 90 phút.
// 3. Không hardcode ngưỡng theo phút tuyệt đối — completionRate là tỉ lệ nên
//    Chủ nhật (ngày ngắn) vẫn tính đúng.

import type { DayTier, ScheduleBlock, Subject } from '../types';
import { blockDurationMinutes } from './date';

export const MINIMUM_MINUTES_PER_SUBJECT = 30;

// Ngày có block HỌC nào không? Ngày lịch trống / toàn block nghỉ là TRUNG LẬP
// với chuỗi (xem reconcileStreak): nghỉ phép, đổi lịch không bị trừng phạt
// bằng một ngày 'broken'. Block 'rest' không bao giờ tính là học.
export function hasStudyBlocks(dayBlocks: ScheduleBlock[]): boolean {
  return dayBlocks.some((b) => b.kind !== 'rest');
}

export interface DayStats {
  totalPlannedMinutes: number;
  totalCompletedMinutes: number;
  completionRate: number; // 0..1
  minutesBySubject: Record<Subject, number>;
}

// Thống kê một ngày từ danh sách block của ngày đó + các block đã tick.
// Block 'rest' không tính giờ (kể cả block 🌴 tick được).
export function computeDayStats(dayBlocks: ScheduleBlock[], completedBlockIds: string[]): DayStats {
  const completedSet = new Set(completedBlockIds);
  const minutesBySubject: Record<Subject, number> = { programming: 0, japanese: 0, toeic: 0 };
  let totalPlannedMinutes = 0;
  let totalCompletedMinutes = 0;

  for (const block of dayBlocks) {
    if (block.kind === 'rest') continue;
    // blockDurationMinutes (không phải minutesBetweenTimes) — hỗ trợ đúng block
    // qua nửa đêm (22:00–00:30), tránh phút kế hoạch bị âm/phình sai.
    const minutes = blockDurationMinutes(block.startTime, block.endTime);
    totalPlannedMinutes += minutes;
    if (completedSet.has(block.id)) {
      totalCompletedMinutes += minutes;
      if (block.subject !== null) {
        minutesBySubject[block.subject] += minutes;
      }
    }
  }

  return {
    totalPlannedMinutes,
    totalCompletedMinutes,
    // Ngày không có block học nào (lịch trống) thì coi như 0 để tránh chia 0.
    completionRate: totalPlannedMinutes === 0 ? 0 : totalCompletedMinutes / totalPlannedMinutes,
    minutesBySubject,
  };
}

export function computeTier(args: {
  dayBlocks: ScheduleBlock[];
  completedBlockIds: string[];
  isToday: boolean; // ngày đang xét có phải hôm nay (ngày logic) không
  frozen: boolean; // đã dùng freeze token cho ngày này chưa
}): DayTier {
  const { dayBlocks, completedBlockIds, isToday, frozen } = args;

  if (frozen) return 'frozen';

  const stats = computeDayStats(dayBlocks, completedBlockIds);

  if (stats.completionRate >= 0.9) return 'gold';
  if (stats.completionRate >= 0.6) return 'silver';

  const allSubjectsReachedMinimum = (['programming', 'japanese', 'toeic'] as Subject[]).every(
    (subject) => stats.minutesBySubject[subject] >= MINIMUM_MINUTES_PER_SUBJECT,
  );
  if (allSubjectsReachedMinimum) return 'minimum';

  // Hôm nay còn đang diễn ra — chưa được phép kết luận 'broken'.
  if (isToday) return 'pending';

  return 'broken';
}
