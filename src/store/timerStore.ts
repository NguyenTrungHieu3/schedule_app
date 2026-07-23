// Pomodoro timer — theo §4.7 + §4.8 của spec.
//
// Yêu cầu kỹ thuật quan trọng: KHÔNG đếm bằng setInterval cộng dồn — tab nền
// bị throttle sẽ làm đồng hồ sai. Lưu endTimestamp, mỗi lần render tính
// remaining = endTimestamp - Date.now(). Interval chỉ dùng để re-render.
// Trạng thái lưu vào storage → reload trang timer vẫn tiếp tục đúng.

import { create } from 'zustand';
import { repository } from '../storage/supabaseRepository';
import { useAppStore } from './appStore';
import { TWO_MINUTE_PROMPTS } from '../data/seed';
import { getLogicalDate } from '../logic/date';
import { playBreakEndSound, playTimerEndSound } from '../utils/sound';
import { notify, requestNotificationPermission } from '../utils/notify';
import type { ScheduleBlock, Subject } from '../types';

export type TimerPhase = 'work' | 'break' | 'breakChoice' | 'twoMinute' | 'twoMinuteChoice';

export interface TimerState {
  phase: TimerPhase;
  blockId: string;
  blockTitle: string;
  subject: Subject | null;
  kind: 'deep' | 'light'; // quyết định 50/10 hay 25/5
  endTimestamp: number; // ms epoch; 0 ở các phase lựa chọn (không đếm giờ)
  cyclesCompleted: number; // số pomodoro liên tiếp — sau 4 gợi ý nghỉ dài
  twoMinutePrompt: string;
}

const WORK_MINUTES = { deep: 50, light: 25 } as const;
const BREAK_MINUTES = { deep: 10, light: 5 } as const;
const LONG_BREAK_MINUTES = 30;
const TWO_MINUTE_MS = 2 * 60 * 1000;

// Block srs/review cũng chạy được Pomodoro — coi như 'light' (25/5).
export function timerKindOf(block: ScheduleBlock): 'deep' | 'light' {
  return block.kind === 'deep' ? 'deep' : 'light';
}

const ORIGINAL_TITLE = document.title;

function setTimeUpTitle(): void {
  document.title = '⏰ Hết giờ!';
}
export function restoreTitle(): void {
  document.title = ORIGINAL_TITLE;
}

interface TimerStore {
  timer: TimerState | null;

  hydrate(): Promise<void>;
  startWork(block: ScheduleBlock): Promise<void>;
  startTwoMinute(block: ScheduleBlock): Promise<void>;
  // Hết 2 phút, người dùng chọn: học tiếp → Pomodoro đầy đủ.
  continueFullPomodoro(): Promise<void>;
  // "Dừng ở đây" phải THẬT SỰ dừng: không phạt, không hỏi lại.
  stop(): Promise<void>;
  chooseBreak(long: boolean): Promise<void>;
  // Gọi khi remaining về 0 — chuyển phase.
  completeCurrentPhase(): Promise<void>;
}

async function persist(timer: TimerState | null): Promise<void> {
  if (timer === null) {
    await repository.remove('timerState');
  } else {
    await repository.set('timerState', timer);
  }
}

export const useTimerStore = create<TimerStore>((set, get) => ({
  timer: null,

  // Khôi phục timer sau reload. Nếu hết giờ trong lúc app đóng:
  // phiên work vẫn được tính pomodoro, rồi về trạng thái nghỉ tay.
  async hydrate() {
    const saved = await repository.get<TimerState>('timerState');
    if (!saved) return;
    if (saved.endTimestamp > 0 && saved.endTimestamp <= Date.now()) {
      if (saved.phase === 'work') {
        // Ghi pomodoro vào NGÀY LOGIC CỦA PHIÊN (theo endTimestamp), không phải
        // ngày mở app — phiên kết thúc 00:20 thuộc về ngày logic hôm trước.
        await useAppStore.getState().incrementPomodoro(getLogicalDate(new Date(saved.endTimestamp)), saved.blockId);
      }
      await persist(null);
      return;
    }
    set({ timer: saved });
  },

  async startWork(block) {
    if (useAppStore.getState().settings.notificationsEnabled) {
      await requestNotificationPermission();
    }
    restoreTitle();
    const kind = timerKindOf(block);
    const previous = get().timer;
    const timer: TimerState = {
      phase: 'work',
      blockId: block.id,
      blockTitle: block.title,
      subject: block.subject,
      kind,
      endTimestamp: Date.now() + WORK_MINUTES[kind] * 60 * 1000,
      // Đổi block vẫn giữ đà chu kỳ liên tiếp trong buổi.
      cyclesCompleted: previous?.cyclesCompleted ?? 0,
      twoMinutePrompt: '',
    };
    set({ timer });
    await persist(timer);
  },

  async startTwoMinute(block) {
    const prompts = block.subject ? TWO_MINUTE_PROMPTS[block.subject] : ['Chỉ bắt đầu 2 phút thôi.'];
    const timer: TimerState = {
      phase: 'twoMinute',
      blockId: block.id,
      blockTitle: block.title,
      subject: block.subject,
      kind: timerKindOf(block),
      endTimestamp: Date.now() + TWO_MINUTE_MS,
      cyclesCompleted: get().timer?.cyclesCompleted ?? 0,
      twoMinutePrompt: prompts[Math.floor(Math.random() * prompts.length)],
    };
    set({ timer });
    await persist(timer);
  },

  async continueFullPomodoro() {
    const current = get().timer;
    if (!current) return;
    restoreTitle();
    const timer: TimerState = {
      ...current,
      phase: 'work',
      endTimestamp: Date.now() + WORK_MINUTES[current.kind] * 60 * 1000,
    };
    set({ timer });
    await persist(timer);
  },

  async stop() {
    restoreTitle();
    set({ timer: null });
    await persist(null);
  },

  async chooseBreak(long) {
    const current = get().timer;
    if (!current) return;
    restoreTitle();
    const minutes = long ? LONG_BREAK_MINUTES : BREAK_MINUTES[current.kind];
    const timer: TimerState = {
      ...current,
      phase: 'break',
      endTimestamp: Date.now() + minutes * 60 * 1000,
      // Nghỉ dài → chu kỳ liên tiếp làm mới.
      cyclesCompleted: long ? 0 : current.cyclesCompleted,
    };
    set({ timer });
    await persist(timer);
  },

  async completeCurrentPhase() {
    const current = get().timer;
    if (!current) return;
    const settings = useAppStore.getState().settings;

    if (current.phase === 'work') {
      await useAppStore.getState().incrementPomodoro(undefined, current.blockId);
      if (settings.soundEnabled) playTimerEndSound();
      if (settings.notificationsEnabled) notify('⏰ Hết giờ làm việc!', 'Đứng dậy nghỉ thôi.');
      setTimeUpTitle();
      const cyclesCompleted = current.cyclesCompleted + 1;
      // Sau 4 chu kỳ liên tiếp → gợi ý nghỉ dài 30 phút.
      const timer: TimerState = {
        ...current,
        cyclesCompleted,
        phase: cyclesCompleted % 4 === 0 ? 'breakChoice' : 'break',
        endTimestamp:
          cyclesCompleted % 4 === 0 ? 0 : Date.now() + BREAK_MINUTES[current.kind] * 60 * 1000,
      };
      set({ timer });
      await persist(timer);
      return;
    }

    if (current.phase === 'break') {
      if (settings.soundEnabled) playBreakEndSound();
      if (settings.notificationsEnabled) notify('Hết giờ nghỉ', 'Sẵn sàng cho pomodoro tiếp theo.');
      restoreTitle();
      set({ timer: null });
      await persist(null);
      return;
    }

    if (current.phase === 'twoMinute') {
      if (settings.soundEnabled) playBreakEndSound();
      const timer: TimerState = { ...current, phase: 'twoMinuteChoice', endTimestamp: 0 };
      set({ timer });
      await persist(timer);
    }
  },
}));
