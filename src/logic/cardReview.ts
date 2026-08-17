// SRS cho thẻ học (flashcard vocab/kanji/sentence) — mảnh "Học" mở rộng từ Chăm.
//
// KHÔNG tự chép lại bảng khoảng cách ôn tập: import INTERVALS/QUEUE_DAILY_CAP
// từ logic/srs.ts (nguồn chân lý duy nhất) — nếu sau này tinh chỉnh lịch ôn,
// sửa một chỗ là đủ cho cả "Ôn tập" (ReviewItem) lẫn "Học" (CardReview).
//
// Khác ReviewItem ở chỗ: một thẻ có 4 MỨC ĐỘ thành thạo độc lập (nhìn hiểu,
// tự nhớ, nghe ra, phát âm đúng) — mastery chỉ là cờ "đã từng làm đúng ở mức
// này" để hiện badge tiến độ, KHÔNG phải 4 lịch ôn riêng (quá phức tạp cho
// M1 — thêm khi thật sự cần).

import type { ReviewResult } from '../types';
import { addDaysToDate } from './date';
import { INTERVALS, QUEUE_DAILY_CAP } from './srs';

export type CardItemType = 'vocab' | 'kanji' | 'sentence';
export type MasterySkill = 'recognition' | 'recall' | 'listening' | 'speaking';

export type CardMastery = Partial<Record<MasterySkill, boolean>>;

export interface CardReview {
  itemType: CardItemType;
  itemId: string;
  intervalIndex: number; // -1 = thẻ mới, chưa từng ôn (trỏ vào INTERVALS sau lần ôn đầu)
  nextReviewDate: string;
  mastery: CardMastery;
  history: { date: string; result: ReviewResult }[];
  archived: boolean;
}

// Thẻ mới thêm vào deck — ĐẾN HẠN NGAY (khác ReviewItem.createReviewItem vốn
// giả định vừa học xong nên lần ôn đầu dời sang mai). Flashcard mới phải hiện
// trong hàng đợi hôm nay để người dùng gặp nó lần đầu.
export function createCardReview(itemType: CardItemType, itemId: string, today: string): CardReview {
  return { itemType, itemId, intervalIndex: -1, nextReviewDate: today, mastery: {}, history: [], archived: false };
}

// Xử lý kết quả một lần ôn — cùng quy tắc good/hard/again như answerReviewItem
// (srs.ts), cộng thêm cập nhật cờ mastery cho kỹ năng vừa test.
export function answerCardReview(review: CardReview, result: ReviewResult, skill: MasterySkill, today: string): CardReview {
  let intervalIndex = review.intervalIndex;
  let archived = review.archived;
  let mastery = review.mastery;

  if (result === 'good') {
    mastery = { ...mastery, [skill]: true };
    if (intervalIndex + 1 >= INTERVALS.length) {
      archived = true;
    } else {
      intervalIndex += 1;
    }
  } else if (result === 'again') {
    intervalIndex = 0;
  } else {
    // 'hard': giữ nguyên vị trí. Thẻ MỚI (intervalIndex -1) chưa có "vị trí
    // hiện tại" trong INTERVALS nên xử lý như again — ôn lại sau 1 ngày.
    intervalIndex = Math.max(intervalIndex, 0);
  }

  return {
    ...review,
    intervalIndex,
    archived,
    mastery,
    nextReviewDate: addDaysToDate(today, INTERVALS[intervalIndex]),
    history: [...review.history, { date: today, result }],
  };
}

export interface CardQueue {
  overdue: CardReview[];
  dueToday: CardReview[];
  upcoming: CardReview[]; // 7 ngày tới
  visible: CardReview[]; // tối đa QUEUE_DAILY_CAP, ưu tiên cao nhất
  hiddenCount: number;
}

// Giống hệt buildReviewQueue (srs.ts) nhưng trên CardReview — xem đó để biết
// vì sao chống ngợp bằng cách giấu số lượng thật thay vì đập vào mặt người dùng.
export function buildCardQueue(reviews: CardReview[], today: string): CardQueue {
  const active = reviews.filter((r) => !r.archived);

  const overdue = active
    .filter((r) => r.nextReviewDate < today)
    .sort((a, b) => a.nextReviewDate.localeCompare(b.nextReviewDate));
  const dueToday = active.filter((r) => r.nextReviewDate === today);
  const upcoming = active
    .filter((r) => r.nextReviewDate > today && r.nextReviewDate <= addDaysToDate(today, 7))
    .sort((a, b) => a.nextReviewDate.localeCompare(b.nextReviewDate));

  const all = [...overdue, ...dueToday];
  const visible = all.slice(0, QUEUE_DAILY_CAP);

  return { overdue, dueToday, upcoming, visible, hiddenCount: Math.max(0, all.length - QUEUE_DAILY_CAP) };
}
