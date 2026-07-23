// Test hộp phần thưởng (§4.6) — đặc biệt là cơ chế cấp/thu hồi lượt bốc (grant),
// nơi dễ sai nhất của hệ thống.

import { describe, expect, it } from 'vitest';
import {
  countAvailable,
  drawSlip,
  EMPTY_PENDING_REWARDS,
  expectedGrantKeysForDay,
  poolComposition,
  revokeStaleGrantsForDay,
  syncGrantsForDay,
  type PendingRewards,
} from './reward';
import type { DayLog, RewardSlip, ScheduleBlock } from '../types';

const DATE = '2026-07-18'; // Thứ 7
const NOW = '2026-07-18T10:00:00.000Z';

function makeBlock(overrides: Partial<ScheduleBlock> = {}): ScheduleBlock {
  return {
    id: 'b1',
    dayOfWeek: 6,
    startTime: '07:00',
    endTime: '09:00',
    subject: 'toeic',
    kind: 'deep',
    title: 'TOEIC Reading',
    pomodoroCount: 2,
    ...overrides,
  };
}

function makeLog(completedBlockIds: string[]): DayLog {
  return {
    date: DATE,
    completedBlockIds,
    minutesBySubject: { programming: 0, japanese: 0, toeic: 0 },
    pomodorosCompleted: 0,
    tier: 'pending',
  };
}

describe('drawSlip — bốc ĐỀU trên pool, không pity system', () => {
  const slips: RewardSlip[] = [
    { id: 's1', box: 'small', type: 'reward', text: 'Kem', enabled: true },
    { id: 's2', box: 'small', type: 'penalty', text: 'Hít đất', enabled: false }, // tắt
    { id: 'b1', box: 'big', type: 'reward', text: 'Trà sữa', enabled: true },
  ];

  it('chỉ bốc trong đúng hộp và chỉ giấy đang bật', () => {
    for (let i = 0; i < 50; i++) {
      expect(drawSlip('small', slips)?.id).toBe('s1'); // s2 bị tắt
      expect(drawSlip('big', slips)?.id).toBe('b1');
    }
  });

  it('pool rỗng → null (không crash, không tiêu lượt)', () => {
    expect(drawSlip('small', [])).toBeNull();
  });
});

describe('expectedGrantKeysForDay — lượt bốc mà trạng thái ngày đáng lẽ cấp', () => {
  const deep = makeBlock({ id: 'deep1', kind: 'deep' });
  const light = makeBlock({ id: 'light1', kind: 'light' });
  const classBlock = makeBlock({ id: 'class1', kind: 'class' });
  const mock = makeBlock({ id: 'mock1', kind: 'deep', grantsBigBox: true });

  it('block deep/light đã tick → 1 lượt hộp nhỏ mỗi block; chưa tick → không', () => {
    const keys = expectedGrantKeysForDay({
      date: DATE,
      dayBlocks: [deep, light, classBlock],
      log: makeLog(['deep1', 'class1']), // class không cấp lượt
      todayTier: 'silver',
      baseStreak: 3,
    });
    expect(keys).toEqual([{ key: `small:${DATE}:deep1`, box: 'small' }]);
  });

  it('block grantsBigBox đã tick → thêm lượt hộp lớn mock', () => {
    const keys = expectedGrantKeysForDay({
      date: DATE,
      dayBlocks: [mock],
      log: makeLog(['mock1']),
      todayTier: 'pending',
      baseStreak: 0,
    });
    expect(keys).toContainEqual({ key: `big:mock:${DATE}:mock1`, box: 'big' });
  });

  it('Ngày Vàng → lượt hộp lớn gold', () => {
    const keys = expectedGrantKeysForDay({
      date: DATE,
      dayBlocks: [deep],
      log: makeLog(['deep1']),
      todayTier: 'gold',
      baseStreak: 2,
    });
    expect(keys).toContainEqual({ key: `big:gold:${DATE}`, box: 'big' });
  });

  it('chạm mốc chuỗi → lượt hộp lớn milestone; mốc 14 được 2 lượt', () => {
    const at7 = expectedGrantKeysForDay({
      date: DATE,
      dayBlocks: [],
      log: makeLog([]),
      todayTier: 'silver',
      baseStreak: 6, // display = 7 → chạm mốc 7
    });
    expect(at7).toEqual([{ key: `big:milestone:7:1:${DATE}`, box: 'big' }]);

    const at14 = expectedGrantKeysForDay({
      date: DATE,
      dayBlocks: [],
      log: makeLog([]),
      todayTier: 'minimum',
      baseStreak: 13,
    });
    expect(at14).toEqual([
      { key: `big:milestone:14:1:${DATE}`, box: 'big' },
      { key: `big:milestone:14:2:${DATE}`, box: 'big' },
    ]);
  });

  it('tier không thành công (pending/broken) → không milestone', () => {
    const keys = expectedGrantKeysForDay({
      date: DATE,
      dayBlocks: [],
      log: makeLog([]),
      todayTier: 'pending',
      baseStreak: 6,
    });
    expect(keys).toEqual([]);
  });
});


describe('expectedGrantKeysForDay — cờ doubleNextSmall (giấy "block sau bốc 2 tờ")', () => {
  const early = makeBlock({ id: 'early', kind: 'deep', startTime: '07:00', endTime: '09:00' });
  const late = makeBlock({ id: 'late', kind: 'light', startTime: '15:00', endTime: '16:00' });

  it('cờ bật + block deep/light đầu tiên đã tick → thêm lượt bonus double', () => {
    const keys = expectedGrantKeysForDay({
      date: DATE,
      dayBlocks: [early, late],
      log: makeLog(['early', 'late']),
      todayTier: 'silver',
      baseStreak: 0,
      doubleNextSmall: true,
    });
    // Block thường 2 lượt + 1 lượt double gắn vào block SỚM NHẤT đã tick
    expect(keys).toContainEqual({ key: `small:${DATE}:early`, box: 'small' });
    expect(keys).toContainEqual({ key: `small:${DATE}:late`, box: 'small' });
    expect(keys).toContainEqual({ key: `small:bonus:double:${DATE}:early`, box: 'small' });
    expect(keys.filter((k) => k.key.includes('bonus:double'))).toHaveLength(1);
  });

  it('cờ tắt/không có → không bonus (mặc định như cũ)', () => {
    const keys = expectedGrantKeysForDay({
      date: DATE,
      dayBlocks: [early],
      log: makeLog(['early']),
      todayTier: 'silver',
      baseStreak: 0,
    });
    expect(keys).toEqual([{ key: `small:${DATE}:early`, box: 'small' }]);
  });

  it('cờ bật nhưng chưa tick block deep/light nào → chưa có bonus', () => {
    const keys = expectedGrantKeysForDay({
      date: DATE,
      dayBlocks: [early, late],
      log: makeLog([]),
      todayTier: 'pending',
      baseStreak: 0,
      doubleNextSmall: true,
    });
    expect(keys).toEqual([]);
  });
});


describe('syncGrantsForDay — cấp mới / thu hồi theo trạng thái ngày', () => {
  const expected = [
    { key: `small:${DATE}:b1`, box: 'small' as const },
    { key: `big:gold:${DATE}`, box: 'big' as const },
  ];

  it('cấp lượt mới khi expected có mà chưa có', () => {
    const next = syncGrantsForDay(EMPTY_PENDING_REWARDS, expected, DATE, NOW);
    expect(next.available.map((g) => g.key).sort()).toEqual([`big:gold:${DATE}`, `small:${DATE}:b1`]);
  });

  it('KHÔNG cấp lại lượt đã tiêu (consumed)', () => {
    const pending: PendingRewards = { available: [], consumedKeys: [`small:${DATE}:b1`] };
    const next = syncGrantsForDay(pending, expected, DATE, NOW);
    expect(next.available.map((g) => g.key)).toEqual([`big:gold:${DATE}`]);
  });

  it('thu hồi lượt CHƯA dùng khi điều kiện không còn (bỏ tick, tụt Vàng)', () => {
    const pending: PendingRewards = {
      available: [
        { key: `small:${DATE}:b1`, box: 'small', grantedAt: NOW },
        { key: `big:gold:${DATE}`, box: 'big', grantedAt: NOW },
      ],
      consumedKeys: [],
    };
    const next = syncGrantsForDay(pending, [{ key: `small:${DATE}:b1`, box: 'small' }], DATE, NOW);
    expect(next.available.map((g) => g.key)).toEqual([`small:${DATE}:b1`]); // mất big:gold
  });

  it('không đụng lượt của NGÀY KHÁC và lượt bonus', () => {
    const pending: PendingRewards = {
      available: [
        { key: 'small:2026-07-17:b9', box: 'small', grantedAt: NOW },
        { key: 'small:bonus:srs:2026-07-18', box: 'small', grantedAt: NOW },
        { key: `small:${DATE}:b1`, box: 'small', grantedAt: NOW },
      ],
      consumedKeys: [],
    };
    const next = syncGrantsForDay(pending, [], DATE, NOW);
    expect(next.available.map((g) => g.key).sort()).toEqual(['small:2026-07-17:b9', 'small:bonus:srs:2026-07-18']);
  });
});

describe('revokeStaleGrantsForDay — sửa ngày QUÁ KHỨ: chỉ thu hồi, không cấp mới', () => {
  it('thu hồi lượt block chưa dùng khi điều kiện không còn', () => {
    const pending: PendingRewards = {
      available: [
        { key: `small:${DATE}:b1`, box: 'small', grantedAt: NOW },
        { key: `small:${DATE}:b2`, box: 'small', grantedAt: NOW },
      ],
      consumedKeys: [],
    };
    // b2 bị bỏ tick → chỉ còn b1 trong expected
    const next = revokeStaleGrantsForDay(pending, [{ key: `small:${DATE}:b1`, box: 'small' }], DATE);
    expect(next.available.map((g) => g.key)).toEqual([`small:${DATE}:b1`]);
  });

  it('KHÔNG cấp lượt mới kể cả khi expected có — thưởng là của khoảnh khắc', () => {
    const next = revokeStaleGrantsForDay(EMPTY_PENDING_REWARDS, [{ key: `small:${DATE}:b1`, box: 'small' }], DATE);
    expect(next.available).toEqual([]);
  });

  it('KHÔNG đụng key milestone và key bonus — không tái tính ngược lịch sử', () => {
    const pending: PendingRewards = {
      available: [
        { key: `big:milestone:7:1:${DATE}`, box: 'big', grantedAt: NOW },
        { key: 'small:bonus:redraw:xyz', box: 'small', grantedAt: NOW },
        { key: `small:${DATE}:b2`, box: 'small', grantedAt: NOW },
      ],
      consumedKeys: [`small:${DATE}:b1`],
    };
    const next = revokeStaleGrantsForDay(pending, [], DATE);
    expect(next.available.map((g) => g.key).sort()).toEqual([`big:milestone:7:1:${DATE}`, 'small:bonus:redraw:xyz']);
    expect(next.consumedKeys).toEqual([`small:${DATE}:b1`]); // giữ nguyên
  });

  it('không đụng lượt của ngày khác', () => {
    const pending: PendingRewards = {
      available: [{ key: 'small:2026-07-17:b1', box: 'small', grantedAt: NOW }],
      consumedKeys: [],
    };
    const next = revokeStaleGrantsForDay(pending, [], DATE);
    expect(next.available).toHaveLength(1);
  });
});

describe('countAvailable / poolComposition', () => {
  it('đếm lượt theo hộp', () => {
    const pending: PendingRewards = {
      available: [
        { key: 'a', box: 'small', grantedAt: NOW },
        { key: 'b', box: 'big', grantedAt: NOW },
        { key: 'c', box: 'small', grantedAt: NOW },
      ],
      consumedKeys: [],
    };
    expect(countAvailable(pending, 'small')).toBe(2);
    expect(countAvailable(pending, 'big')).toBe(1);
  });

  it('tỉ lệ thành phần pool chỉ tính giấy đang bật', () => {
    const slips: RewardSlip[] = [
      { id: '1', box: 'small', type: 'reward', text: 'a', enabled: true },
      { id: '2', box: 'small', type: 'reward', text: 'b', enabled: true },
      { id: '3', box: 'small', type: 'neutral', text: 'c', enabled: true },
      { id: '4', box: 'small', type: 'penalty', text: 'd', enabled: false }, // tắt
    ];
    const comp = poolComposition(slips, 'small');
    expect(comp.total).toBe(3);
    expect(comp.counts).toEqual({ reward: 2, neutral: 1, penalty: 0 });
  });
});
