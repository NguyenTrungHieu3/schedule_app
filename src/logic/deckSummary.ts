// Tóm tắt tiến độ 1 bộ thẻ (deck) — cho thẻ deck ở trang Học (số thẻ cần ôn +
// thanh tiến độ). Hàm thuần, không dính React/Supabase.
//
// KHÔNG tự tính lại due/overdue: tái dùng buildCardQueue (cardReview.ts) —
// một nguồn chân lý duy nhất cho "thẻ nào đến hạn hôm nay".

import type { CardReview } from './cardReview';
import { buildCardQueue } from './cardReview';

// intervalIndex >= 2 nghĩa là đã qua ít nhất 2 lần "Nhớ rõ" liên tiếp kể từ
// thẻ mới → khoảng ôn tiếp theo là INTERVALS[2] = 7 ngày. Coi đây là mốc
// "đã thuộc" để hiện thanh tiến độ (thẻ archived — hoàn thành hết SRS — dĩ
// nhiên cũng tính).
export const MASTERED_INTERVAL_INDEX = 2;

export interface DeckSummary {
  totalCount: number;
  dueCount: number; // quá hạn + đến hạn hôm nay (chưa archived)
  masteredCount: number;
  progressPercent: number; // 0-100, làm tròn; 0 nếu deck rỗng
}

export function summarizeDeckReviews(reviews: CardReview[], today: string): DeckSummary {
  const totalCount = reviews.length;
  const queue = buildCardQueue(reviews, today);
  const dueCount = queue.overdue.length + queue.dueToday.length;
  const masteredCount = reviews.filter((r) => r.archived || r.intervalIndex >= MASTERED_INTERVAL_INDEX).length;
  const progressPercent = totalCount === 0 ? 0 : Math.round((masteredCount / totalCount) * 100);
  return { totalCount, dueCount, masteredCount, progressPercent };
}
