// Test SRS cho thẻ học (mảnh "Học") — cùng quy tắc good/hard/again với
// logic/srs.ts, cộng thêm mastery theo kỹ năng.

import { describe, expect, it } from 'vitest';
import { INTERVALS, QUEUE_DAILY_CAP } from './srs';
import { answerCardReview, buildCardQueue, createCardReview, type CardReview } from './cardReview';

const TODAY = '2026-07-18';

describe('createCardReview', () => {
  it('thẻ mới đến hạn NGAY hôm nay (khác ReviewItem dời sang mai)', () => {
    const card = createCardReview('vocab', 'v1', TODAY);
    expect(card.nextReviewDate).toBe(TODAY);
    expect(card.intervalIndex).toBe(-1);
    expect(card.archived).toBe(false);
  });
});

describe('answerCardReview', () => {
  it('"Nhớ rõ" (good) lần đầu (intervalIndex -1) → sang INTERVALS[0], đánh dấu mastery', () => {
    const card = createCardReview('kanji', 'k1', '2026-07-01');
    const after = answerCardReview(card, 'good', 'recognition', TODAY);
    expect(after.intervalIndex).toBe(0);
    expect(after.nextReviewDate).toBe('2026-07-19'); // +1 ngày (INTERVALS[0])
    expect(after.mastery.recognition).toBe(true);
  });

  it('"Nhớ rõ" liên tiếp → tăng dần khoảng; vượt cuối mảng → archived', () => {
    let card = createCardReview('vocab', 'v1', '2026-07-01');
    // Bắt đầu từ intervalIndex -1 (thẻ mới) nên cần INTERVALS.length + 1 lần
    // "good" mới chạm cuối mảng và archive (khác ReviewItem bắt đầu từ 0).
    for (let i = 0; i <= INTERVALS.length; i++) {
      card = answerCardReview(card, 'good', 'recall', TODAY);
    }
    expect(card.archived).toBe(true);
  });

  it('"Quên hẳn" (again) → về intervalIndex 0, ôn lại sau 1 ngày, KHÔNG đánh mastery', () => {
    const card: CardReview = { ...createCardReview('vocab', 'v1', '2026-07-01'), intervalIndex: 3 };
    const after = answerCardReview(card, 'again', 'recall', TODAY);
    expect(after.intervalIndex).toBe(0);
    expect(after.nextReviewDate).toBe('2026-07-19');
    expect(after.mastery.recall).toBeUndefined();
  });

  it('"Hơi quên" (hard) giữ nguyên khoảng khi đã có vị trí', () => {
    const card: CardReview = { ...createCardReview('vocab', 'v1', '2026-07-01'), intervalIndex: 2 };
    const after = answerCardReview(card, 'hard', 'recall', TODAY);
    expect(after.intervalIndex).toBe(2);
    expect(after.nextReviewDate).toBe('2026-07-25'); // +7 ngày (INTERVALS[2])
  });

  it('"Hơi quên" trên thẻ MỚI (intervalIndex -1) không vỡ mảng — xử lý như again', () => {
    const card = createCardReview('vocab', 'v1', TODAY);
    const after = answerCardReview(card, 'hard', 'recall', TODAY);
    expect(after.intervalIndex).toBe(0);
    expect(after.nextReviewDate).toBe('2026-07-19');
  });

  it('mastery của các kỹ năng khác nhau tích luỹ độc lập, không ghi đè nhau', () => {
    let card = createCardReview('vocab', 'v1', '2026-07-01');
    card = answerCardReview(card, 'good', 'recognition', TODAY);
    card = answerCardReview(card, 'good', 'listening', TODAY);
    expect(card.mastery).toEqual({ recognition: true, listening: true });
  });
});

describe('buildCardQueue', () => {
  it('hàng đợi 200 thẻ → chỉ hiện tối đa QUEUE_DAILY_CAP, quá hạn lâu nhất trước', () => {
    const reviews: CardReview[] = [];
    for (let i = 0; i < 200; i++) {
      reviews.push({
        ...createCardReview('vocab', `v${i}`, '2026-06-01'),
        intervalIndex: 0,
        nextReviewDate: i < 100 ? '2026-07-10' : TODAY,
      });
    }
    const queue = buildCardQueue(reviews, TODAY);
    expect(queue.visible.length).toBe(QUEUE_DAILY_CAP);
    expect(queue.hiddenCount).toBe(160);
    expect(queue.visible[0].nextReviewDate).toBe('2026-07-10');
  });

  it('thẻ archived không xuất hiện trong hàng đợi', () => {
    const reviews: CardReview[] = [
      { ...createCardReview('vocab', 'v1', TODAY), archived: true },
      createCardReview('vocab', 'v2', TODAY),
    ];
    const queue = buildCardQueue(reviews, TODAY);
    expect(queue.dueToday.map((r) => r.itemId)).toEqual(['v2']);
  });
});
