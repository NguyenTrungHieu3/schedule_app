// Hộp phần thưởng — theo §4.6 của spec. Hàm thuần, không dính React.
//
// Nguyên tắc quan trọng nhất: bốc ĐỀU trên toàn bộ pool. Tỉ lệ 70/20/10 nằm ở
// THÀNH PHẦN pool (số tờ mỗi loại), không nằm trong logic bốc. TUYỆT ĐỐI không
// thêm pity system / cân bằng theo phiên — tính bất định là toàn bộ giá trị.

import type { DayLog, DayTier, RewardBox, RewardSlip, ScheduleBlock } from '../types';
import { isSuccessTier, crossedMilestones } from './streak';

export function drawSlip(box: RewardBox, slips: RewardSlip[]): RewardSlip | null {
  const pool = slips.filter((s) => s.box === box && s.enabled);
  if (pool.length === 0) return null;
  // Bốc đều — không cân bằng theo type ở bước bốc.
  return pool[Math.floor(Math.random() * pool.length)];
}

// Id cố định của các giấy cần logic riêng (khớp với seed data).
export const SLIP_ID_REDRAW = 'slip-redraw'; // "Bốc lại ngay"
export const SLIP_ID_DOUBLE_NEXT = 'slip-double-next'; // "Để dành — block sau bốc 2 tờ"
export const SLIP_ID_BIG_DRAW_SMALL = 'slip-big-draw-small'; // "Bốc thêm 1 tờ hộp nhỏ"

// ===== Quản lý lượt bốc (grant) =====
//
// Mỗi lượt bốc có một key duy nhất mô tả nguồn gốc:
//   small:<date>:<blockId>        — tick xong block deep/light
//   big:gold:<date>               — đạt Ngày Vàng
//   big:mock:<date>:<blockId>     — hoàn thành block có cờ grantsBigBox
//   big:milestone:<m>:<n>:<date>  — chạm mốc chuỗi m (mốc 14 có n=1 và n=2)
//   small:bonus:<...>             — giấy đặc biệt / ôn xong SRS cấp thêm, không bị thu hồi
//
// Key giúp: (1) không cấp trùng, (2) bỏ tick block → thu hồi đúng lượt CHƯA
// dùng của block đó, (3) lượt đã dùng (consumed) thì không cấp lại.

export interface RewardGrant {
  key: string;
  box: RewardBox;
  grantedAt: string; // ISO datetime
}

export interface PendingRewards {
  available: RewardGrant[];
  consumedKeys: string[];
  // Cờ của giấy "Để dành — block sau bốc 2 tờ": block deep/light HOÀN THÀNH
  // TIẾP THEO được cấp 2 lượt hộp nhỏ thay vì 1. Optional để dữ liệu đã lưu
  // từ bản cũ (không có field này) vẫn đọc được — undefined = cờ tắt.
  doubleNextSmall?: boolean;
}

export const EMPTY_PENDING_REWARDS: PendingRewards = { available: [], consumedKeys: [] };

// Các lượt bốc mà trạng thái NGÀY HÔM NAY đáng lẽ phải cấp.
export function expectedGrantKeysForDay(args: {
  date: string;
  dayBlocks: ScheduleBlock[];
  log: DayLog | undefined;
  todayTier: DayTier;
  baseStreak: number; // chuỗi đã chốt đến hôm qua
  doubleNextSmall?: boolean; // cờ từ giấy "Để dành — block sau bốc 2 tờ"
}): { key: string; box: RewardBox }[] {
  const { date, dayBlocks, log, todayTier, baseStreak, doubleNextSmall } = args;
  const keys: { key: string; box: RewardBox }[] = [];
  const completed = new Set(log?.completedBlockIds ?? []);

  for (const block of dayBlocks) {
    if (!completed.has(block.id)) continue;
    if (block.kind === 'deep' || block.kind === 'light') {
      keys.push({ key: `small:${date}:${block.id}`, box: 'small' });
    }
    if (block.grantsBigBox) {
      keys.push({ key: `big:mock:${date}:${block.id}`, box: 'big' });
    }
  }

  // Giấy "Để dành — block sau bốc 2 tờ": block deep/light SỚM NHẤT đã hoàn
  // thành được cấp thêm 1 lượt nữa (tổng 2 tờ). Key dạng bonus nên không bao
  // giờ bị thu hồi một khi đã cấp.
  if (doubleNextSmall) {
    const firstCompleted = dayBlocks
      .filter((b) => (b.kind === 'deep' || b.kind === 'light') && completed.has(b.id))
      .sort((a, b) => a.startTime.localeCompare(b.startTime))[0];
    if (firstCompleted) {
      keys.push({ key: `small:bonus:double:${date}:${firstCompleted.id}`, box: 'small' });
    }
  }

  if (todayTier === 'gold') {
    keys.push({ key: `big:gold:${date}`, box: 'big' });
  }

  if (isSuccessTier(todayTier)) {
    const display = baseStreak + 1;
    for (const m of crossedMilestones(baseStreak, display)) {
      keys.push({ key: `big:milestone:${m}:1:${date}`, box: 'big' });
      // Mốc 14 được 2 lượt.
      if (m === 14) keys.push({ key: `big:milestone:${m}:2:${date}`, box: 'big' });
    }
  }

  return keys;
}

// Key có thuộc "không gian key của ngày date" không — chỉ những key này mới bị
// đồng bộ/thu hồi khi trạng thái ngày đổi. Key bonus (giấy đặc biệt, SRS) thì không.
function isManagedKeyForDay(key: string, date: string): boolean {
  return (
    key.startsWith(`small:${date}:`) ||
    key === `big:gold:${date}` ||
    key.startsWith(`big:mock:${date}:`) ||
    (key.startsWith('big:milestone:') && key.endsWith(`:${date}`))
  );
}

// Đồng bộ grants của một ngày với trạng thái hiện tại của ngày đó:
// - lượt CHƯA dùng mà điều kiện không còn (bỏ tick, tụt Vàng) → thu hồi
// - điều kiện mới đạt mà chưa cấp và chưa từng dùng → cấp
export function syncGrantsForDay(
  pending: PendingRewards,
  expected: { key: string; box: RewardBox }[],
  date: string,
  now: string,
): PendingRewards {
  const expectedKeys = new Set(expected.map((e) => e.key));

  const available = pending.available.filter(
    (g) => !isManagedKeyForDay(g.key, date) || expectedKeys.has(g.key),
  );

  const availableKeys = new Set(available.map((g) => g.key));
  const consumed = new Set(pending.consumedKeys);
  for (const e of expected) {
    if (!availableKeys.has(e.key) && !consumed.has(e.key)) {
      available.push({ key: e.key, box: e.box, grantedAt: now });
    }
  }

  // Spread để giữ nguyên các cờ phụ (doubleNextSmall…) — tuyệt đối không dựng
  // object mới chỉ với available/consumedKeys, sẽ làm mất cờ âm thầm.
  return { ...pending, available };
}

export function countAvailable(pending: PendingRewards, box: RewardBox): number {
  return pending.available.filter((g) => g.box === box).length;
}

// Thu hồi lượt CHƯA dùng của một ngày QUÁ KHỨ khi điều kiện không còn
// (bỏ tick block, mất Vàng). Khác syncGrantsForDay ở hai điểm có chủ đích:
//   - KHÔNG cấp lượt mới: thưởng là của khoảnh khắc, sửa lịch sử không sinh thưởng.
//   - KHÔNG đụng key big:milestone: mốc chuỗi gắn với thời điểm đã cấp,
//     không tái tính ngược theo lịch sử mới.
export function revokeStaleGrantsForDay(
  pending: PendingRewards,
  expected: { key: string; box: RewardBox }[],
  date: string,
): PendingRewards {
  const expectedKeys = new Set(expected.map((e) => e.key));
  const available = pending.available.filter(
    (g) => !isManagedKeyForDay(g.key, date) || g.key.startsWith('big:milestone:') || expectedKeys.has(g.key),
  );
  return { ...pending, available }; // giữ nguyên cờ phụ (doubleNextSmall…)
}

// Tỉ lệ thành phần pool theo type — cho thanh tỉ lệ ở Cài đặt.
export function poolComposition(slips: RewardSlip[], box: RewardBox) {
  const pool = slips.filter((s) => s.box === box && s.enabled);
  const count = { reward: 0, neutral: 0, penalty: 0 };
  for (const s of pool) count[s.type] += 1;
  const total = pool.length;
  return {
    total,
    counts: count,
    percents: {
      reward: total === 0 ? 0 : (count.reward / total) * 100,
      neutral: total === 0 ? 0 : (count.neutral / total) * 100,
      penalty: total === 0 ? 0 : (count.penalty / total) * 100,
    },
  };
}
