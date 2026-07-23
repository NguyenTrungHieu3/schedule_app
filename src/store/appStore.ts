// Store trung tâm (Zustand). Mọi thay đổi dữ liệu đi qua đây rồi ghi xuống
// repository — component không gọi repository trực tiếp.

import { create } from 'zustand';
import { repository } from '../storage/supabaseRepository';
import { addDaysToDate, getDayOfWeek, getLogicalDate, getLogicalMonth } from '../logic/date';
import { computeDayStats, computeTier } from '../logic/tier';
import {
  canUnfreezeDay,
  canUseFreezeToken,
  displayStreak,
  FREEZE_TOKENS_PER_MONTH,
  reconcileStreak,
  resetFreezeTokensIfNewMonth,
} from '../logic/streak';
import {
  drawSlip,
  EMPTY_PENDING_REWARDS,
  expectedGrantKeysForDay,
  revokeStaleGrantsForDay,
  SLIP_ID_BIG_DRAW_SMALL,
  SLIP_ID_DOUBLE_NEXT,
  SLIP_ID_REDRAW,
  syncGrantsForDay,
  type PendingRewards,
} from '../logic/reward';
import { answerReviewItem, createReviewItem } from '../logic/srs';
import { answerErrorEntry, createErrorEntry } from '../logic/errorLog';
import type {
  AppSettings,
  DayLog,
  DayTier,
  ErrorEntry,
  ReviewItem,
  ReviewResult,
  RewardBox,
  RewardDraw,
  RewardSlip,
  ScheduleBlock,
  StreakState,
  Subject,
  ToeicPart,
  WeeklyReview,
} from '../types';

function emptyDayLog(date: string): DayLog {
  return {
    date,
    completedBlockIds: [],
    minutesBySubject: { programming: 0, japanese: 0, toeic: 0 },
    pomodorosCompleted: 0,
    tier: 'pending',
  };
}

function blocksForDate(scheduleBlocks: ScheduleBlock[], date: string): ScheduleBlock[] {
  return scheduleBlocks.filter((b) => b.dayOfWeek === getDayOfWeek(date));
}

// RewardDraw + key lượt bốc đã dùng (để undo trả lại được đúng lượt).
export interface RewardDrawRecord extends RewardDraw {
  grantKey: string;
}

interface AppState {
  loaded: boolean;
  scheduleBlocks: ScheduleBlock[];
  dayLogs: Record<string, DayLog>;
  streak: StreakState; // đã reconcile đến hết hôm qua
  pendingRewards: PendingRewards;
  rewardDraws: RewardDrawRecord[];
  rewardSlips: RewardSlip[];
  reviewItems: ReviewItem[];
  errorEntries: ErrorEntry[];
  weeklyReviews: WeeklyReview[];
  settings: AppSettings;
  // Mốc chuỗi vừa chạm trong lần tick gần nhất — UI hiện confetti rồi gọi clearMilestone.
  justHitMilestone: number | null;

  load(): Promise<void>;
  toggleBlock(blockId: string, date?: string): Promise<void>;
  // date mặc định hôm nay; truyền ngày logic của phiên khi ghi hộ (timer hydrate).
  // blockId để đếm pomodoro THEO BLOCK (tiến độ 🍅 x/y trong block).
  incrementPomodoro(date?: string, blockId?: string): Promise<void>;
  useFreezeToken(date: string): Promise<boolean>;
  // Huỷ freeze của một ngày (gắn nhầm) — hoàn lại token, ngày quay về tier thật.
  unfreezeDay(date: string): Promise<boolean>;

  draw(box: RewardBox): Promise<RewardDrawRecord | null>;
  undoDraw(drawId: string): Promise<void>;
  setDrawClaimed(drawId: string, claimed: boolean): Promise<void>;
  grantBonusSmall(key: string): Promise<void>;

  addReviewItem(subject: Subject, title: string, learnedOn: string): Promise<void>;
  answerReview(itemId: string, result: ReviewResult): Promise<void>;
  deleteReviewItem(itemId: string): Promise<void>;

  addErrorEntry(args: { part: ToeicPart; questionText: string; myAnswer: string; correctAnswer: string; reason: string }): Promise<void>;
  answerError(entryId: string, remembered: boolean): Promise<void>;
  deleteErrorEntry(entryId: string): Promise<void>;

  saveWeeklyReview(review: WeeklyReview): Promise<void>;
  // Ghi chú tự do cho một ngày ("mệt", "ốm", "bận đột xuất") — field DayLog.note.
  setDayNote(date: string, note: string): Promise<void>;
  updateSettings(patch: Partial<AppSettings>): Promise<void>;

  addScheduleBlock(block: Omit<ScheduleBlock, 'id'>): Promise<void>;
  updateScheduleBlock(block: ScheduleBlock): Promise<void>;
  deleteScheduleBlock(blockId: string): Promise<void>;

  addSlip(slip: Omit<RewardSlip, 'id'>): Promise<void>;
  updateSlip(slip: RewardSlip): Promise<void>;
  deleteSlip(slipId: string): Promise<void>;

  clearMilestone(): void;
  importData(json: string): Promise<void>;
  exportData(): Promise<string>;
  deleteAllData(): Promise<void>;
}

const DEFAULT_SETTINGS: AppSettings = { soundEnabled: true, notificationsEnabled: true, lastBackupDate: null };

const DEFAULT_STREAK: StreakState = {
  currentStreak: 0,
  longestStreak: 0,
  lastCountedDate: null,
  freezeTokensRemaining: 2,
  freezeTokensMonth: getLogicalMonth(),
};

export const useAppStore = create<AppState>((set, get) => {
  // Đồng bộ lượt bốc của HÔM NAY với trạng thái mới nhất (tier + chuỗi chốt).
  // Phải gọi sau MỌI thay đổi có thể làm đổi streak hoặc log hôm nay — kể cả
  // gián tiếp (sửa ngày quá khứ, dùng freeze) — nếu không, lượt mốc chuỗi sẽ
  // bị cấp sai hoặc không được cấp cho đến lần tick tiếp theo.
  function syncTodayGrants(
    state: AppState,
    updatedLogs: Record<string, DayLog>,
    streak: StreakState,
    pending: PendingRewards,
  ): { pendingRewards: PendingRewards; justHitMilestone: number | null } {
    const today = getLogicalDate();
    const todayBlocks = blocksForDate(state.scheduleBlocks, today);
    const todayLog = updatedLogs[today] ?? emptyDayLog(today);
    const todayTier = computeTier({
      dayBlocks: todayBlocks,
      completedBlockIds: todayLog.completedBlockIds,
      isToday: true,
      frozen: todayLog.tier === 'frozen',
    });

    const milestoneCount = (p: PendingRewards) => p.available.filter((g) => g.key.startsWith('big:milestone:')).length;
    const before = milestoneCount(pending);
    const doubleNextSmall = pending.doubleNextSmall === true;
    const expected = expectedGrantKeysForDay({
      date: today,
      dayBlocks: todayBlocks,
      log: todayLog,
      todayTier,
      baseStreak: streak.currentStreak,
      doubleNextSmall,
    });
    let pendingRewards = syncGrantsForDay(pending, expected, today, new Date().toISOString());

    // Cờ "block sau bốc 2 tờ" vừa phát huy (bonus đã cấp) → tắt cờ. Key bonus
    // không bị thu hồi nên lượt vẫn nằm yên đó chờ bốc.
    if (doubleNextSmall && pendingRewards.available.some((g) => g.key.startsWith('small:bonus:double:'))) {
      pendingRewards = { ...pendingRewards, doubleNextSmall: false };
    }

    let justHitMilestone = state.justHitMilestone;
    if (milestoneCount(pendingRewards) > before) {
      justHitMilestone = pendingRewards.available
        .filter((g) => g.key.startsWith('big:milestone:'))
        .map((g) => Number(g.key.split(':')[2]))
        .sort((a, b) => b - a)[0];
    }
    return { pendingRewards, justHitMilestone };
  }

  // Tính lại tier + đồng bộ lượt bốc cho một ngày sau khi log của ngày đó đổi.
  async function recomputeDay(date: string, updatedLogs: Record<string, DayLog>): Promise<void> {
    const state = get();
    const today = getLogicalDate();
    const dayBlocks = blocksForDate(state.scheduleBlocks, date);
    const log = updatedLogs[date] ?? emptyDayLog(date);

    const stats = computeDayStats(dayBlocks, log.completedBlockIds);
    const tier = computeTier({
      dayBlocks,
      completedBlockIds: log.completedBlockIds,
      isToday: date === today,
      frozen: log.tier === 'frozen',
    });
    updatedLogs[date] = { ...log, minutesBySubject: stats.minutesBySubject, tier };

    let streak = state.streak;
    let pendingRewards = state.pendingRewards;

    if (date !== today) {
      // Sửa ngày quá khứ → chuỗi phải được truy hồi lại từ lịch sử,
      // và thu hồi lượt bốc CHƯA dùng của ngày đó nếu điều kiện không còn
      // (KHÔNG cấp lượt mới cho ngày quá khứ — thưởng là của khoảnh khắc).
      streak = reconcileStreak({
        streak: state.streak,
        dayLogs: updatedLogs,
        scheduleBlocks: state.scheduleBlocks,
        today,
      });
      const expectedPast = expectedGrantKeysForDay({
        date,
        dayBlocks,
        log: updatedLogs[date],
        todayTier: tier,
        baseStreak: streak.currentStreak,
      });
      pendingRewards = revokeStaleGrantsForDay(pendingRewards, expectedPast, date);
    }

    // Luôn đồng bộ grants của hôm nay: sửa quá khứ có thể làm đổi chuỗi chốt
    // → lượt mốc chuỗi của hôm nay cũng phải cập nhật theo ngay.
    const synced = syncTodayGrants(state, updatedLogs, streak, pendingRewards);

    set({ dayLogs: { ...updatedLogs }, streak, pendingRewards: synced.pendingRewards, justHitMilestone: synced.justHitMilestone });
    await Promise.all([
      repository.set('dayLogs', updatedLogs),
      repository.set('streak', streak),
      repository.set('pendingRewards', synced.pendingRewards),
    ]);
  }

  async function persistDraws(draws: RewardDrawRecord[], pending: PendingRewards): Promise<void> {
    set({ rewardDraws: draws, pendingRewards: pending });
    await Promise.all([repository.set('rewardDraws', draws), repository.set('pendingRewards', pending)]);
  }

  return {
    loaded: false,
    scheduleBlocks: [],
    dayLogs: {},
    streak: DEFAULT_STREAK,
    pendingRewards: EMPTY_PENDING_REWARDS,
    rewardDraws: [],
    rewardSlips: [],
    reviewItems: [],
    errorEntries: [],
    weeklyReviews: [],
    settings: DEFAULT_SETTINGS,
    justHitMilestone: null,

    async load() {
      const [scheduleBlocks, dayLogs, streakRaw, pendingRewards, rewardDraws, rewardSlips, reviewItems, errorEntries, weeklyReviews, settings] =
        await Promise.all([
          repository.get<ScheduleBlock[]>('scheduleBlocks'),
          repository.get<Record<string, DayLog>>('dayLogs'),
          repository.get<StreakState>('streak'),
          repository.get<PendingRewards>('pendingRewards'),
          repository.get<RewardDrawRecord[]>('rewardDraws'),
          repository.get<RewardSlip[]>('rewardSlips'),
          repository.get<ReviewItem[]>('reviewItems'),
          repository.get<ErrorEntry[]>('errorEntries'),
          repository.get<WeeklyReview[]>('weeklyReviews'),
          repository.get<AppSettings>('settings'),
        ]);

      const today = getLogicalDate();
      const blocks = scheduleBlocks ?? [];
      const logs = dayLogs ?? {};

      // Khởi động: reset freeze token nếu sang tháng + truy hồi chuỗi.
      let streak = streakRaw ?? DEFAULT_STREAK;
      streak = resetFreezeTokensIfNewMonth(streak, getLogicalMonth());
      streak = reconcileStreak({ streak, dayLogs: logs, scheduleBlocks: blocks, today });
      await repository.set('streak', streak);

      set({
        loaded: true,
        scheduleBlocks: blocks,
        dayLogs: logs,
        streak,
        pendingRewards: pendingRewards ?? EMPTY_PENDING_REWARDS,
        rewardDraws: rewardDraws ?? [],
        rewardSlips: rewardSlips ?? [],
        reviewItems: reviewItems ?? [],
        errorEntries: errorEntries ?? [],
        weeklyReviews: weeklyReviews ?? [],
        settings: settings ?? DEFAULT_SETTINGS,
      });
    },

    // Tick / bỏ tick một block. Mặc định hôm nay; truyền date để sửa ngày quá khứ.
    async toggleBlock(blockId, date = getLogicalDate()) {
      const { dayLogs } = get();
      const log = dayLogs[date] ?? emptyDayLog(date);
      const completedBlockIds = log.completedBlockIds.includes(blockId)
        ? log.completedBlockIds.filter((id) => id !== blockId)
        : [...log.completedBlockIds, blockId];
      const updatedLogs = { ...dayLogs, [date]: { ...log, completedBlockIds } };
      await recomputeDay(date, updatedLogs);
    },

    async incrementPomodoro(date = getLogicalDate(), blockId?: string) {
      const { dayLogs } = get();
      const log = dayLogs[date] ?? emptyDayLog(date);
      const pomodorosByBlock = blockId
        ? { ...log.pomodorosByBlock, [blockId]: (log.pomodorosByBlock?.[blockId] ?? 0) + 1 }
        : log.pomodorosByBlock;
      const updatedLogs = {
        ...dayLogs,
        [date]: { ...log, pomodorosCompleted: log.pomodorosCompleted + 1, pomodorosByBlock },
      };
      set({ dayLogs: updatedLogs });
      await repository.set('dayLogs', updatedLogs);
    },

    async useFreezeToken(date) {
      const state = get();
      const today = getLogicalDate();
      if (!canUseFreezeToken({ date, today, streak: state.streak, dayLogs: state.dayLogs, scheduleBlocks: state.scheduleBlocks })) {
        return false;
      }
      const log = state.dayLogs[date] ?? emptyDayLog(date);
      const updatedLogs = { ...state.dayLogs, [date]: { ...log, tier: 'frozen' as DayTier } };
      const streakWithToken = { ...state.streak, freezeTokensRemaining: state.streak.freezeTokensRemaining - 1 };
      const streak = reconcileStreak({ streak: streakWithToken, dayLogs: updatedLogs, scheduleBlocks: state.scheduleBlocks, today });
      // Chuỗi vừa đổi → đồng bộ lại grants của hôm nay (có thể vừa chạm mốc).
      const synced = syncTodayGrants(state, updatedLogs, streak, state.pendingRewards);
      set({ dayLogs: updatedLogs, streak, pendingRewards: synced.pendingRewards, justHitMilestone: synced.justHitMilestone });
      await Promise.all([
        repository.set('dayLogs', updatedLogs),
        repository.set('streak', streak),
        repository.set('pendingRewards', synced.pendingRewards),
      ]);
      return true;
    },

    // Huỷ freeze của một ngày: hoàn token (không vượt tối đa/tháng), gỡ cờ
    // frozen rồi để recomputeDay tính lại tier thật + reconcile chuỗi + sync grants.
    async unfreezeDay(date) {
      const state = get();
      const today = getLogicalDate();
      const log = state.dayLogs[date];
      if (!canUnfreezeDay(log, date, today)) return false;

      set({
        streak: {
          ...state.streak,
          freezeTokensRemaining: Math.min(state.streak.freezeTokensRemaining + 1, FREEZE_TOKENS_PER_MONTH),
        },
      });
      // Tier 'pending' ở đây chỉ là giá trị tạm — recomputeDay tính lại ngay
      // từ completedBlockIds (frozen: false vì tier không còn là 'frozen').
      const updatedLogs = { ...state.dayLogs, [date]: { ...log, tier: 'pending' as DayTier } };
      await recomputeDay(date, updatedLogs);
      return true;
    },

    // Bốc một tờ. Tiêu 1 lượt, ghi lịch sử, xử lý giấy đặc biệt.
    async draw(box) {
      const state = get();
      const grant = state.pendingRewards.available.find((g) => g.box === box);
      if (!grant) return null;
      const slip = drawSlip(box, state.rewardSlips);
      if (!slip) return null;

      const record: RewardDrawRecord = {
        id: crypto.randomUUID(),
        slipId: slip.id,
        slipTextSnapshot: slip.text,
        box,
        type: slip.type,
        drawnAt: new Date().toISOString(),
        claimed: false,
        grantKey: grant.key,
      };

      let pending: PendingRewards = {
        available: state.pendingRewards.available.filter((g) => g !== grant),
        consumedKeys: [...state.pendingRewards.consumedKeys, grant.key],
      };

      // Giấy đặc biệt — cấp lượt bổ sung (key bonus không bao giờ bị thu hồi).
      const now = new Date().toISOString();
      if (slip.id === SLIP_ID_REDRAW) {
        pending = { ...pending, available: [...pending.available, { key: `small:bonus:redraw:${record.id}`, box: 'small', grantedAt: now }] };
      } else if (slip.id === SLIP_ID_DOUBLE_NEXT) {
        // "Để dành — block sau bốc 2 tờ": KHÔNG bốc thêm ngay. Bật cờ để block
        // deep/light hoàn thành tiếp theo được cấp 2 lượt (xử lý ở syncTodayGrants).
        pending = { ...pending, doubleNextSmall: true };
      } else if (slip.id === SLIP_ID_BIG_DRAW_SMALL) {
        pending = { ...pending, available: [...pending.available, { key: `small:bonus:bigslip:${record.id}`, box: 'small', grantedAt: now }] };
      }

      await persistDraws([record, ...state.rewardDraws], pending);
      return record;
    },

    // Hoàn tác một lượt bốc: xoá khỏi lịch sử, trả lại lượt, thu hồi bonus chưa dùng.
    async undoDraw(drawId) {
      const state = get();
      const record = state.rewardDraws.find((d) => d.id === drawId);
      if (!record) return;
      const pending: PendingRewards = {
        available: [
          ...state.pendingRewards.available.filter((g) => !g.key.includes(drawId)),
          { key: record.grantKey, box: record.box, grantedAt: new Date().toISOString() },
        ],
        consumedKeys: state.pendingRewards.consumedKeys.filter((k) => k !== record.grantKey),
        // Hoàn tác giấy "block sau bốc 2 tờ" → tắt cờ nếu nó chưa kịp phát huy.
        doubleNextSmall:
          record.slipId === SLIP_ID_DOUBLE_NEXT ? false : state.pendingRewards.doubleNextSmall,
      };
      await persistDraws(state.rewardDraws.filter((d) => d.id !== drawId), pending);
    },

    async setDrawClaimed(drawId, claimed) {
      const draws = get().rewardDraws.map((d) => (d.id === drawId ? { ...d, claimed } : d));
      set({ rewardDraws: draws });
      await repository.set('rewardDraws', draws);
    },

    // Cấp 1 lượt hộp nhỏ ngoài luồng block (ví dụ: ôn xong hết SRS trong ngày).
    async grantBonusSmall(key) {
      const state = get();
      if (state.pendingRewards.available.some((g) => g.key === key) || state.pendingRewards.consumedKeys.includes(key)) {
        return; // đã cấp rồi — không cấp trùng
      }
      const pending: PendingRewards = {
        ...state.pendingRewards,
        available: [...state.pendingRewards.available, { key, box: 'small', grantedAt: new Date().toISOString() }],
      };
      set({ pendingRewards: pending });
      await repository.set('pendingRewards', pending);
    },

    async addReviewItem(subject, title, learnedOn) {
      const item = createReviewItem({ id: crypto.randomUUID(), subject, title, learnedOn });
      const reviewItems = [...get().reviewItems, item];
      set({ reviewItems });
      await repository.set('reviewItems', reviewItems);
    },

    async answerReview(itemId, result) {
      const today = getLogicalDate();
      const reviewItems = get().reviewItems.map((i) => (i.id === itemId ? answerReviewItem(i, result, today) : i));
      set({ reviewItems });
      await repository.set('reviewItems', reviewItems);
    },

    async deleteReviewItem(itemId) {
      const reviewItems = get().reviewItems.filter((i) => i.id !== itemId);
      set({ reviewItems });
      await repository.set('reviewItems', reviewItems);
    },

    async addErrorEntry(args) {
      const entry = createErrorEntry({ ...args, id: crypto.randomUUID(), createdOn: getLogicalDate() });
      const errorEntries = [...get().errorEntries, entry];
      set({ errorEntries });
      await repository.set('errorEntries', errorEntries);
    },

    async answerError(entryId, remembered) {
      const today = getLogicalDate();
      const errorEntries = get().errorEntries.map((e) => (e.id === entryId ? answerErrorEntry(e, remembered, today) : e));
      set({ errorEntries });
      await repository.set('errorEntries', errorEntries);
    },

    async deleteErrorEntry(entryId) {
      const errorEntries = get().errorEntries.filter((e) => e.id !== entryId);
      set({ errorEntries });
      await repository.set('errorEntries', errorEntries);
    },

    async saveWeeklyReview(review) {
      const weeklyReviews = [review, ...get().weeklyReviews.filter((r) => r.weekStartDate !== review.weekStartDate)];
      set({ weeklyReviews });
      await repository.set('weeklyReviews', weeklyReviews);
    },

    async setDayNote(date, note) {
      const { dayLogs } = get();
      const log = dayLogs[date] ?? emptyDayLog(date);
      const trimmed = note.trim();
      // Ghi chú trống → xoá field, đừng lưu chuỗi rỗng cho rác dữ liệu.
      const updatedLogs = { ...dayLogs, [date]: { ...log, note: trimmed === '' ? undefined : trimmed } };
      set({ dayLogs: updatedLogs });
      await repository.set('dayLogs', updatedLogs);
    },

    async updateSettings(patch) {
      const settings = { ...get().settings, ...patch };
      set({ settings });
      await repository.set('settings', settings);
    },

    async addScheduleBlock(block) {
      const scheduleBlocks = [...get().scheduleBlocks, { ...block, id: crypto.randomUUID() }];
      set({ scheduleBlocks });
      await repository.set('scheduleBlocks', scheduleBlocks);
    },

    async updateScheduleBlock(block) {
      const scheduleBlocks = get().scheduleBlocks.map((b) => (b.id === block.id ? block : b));
      set({ scheduleBlocks });
      await repository.set('scheduleBlocks', scheduleBlocks);
    },

    async deleteScheduleBlock(blockId) {
      const scheduleBlocks = get().scheduleBlocks.filter((b) => b.id !== blockId);
      set({ scheduleBlocks });
      await repository.set('scheduleBlocks', scheduleBlocks);
    },

    async addSlip(slip) {
      const rewardSlips = [...get().rewardSlips, { ...slip, id: crypto.randomUUID() }];
      set({ rewardSlips });
      await repository.set('rewardSlips', rewardSlips);
    },

    async updateSlip(slip) {
      const rewardSlips = get().rewardSlips.map((s) => (s.id === slip.id ? slip : s));
      set({ rewardSlips });
      await repository.set('rewardSlips', rewardSlips);
    },

    async deleteSlip(slipId) {
      const rewardSlips = get().rewardSlips.filter((s) => s.id !== slipId);
      set({ rewardSlips });
      await repository.set('rewardSlips', rewardSlips);
    },

    clearMilestone() {
      set({ justHitMilestone: null });
    },

    async exportData() {
      const json = await repository.exportAll();
      await get().updateSettings({ lastBackupDate: getLogicalDate() });
      return json;
    },

    async importData(json) {
      await repository.importAll(json);
      await get().load();
    },

    async deleteAllData() {
      await repository.clearAll();
      // Reload để init.ts nạp lại seed sạch.
      window.location.reload();
    },
  };
});

// ===== Selectors =====

export function selectTodayBlocks(state: Pick<AppState, 'scheduleBlocks'>): ScheduleBlock[] {
  return blocksForDate(state.scheduleBlocks, getLogicalDate()).slice().sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function selectTodayTier(state: Pick<AppState, 'scheduleBlocks' | 'dayLogs'>): DayTier {
  const today = getLogicalDate();
  const log = state.dayLogs[today];
  return computeTier({
    dayBlocks: blocksForDate(state.scheduleBlocks, today),
    completedBlockIds: log?.completedBlockIds ?? [],
    isToday: true,
    frozen: log?.tier === 'frozen',
  });
}

// Chuỗi hiển thị = chuỗi chốt + hôm nay (nếu đang đạt).
export function selectDisplayStreak(state: Pick<AppState, 'scheduleBlocks' | 'dayLogs' | 'streak'>): number {
  return displayStreak(state.streak, selectTodayTier(state));
}

// Thứ Hai của tuần chứa ngày date — dùng cho WeeklyReview.
export function weekStartOf(date: string): string {
  const dow = getDayOfWeek(date); // 0 = CN
  return addDaysToDate(date, dow === 0 ? -6 : 1 - dow);
}
