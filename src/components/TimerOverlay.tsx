// Màn hình timer toàn màn hình — hiện khi có phiên Pomodoro / 2 phút đang chạy.
// remaining luôn tính từ endTimestamp nên tab nền / reload không làm sai giờ;
// interval chỉ để re-render.

import { useEffect, useState } from 'react';
import { useTimerStore } from '../store/timerStore';
import { SUBJECT_LABELS } from '../ui/labels';

function formatCountdown(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export default function TimerOverlay() {
  const { timer, completeCurrentPhase, stop, continueFullPomodoro, chooseBreak } = useTimerStore();
  const [, forceRender] = useState(0);

  const counting = timer !== null && timer.endTimestamp > 0;

  useEffect(() => {
    if (!counting) return;
    const interval = setInterval(() => forceRender((n) => n + 1), 250);
    return () => clearInterval(interval);
  }, [counting]);

  useEffect(() => {
    if (!counting) return;
    const remaining = timer.endTimestamp - Date.now();
    if (remaining <= 0) {
      void completeCurrentPhase();
    }
  });

  if (!timer) return null;

  const remaining = Math.max(0, timer.endTimestamp - Date.now());

  if (timer.phase === 'work') {
    const totalMs = (timer.kind === 'deep' ? 50 : 25) * 60 * 1000;
    const progress = Math.min(100, ((totalMs - remaining) / totalMs) * 100);
    return (
      <Fullscreen tone="dark">
        <p className="text-sm font-extrabold uppercase tracking-widest text-slate-400">
          {timer.subject ? SUBJECT_LABELS[timer.subject] : 'Tập trung'} · pomodoro{' '}
          {timer.cyclesCompleted + 1}
        </p>
        <p className="mt-2 max-w-lg text-balance text-center text-xl font-bold">{timer.blockTitle}</p>
        <p className="my-8 text-7xl font-extrabold tabular-nums md:text-8xl">
          {formatCountdown(remaining)}
        </p>
        <div className="h-2 w-64 overflow-hidden rounded-full bg-white/15">
          <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <button type="button" onClick={() => void stop()} className="mt-8 rounded-xl px-4 py-2 text-sm font-bold text-slate-400 transition-colors hover:bg-white/10">
          Dừng phiên này
        </button>
      </Fullscreen>
    );
  }

  if (timer.phase === 'break') {
    return (
      <Fullscreen tone="calm">
        {/* Nội dung có chủ đích theo spec — giữ nguyên */}
        <p className="max-w-xl text-balance text-center text-3xl font-extrabold leading-snug md:text-4xl">
          Đứng dậy. Uống nước. Nhìn ra xa. Đừng mở điện thoại.
        </p>
        <p className="my-8 text-6xl font-extrabold tabular-nums">{formatCountdown(remaining)}</p>
        <button type="button" onClick={() => void stop()} className="rounded-xl px-4 py-2 text-sm text-emerald-100/70 hover:bg-white/10">
          Bỏ qua phần nghỉ
        </button>
      </Fullscreen>
    );
  }

  if (timer.phase === 'breakChoice') {
    return (
      <Fullscreen tone="calm">
        <p className="text-center text-2xl font-extrabold">4 chu kỳ liên tiếp rồi!</p>
        <p className="mt-2 font-semibold text-emerald-100/80">Nghỉ dài 30 phút cho lại sức nhé?</p>
        <div className="mt-8 flex gap-4">
          <button type="button" onClick={() => void chooseBreak(true)} className="btn-3d rounded-2xl bg-white px-6 py-3 font-extrabold text-emerald-800 [--edge:#059669]">
            Nghỉ dài 30 phút
          </button>
          <button type="button" onClick={() => void chooseBreak(false)} className="rounded-2xl border-2 border-white/40 px-6 py-3 font-extrabold text-white transition-colors hover:bg-white/10">
            Nghỉ ngắn thôi
          </button>
        </div>
      </Fullscreen>
    );
  }

  if (timer.phase === 'twoMinute') {
    return (
      <Fullscreen tone="dark">
        <p className="max-w-lg text-balance text-center text-2xl font-extrabold leading-snug md:text-3xl">
          {timer.twoMinutePrompt}
        </p>
        <p className="my-8 text-7xl font-extrabold tabular-nums">{formatCountdown(remaining)}</p>
        <p className="text-sm font-bold text-slate-400">Chỉ 2 phút thôi.</p>
      </Fullscreen>
    );
  }

  // twoMinuteChoice — hai lựa chọn CÂN BẰNG về mặt thị giác (yêu cầu spec §4.8):
  // "Dừng ở đây" dừng thật, không phạt, không hỏi lại, không mặt buồn.
  return (
    <Fullscreen tone="dark">
      <p className="text-center text-2xl font-extrabold">Hết 2 phút.</p>
      <div className="mt-8 flex gap-4">
        <button type="button" onClick={() => void continueFullPomodoro()} className="btn-3d w-44 rounded-2xl bg-white px-6 py-4 text-lg font-extrabold text-slate-900 [--edge:#a294c2]">
          Học tiếp
        </button>
        <button type="button" onClick={() => void stop()} className="btn-3d w-44 rounded-2xl bg-white px-6 py-4 text-lg font-extrabold text-slate-900 [--edge:#a294c2]">
          Dừng ở đây
        </button>
      </div>
    </Fullscreen>
  );
}

function Fullscreen({ tone, children }: { tone: 'dark' | 'calm'; children: React.ReactNode }) {
  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center px-6 ${
        tone === 'dark' ? 'bg-slate-900 text-white' : 'bg-emerald-700 text-white'
      }`}
    >
      {children}
    </div>
  );
}
