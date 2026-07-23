// Test sổ lỗi TOEIC (§4.5): lịch cố định [1, 7, 30], 3 lần "Đã nhớ" → resolved.

import { describe, expect, it } from 'vitest';
import { answerErrorEntry, createErrorEntry, dueErrorEntries, ERROR_INTERVALS } from './errorLog';
import type { ErrorEntry } from '../types';

function makeEntry(overrides: Partial<ErrorEntry> = {}): ErrorEntry {
  return {
    ...createErrorEntry({
      id: 'e1',
      part: 5,
      questionText: 'The report ___ yesterday.',
      myAnswer: 'A',
      correctAnswer: 'B',
      reason: 'bẫy ngữ pháp',
      createdOn: '2026-07-01',
    }),
    ...overrides,
  };
}

describe('createErrorEntry', () => {
  it('bắt đầu ở interval 0: ôn lại sau 1 ngày, chưa resolved', () => {
    const entry = makeEntry();
    expect(entry.intervalIndex).toBe(0);
    expect(entry.nextReviewDate).toBe('2026-07-02'); // 01/07 + 1 ngày
    expect(entry.resolved).toBe(false);
  });
});

describe('answerErrorEntry', () => {
  it('"Đã nhớ" lần 1 → lên interval 7 ngày, tính từ HÔM NAY', () => {
    const entry = makeEntry();
    const next = answerErrorEntry(entry, true, '2026-07-10');
    expect(next.intervalIndex).toBe(1);
    expect(next.nextReviewDate).toBe('2026-07-17'); // 10/07 + 7
    expect(next.resolved).toBe(false);
  });

  it('"Đã nhớ" đủ 3 lần (đi hết [1,7,30]) → resolved', () => {
    let entry = makeEntry();
    entry = answerErrorEntry(entry, true, '2026-07-02');
    entry = answerErrorEntry(entry, true, '2026-07-09');
    entry = answerErrorEntry(entry, true, '2026-08-08');
    expect(entry.resolved).toBe(true);
  });

  it('"Chưa nhớ" → quay về đầu lịch, ôn lại sau 1 ngày', () => {
    let entry = makeEntry();
    entry = answerErrorEntry(entry, true, '2026-07-02'); // lên index 1
    entry = answerErrorEntry(entry, false, '2026-07-09');
    expect(entry.intervalIndex).toBe(0);
    expect(entry.nextReviewDate).toBe('2026-07-10');
    expect(entry.resolved).toBe(false);
  });

  it('ERROR_INTERVALS đúng spec [1, 7, 30]', () => {
    expect(ERROR_INTERVALS).toEqual([1, 7, 30]);
  });
});

describe('dueErrorEntries', () => {
  it('chỉ lấy entry chưa resolved và đến hạn, xếp cũ nhất trước', () => {
    const overdue = makeEntry({ id: 'old', nextReviewDate: '2026-07-05' });
    const dueToday = makeEntry({ id: 'today', nextReviewDate: '2026-07-10' });
    const future = makeEntry({ id: 'future', nextReviewDate: '2026-07-20' });
    const resolved = makeEntry({ id: 'resolved', nextReviewDate: '2026-07-01', resolved: true });

    const due = dueErrorEntries([future, dueToday, resolved, overdue], '2026-07-10');
    expect(due.map((e) => e.id)).toEqual(['old', 'today']);
  });
});
