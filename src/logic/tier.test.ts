// Test tính tier — các bẫy §4.2 + tiêu chí nghiệm thu §8.

import { describe, expect, it } from 'vitest';
import type { ScheduleBlock } from '../types';
import { computeTier } from './tier';
import { getLogicalDate } from './date';

function b(id: string, subject: ScheduleBlock['subject'], kind: ScheduleBlock['kind'], startTime: string, endTime: string): ScheduleBlock {
  return { id, dayOfWeek: 1, startTime, endTime, subject, kind, title: id, pomodoroCount: 0 };
}

describe('computeTier', () => {
  it('học 90 phút toàn TOEIC → KHÔNG đạt Ngày Tối thiểu', () => {
    const dayBlocks = [
      b('t1', 'toeic', 'deep', '07:00', '08:30'), // 90p
      b('p1', 'programming', 'deep', '09:00', '12:00'),
      b('j1', 'japanese', 'deep', '13:00', '16:00'),
    ];
    const tier = computeTier({ dayBlocks, completedBlockIds: ['t1'], isToday: false, frozen: false });
    expect(tier).toBe('broken');
  });

  it('30 phút mỗi môn × 3 môn → đạt Ngày Tối thiểu', () => {
    const dayBlocks = [
      b('t1', 'toeic', 'light', '07:00', '07:30'),
      b('p1', 'programming', 'light', '08:00', '08:30'),
      b('j1', 'japanese', 'light', '09:00', '09:30'),
      b('x', 'toeic', 'deep', '10:00', '20:00'), // block to chưa làm → rate thấp
    ];
    const tier = computeTier({ dayBlocks, completedBlockIds: ['t1', 'p1', 'j1'], isToday: false, frozen: false });
    expect(tier).toBe('minimum');
  });

  it('hôm nay chưa xong → pending, KHÔNG phải broken', () => {
    const dayBlocks = [b('t1', 'toeic', 'deep', '07:00', '09:00')];
    expect(computeTier({ dayBlocks, completedBlockIds: [], isToday: true, frozen: false })).toBe('pending');
    expect(computeTier({ dayBlocks, completedBlockIds: [], isToday: false, frozen: false })).toBe('broken');
  });

  it('ngưỡng theo tỉ lệ — ngày ngắn (CN) vẫn đúng: 90%+ = gold, 60%+ = silver', () => {
    const dayBlocks = [
      b('a', 'japanese', 'light', '08:00', '09:00'), // 60p
      b('c', 'japanese', 'light', '09:00', '09:40'), // 40p
    ];
    expect(computeTier({ dayBlocks, completedBlockIds: ['a', 'c'], isToday: false, frozen: false })).toBe('gold');
    expect(computeTier({ dayBlocks, completedBlockIds: ['a'], isToday: false, frozen: false })).toBe('silver');
  });

  it('block rest không tính vào tỉ lệ', () => {
    const dayBlocks = [
      b('a', 'toeic', 'deep', '07:00', '08:00'),
      b('r', null, 'rest', '08:00', '20:00'), // rest dài — không được kéo tỉ lệ xuống
    ];
    expect(computeTier({ dayBlocks, completedBlockIds: ['a'], isToday: false, frozen: false })).toBe('gold');
  });

  it('đã freeze → frozen bất kể tick gì', () => {
    const dayBlocks = [b('a', 'toeic', 'deep', '07:00', '08:00')];
    expect(computeTier({ dayBlocks, completedBlockIds: [], isToday: false, frozen: true })).toBe('frozen');
  });

  it('block qua nửa đêm (22:00–00:30 = 150p) tính đúng phút, không bị âm', () => {
    const dayBlocks = [
      b('a', 'toeic', 'deep', '22:00', '00:30'), // 150p qua nửa đêm
      b('c', 'toeic', 'deep', '20:00', '20:30'), // 30p bù đủ ngưỡng minimum
      b('p1', 'programming', 'deep', '09:00', '09:30'),
      b('j1', 'japanese', 'deep', '10:00', '10:30'),
    ];
    // Tick hết 90p qua nửa đêm + 30p còn lại của TOEIC + 2 môn kia đủ 30p
    // → completionRate = 100% → gold (nếu dùng minutesBetweenTimes sẽ ra âm/sai).
    expect(computeTier({ dayBlocks, completedBlockIds: ['a', 'c', 'p1', 'j1'], isToday: false, frozen: false })).toBe('gold');
  });
});

describe('getLogicalDate — ranh giới ngày 04:00 VN', () => {
  it('tick lúc 00:30 VN → vẫn tính vào ngày hôm trước', () => {
    // 2026-07-18T00:30 VN = 2026-07-17T17:30 UTC
    expect(getLogicalDate(new Date('2026-07-17T17:30:00Z'))).toBe('2026-07-17');
  });

  it('04:00 VN là ranh giới sang ngày mới', () => {
    // 03:59 VN → vẫn hôm trước; 04:01 VN → hôm nay
    expect(getLogicalDate(new Date('2026-07-17T20:59:00Z'))).toBe('2026-07-17');
    expect(getLogicalDate(new Date('2026-07-17T21:01:00Z'))).toBe('2026-07-18');
  });

  it('giữa ngày bình thường', () => {
    // 2026-07-18T10:00 VN = 03:00 UTC
    expect(getLogicalDate(new Date('2026-07-18T03:00:00Z'))).toBe('2026-07-18');
  });
});
