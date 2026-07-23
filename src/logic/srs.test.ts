// Test SRS §4.4 + sổ lỗi §4.5 + bốc thưởng §4.6 (tiêu chí §8).

import { describe, expect, it } from 'vitest';
import type { ReviewItem, RewardSlip } from '../types';
import { answerReviewItem, buildReviewQueue, createReviewItem, INTERVALS, QUEUE_DAILY_CAP } from './srs';
import { answerErrorEntry, createErrorEntry } from './errorLog';
import { drawSlip } from './reward';

const TODAY = '2026-07-18';

describe('SRS', () => {
  it('thêm bài hôm nay → hiện lại sau 1 ngày', () => {
    const item = createReviewItem({ id: 'x', subject: 'japanese', title: 'Kanji 12', learnedOn: TODAY });
    expect(item.nextReviewDate).toBe('2026-07-19');
  });

  it('"Quên hẳn" (again) → xuất hiện lại đúng ngày mai', () => {
    let item = createReviewItem({ id: 'x', subject: 'toeic', title: 'Part 5', learnedOn: '2026-07-01' });
    item = { ...item, intervalIndex: 3 };
    const after = answerReviewItem(item, 'again', TODAY);
    expect(after.intervalIndex).toBe(0);
    expect(after.nextReviewDate).toBe('2026-07-19');
  });

  it('"Nhớ rõ" (good) → tăng khoảng; vượt cuối mảng → archived', () => {
    let item = createReviewItem({ id: 'x', subject: 'programming', title: 'useEffect', learnedOn: '2026-07-01' });
    const after = answerReviewItem(item, 'good', TODAY);
    expect(after.intervalIndex).toBe(1);
    expect(after.nextReviewDate).toBe('2026-07-21'); // +3 ngày

    const atEnd = { ...item, intervalIndex: INTERVALS.length - 1 };
    expect(answerReviewItem(atEnd, 'good', TODAY).archived).toBe(true);
  });

  it('"Hơi quên" (hard) → giữ nguyên khoảng', () => {
    const item = { ...createReviewItem({ id: 'x', subject: 'toeic', title: 'y', learnedOn: '2026-07-01' }), intervalIndex: 2 };
    const after = answerReviewItem(item, 'hard', TODAY);
    expect(after.intervalIndex).toBe(2);
    expect(after.nextReviewDate).toBe('2026-07-25'); // +7 ngày
  });

  it('hàng đợi 200 item → chỉ hiện 40, quá hạn lâu nhất trước', () => {
    const items: ReviewItem[] = [];
    for (let i = 0; i < 200; i++) {
      items.push({
        ...createReviewItem({ id: `i${i}`, subject: 'toeic', title: `item ${i}`, learnedOn: '2026-06-01' }),
        nextReviewDate: i < 100 ? '2026-07-10' : TODAY,
      });
    }
    const queue = buildReviewQueue(items, TODAY);
    expect(queue.visible.length).toBe(QUEUE_DAILY_CAP);
    expect(queue.hiddenCount).toBe(160);
    expect(queue.visible[0].nextReviewDate).toBe('2026-07-10'); // quá hạn trước
  });
});

describe('Sổ lỗi TOEIC', () => {
  const entry = createErrorEntry({
    id: 'e1', part: 5, questionText: 'q', myAnswer: 'A', correctAnswer: 'B',
    reason: 'bẫy ngữ pháp', createdOn: '2026-07-10',
  });

  it('lịch cố định [1,7,30]', () => {
    expect(entry.nextReviewDate).toBe('2026-07-11');
    const first = answerErrorEntry(entry, true, TODAY);
    expect(first.nextReviewDate).toBe('2026-07-25'); // +7
    const second = answerErrorEntry(first, true, TODAY);
    expect(second.nextReviewDate).toBe('2026-08-17'); // +30
    const third = answerErrorEntry(second, true, TODAY);
    expect(third.resolved).toBe(true);
  });

  it('chưa nhớ → quay về đầu lịch', () => {
    const failed = answerErrorEntry({ ...entry, intervalIndex: 2 }, false, TODAY);
    expect(failed.intervalIndex).toBe(0);
    expect(failed.nextReviewDate).toBe('2026-07-19');
  });
});

describe('drawSlip — bốc đều trên pool, không pity system', () => {
  it('bốc 10000 lần → tỉ lệ xấp xỉ thành phần pool', () => {
    const slips: RewardSlip[] = [];
    for (let i = 0; i < 7; i++) slips.push({ id: `r${i}`, box: 'small', type: 'reward', text: 'r', enabled: true });
    for (let i = 0; i < 2; i++) slips.push({ id: `n${i}`, box: 'small', type: 'neutral', text: 'n', enabled: true });
    slips.push({ id: 'p0', box: 'small', type: 'penalty', text: 'p', enabled: true });

    const counts = { reward: 0, neutral: 0, penalty: 0 };
    for (let i = 0; i < 10000; i++) {
      const s = drawSlip('small', slips);
      counts[s!.type] += 1;
    }
    // 70/20/10 ± 3 điểm phần trăm
    expect(counts.reward / 10000).toBeGreaterThan(0.67);
    expect(counts.reward / 10000).toBeLessThan(0.73);
    expect(counts.penalty / 10000).toBeGreaterThan(0.07);
    expect(counts.penalty / 10000).toBeLessThan(0.13);
  });

  it('bỏ qua giấy disabled và giấy khác hộp', () => {
    const slips: RewardSlip[] = [
      { id: 'a', box: 'small', type: 'reward', text: 'a', enabled: false },
      { id: 'b', box: 'big', type: 'reward', text: 'b', enabled: true },
      { id: 'c', box: 'small', type: 'reward', text: 'c', enabled: true },
    ];
    for (let i = 0; i < 50; i++) {
      expect(drawSlip('small', slips)!.id).toBe('c');
    }
    expect(drawSlip('big', slips)!.id).toBe('b');
  });
});
