// Unit test cho logic chuỗi — các case bắt buộc ở §4.3 của spec.

import { describe, expect, it } from 'vitest';
import type { DayLog, ScheduleBlock, StreakState } from '../types';
import {
  canUnfreezeDay,
  canUseFreezeToken,
  crossedMilestones,
  displayStreak,
  reconcileStreak,
  resetFreezeTokensIfNewMonth,
} from './streak';

// Lịch giả: mỗi ngày trong tuần có 3 block deep 1 tiếng, mỗi môn một block.
// → tick cả 3 = 100% (gold); tick 2 = 66% (silver); tick 0 = broken.
const blocks: ScheduleBlock[] = [];
for (let day = 0 as 0 | 1 | 2 | 3 | 4 | 5 | 6; day <= 6; day++) {
  blocks.push(
    { id: `b-${day}-prog`, dayOfWeek: day, startTime: '08:00', endTime: '09:00', subject: 'programming', kind: 'deep', title: 'Code', pomodoroCount: 1 },
    { id: `b-${day}-jp`, dayOfWeek: day, startTime: '09:00', endTime: '10:00', subject: 'japanese', kind: 'deep', title: 'Nhật', pomodoroCount: 1 },
    { id: `b-${day}-toeic`, dayOfWeek: day, startTime: '10:00', endTime: '11:00', subject: 'toeic', kind: 'deep', title: 'TOEIC', pomodoroCount: 1 },
  );
}

function goldLog(date: string): DayLog {
  const day = new Date(date + 'T00:00:00').getDay();
  return {
    date,
    completedBlockIds: [`b-${day}-prog`, `b-${day}-jp`, `b-${day}-toeic`],
    minutesBySubject: { programming: 60, japanese: 60, toeic: 60 },
    pomodorosCompleted: 3,
    tier: 'pending', // cố tình lưu dở — reconcile phải tự tính lại
  };
}

function freshStreak(): StreakState {
  return {
    currentStreak: 0,
    longestStreak: 0,
    lastCountedDate: null,
    freezeTokensRemaining: 2,
    freezeTokensMonth: '2026-07',
  };
}

const TODAY = '2026-07-18';

describe('reconcileStreak', () => {
  it('chuỗi liên tục 3 ngày → 3', () => {
    const dayLogs = {
      '2026-07-15': goldLog('2026-07-15'),
      '2026-07-16': goldLog('2026-07-16'),
      '2026-07-17': goldLog('2026-07-17'),
    };
    const result = reconcileStreak({ streak: freshStreak(), dayLogs, scheduleBlocks: blocks, today: TODAY });
    expect(result.currentStreak).toBe(3);
    expect(result.longestStreak).toBe(3);
    expect(result.lastCountedDate).toBe('2026-07-17');
  });

  it('nghỉ 1 ngày (không có log) → chuỗi về 0', () => {
    const dayLogs = {
      '2026-07-15': goldLog('2026-07-15'),
      '2026-07-16': goldLog('2026-07-16'),
      // 17/07 không có log
    };
    const result = reconcileStreak({ streak: freshStreak(), dayLogs, scheduleBlocks: blocks, today: TODAY });
    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(2); // chuỗi dài nhất vẫn giữ
  });

  it('nghỉ 5 ngày → chuỗi về 0, không crash', () => {
    const dayLogs = { '2026-07-12': goldLog('2026-07-12') };
    const result = reconcileStreak({ streak: freshStreak(), dayLogs, scheduleBlocks: blocks, today: TODAY });
    expect(result.currentStreak).toBe(0);
  });

  it('dùng freeze cho ngày đứt → chuỗi được nối', () => {
    const dayLogs: Record<string, DayLog> = {
      '2026-07-15': goldLog('2026-07-15'),
      '2026-07-16': { ...goldLog('2026-07-16'), completedBlockIds: [], tier: 'frozen' },
      '2026-07-17': goldLog('2026-07-17'),
    };
    const result = reconcileStreak({ streak: freshStreak(), dayLogs, scheduleBlocks: blocks, today: TODAY });
    // 15 (+1) → 16 frozen (giữ) → 17 (+1) = 2
    expect(result.currentStreak).toBe(2);
  });

  it('dùng freeze rồi lại nghỉ tiếp → ngày nghỉ sau freeze vẫn làm đứt', () => {
    const dayLogs: Record<string, DayLog> = {
      '2026-07-14': goldLog('2026-07-14'),
      '2026-07-15': { ...goldLog('2026-07-15'), completedBlockIds: [], tier: 'frozen' },
      // 16, 17 không có log → broken
    };
    const result = reconcileStreak({ streak: freshStreak(), dayLogs, scheduleBlocks: blocks, today: TODAY });
    expect(result.currentStreak).toBe(0);
  });

  it('mở app sau 2 tháng không dùng → chuỗi 0, không crash, log cũ còn nguyên', () => {
    const dayLogs = {
      '2026-05-10': goldLog('2026-05-10'),
      '2026-05-11': goldLog('2026-05-11'),
    };
    const result = reconcileStreak({ streak: freshStreak(), dayLogs, scheduleBlocks: blocks, today: TODAY });
    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(2);
    expect(dayLogs['2026-05-10']).toBeDefined();
  });

  it('không có lịch sử gì → chuỗi 0', () => {
    const result = reconcileStreak({ streak: freshStreak(), dayLogs: {}, scheduleBlocks: blocks, today: TODAY });
    expect(result.currentStreak).toBe(0);
    expect(result.lastCountedDate).toBe('2026-07-17');
  });
});

describe('displayStreak', () => {
  it('hôm nay đạt minimum → +1; chưa đạt → giữ nguyên', () => {
    const base = { ...freshStreak(), currentStreak: 4 };
    expect(displayStreak(base, 'minimum')).toBe(5);
    expect(displayStreak(base, 'gold')).toBe(5);
    expect(displayStreak(base, 'pending')).toBe(4);
    expect(displayStreak(base, 'broken')).toBe(4);
  });
});

describe('freeze token', () => {
  it('sang tháng mới → reset về 2, không cộng dồn', () => {
    const s = { ...freshStreak(), freezeTokensRemaining: 0, freezeTokensMonth: '2026-06' };
    const result = resetFreezeTokensIfNewMonth(s, '2026-07');
    expect(result.freezeTokensRemaining).toBe(2);
    expect(result.freezeTokensMonth).toBe('2026-07');
    // cùng tháng → giữ nguyên (2 token còn 1 vẫn là 1)
    const same = resetFreezeTokensIfNewMonth({ ...result, freezeTokensRemaining: 1 }, '2026-07');
    expect(same.freezeTokensRemaining).toBe(1);
  });

  it('chỉ dùng được cho ngày broken trong quá khứ ≤7 ngày và còn token', () => {
    const streak = freshStreak();
    const dayLogs = { '2026-07-15': goldLog('2026-07-15') };
    const base = { today: TODAY, streak, dayLogs, scheduleBlocks: blocks };

    expect(canUseFreezeToken({ ...base, date: '2026-07-16' })).toBe(true); // không log → broken
    expect(canUseFreezeToken({ ...base, date: '2026-07-15' })).toBe(false); // ngày gold
    expect(canUseFreezeToken({ ...base, date: '2026-07-18' })).toBe(false); // hôm nay
    expect(canUseFreezeToken({ ...base, date: '2026-07-10' })).toBe(false); // quá 7 ngày
    expect(
      canUseFreezeToken({ ...base, date: '2026-07-16', streak: { ...streak, freezeTokensRemaining: 0 } }),
    ).toBe(false); // hết token
  });
});

describe('crossedMilestones', () => {
  it('chạm đúng mốc mới trả về mốc đó', () => {
    expect(crossedMilestones(6, 7)).toEqual([7]);
    expect(crossedMilestones(7, 7)).toEqual([]);
    expect(crossedMilestones(13, 14)).toEqual([14]);
    expect(crossedMilestones(0, 1)).toEqual([]);
  });
});

describe('ngày trống lịch (không block HỌC nào) — trung lập với chuỗi', () => {
  // Lịch thưa: chỉ thứ 4 và thứ 6 có block; thứ 5 (16/07) trống hoàn toàn.
  const sparseBlocks = blocks.filter((b) => b.dayOfWeek === 3 || b.dayOfWeek === 5);

  it('ngày trống lịch nằm giữa chuỗi → chuỗi KHÔNG gãy (nghỉ phép không bị phạt)', () => {
    const dayLogs = {
      '2026-07-15': goldLog('2026-07-15'), // T4 — có block, gold
      // 16/07 (T5) trống lịch, không log
      '2026-07-17': goldLog('2026-07-17'), // T6 — có block, gold
    };
    const result = reconcileStreak({ streak: freshStreak(), dayLogs, scheduleBlocks: sparseBlocks, today: TODAY });
    expect(result.currentStreak).toBe(2);
  });

  it('ngày CÓ block mà bỏ trống → vẫn gãy như cũ', () => {
    const dayLogs = { '2026-07-15': goldLog('2026-07-15') };
    // 16/07 trống lịch (bỏ qua), nhưng 17/07 (T6) có block mà không log → broken
    const result = reconcileStreak({ streak: freshStreak(), dayLogs, scheduleBlocks: sparseBlocks, today: TODAY });
    expect(result.currentStreak).toBe(0);
  });

  it('canUseFreezeToken: ngày trống lịch → không cần freeze, nút freeze ẩn', () => {
    expect(
      canUseFreezeToken({ date: '2026-07-16', today: TODAY, streak: freshStreak(), dayLogs: {}, scheduleBlocks: sparseBlocks }),
    ).toBe(false);
    // Ngày có block mà broken thì vẫn freeze được như cũ
    expect(
      canUseFreezeToken({ date: '2026-07-17', today: TODAY, streak: freshStreak(), dayLogs: {}, scheduleBlocks: sparseBlocks }),
    ).toBe(true);
  });
});

describe('canUnfreezeDay — điều kiện HUỶ freeze (bấm nhầm thì cứu được)', () => {
  const frozenLog: DayLog = { ...goldLog('2026-07-16'), tier: 'frozen' };

  it('ngày quá khứ đang frozen → được huỷ', () => {
    expect(canUnfreezeDay(frozenLog, '2026-07-16', TODAY)).toBe(true);
  });

  it('ngày không frozen / không có log → không được huỷ', () => {
    expect(canUnfreezeDay(goldLog('2026-07-15'), '2026-07-15', TODAY)).toBe(false);
    expect(canUnfreezeDay(undefined, '2026-07-16', TODAY)).toBe(false);
  });

  it('hôm nay hoặc tương lai → không được huỷ (freeze chỉ gắn cho quá khứ)', () => {
    expect(canUnfreezeDay(frozenLog, '2026-07-18', TODAY)).toBe(false);
    expect(canUnfreezeDay(frozenLog, '2026-07-19', TODAY)).toBe(false);
  });
});
