// Test tóm tắt tiến độ deck (số thẻ cần ôn + % đã thuộc) cho thẻ deck ở
// trang Học.

import { describe, expect, it } from 'vitest';
import { createCardReview } from './cardReview';
import { MASTERED_INTERVAL_INDEX, summarizeDeckReviews } from './deckSummary';

const TODAY = '2026-07-18';

describe('summarizeDeckReviews', () => {
  it('deck rỗng → totalCount 0, progressPercent 0, không chia cho 0', () => {
    const summary = summarizeDeckReviews([], TODAY);
    expect(summary).toEqual({ totalCount: 0, dueCount: 0, masteredCount: 0, progressPercent: 0 });
  });

  it('đếm đúng thẻ đến hạn (quá hạn + hôm nay), không tính thẻ tương lai', () => {
    const reviews = [
      { ...createCardReview('vocab', 'v1', TODAY), nextReviewDate: '2026-07-10' }, // quá hạn
      { ...createCardReview('vocab', 'v2', TODAY), nextReviewDate: TODAY }, // hôm nay
      { ...createCardReview('vocab', 'v3', TODAY), nextReviewDate: '2026-07-25' }, // tương lai
    ];
    const summary = summarizeDeckReviews(reviews, TODAY);
    expect(summary.totalCount).toBe(3);
    expect(summary.dueCount).toBe(2);
  });

  it('mastered = archived HOẶC intervalIndex đạt ngưỡng, còn lại chưa tính', () => {
    const reviews = [
      { ...createCardReview('vocab', 'v1', TODAY), intervalIndex: MASTERED_INTERVAL_INDEX, archived: false },
      { ...createCardReview('vocab', 'v2', TODAY), intervalIndex: 0, archived: true },
      { ...createCardReview('vocab', 'v3', TODAY), intervalIndex: MASTERED_INTERVAL_INDEX - 1, archived: false },
    ];
    const summary = summarizeDeckReviews(reviews, TODAY);
    expect(summary.masteredCount).toBe(2);
    expect(summary.progressPercent).toBe(67); // 2/3 làm tròn
  });

  it('thẻ mới (intervalIndex -1) không tính là mastered', () => {
    const summary = summarizeDeckReviews([createCardReview('vocab', 'v1', TODAY)], TODAY);
    expect(summary.masteredCount).toBe(0);
    expect(summary.progressPercent).toBe(0);
  });

  it('deck đã ôn hết (100% mastered)', () => {
    const reviews = [
      { ...createCardReview('vocab', 'v1', TODAY), archived: true },
      { ...createCardReview('vocab', 'v2', TODAY), archived: true },
    ];
    expect(summarizeDeckReviews(reviews, TODAY).progressPercent).toBe(100);
  });
});
