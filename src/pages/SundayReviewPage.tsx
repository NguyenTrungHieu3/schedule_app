// /ra-soat — Rà soát chủ nhật. Theo §6.6 của spec.
// Form 4 câu, kèm số liệu tuần hiển thị sẵn để trả lời có căn cứ.

import { useMemo, useState } from 'react';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { useAppStore, weekStartOf } from '../store/appStore';
import { addDaysToDate, getDayOfWeek, getLogicalDate } from '../logic/date';
import { finalTierForPastDay } from '../logic/streak';
import { SUBJECT_LABELS, TIER_LABELS } from '../ui/labels';
import type { Subject, WeeklyReview } from '../types';

export default function SundayReviewPage() {
  const { dayLogs, scheduleBlocks, weeklyReviews, saveWeeklyReview } = useAppStore();
  const today = getLogicalDate();
  const thisWeekStart = weekStartOf(today);
  const existing = weeklyReviews.find((r) => r.weekStartDate === thisWeekStart);

  const [skippedBlocks, setSkippedBlocks] = useState(existing?.skippedBlocks ?? '');
  const [avoidedSubject, setAvoidedSubject] = useState(existing?.avoidedSubject ?? '');
  const [rewardBoxStillFun, setRewardBoxStillFun] = useState(existing?.rewardBoxStillFun ?? true);
  const [nightsSlept7h, setNightsSlept7h] = useState(existing?.nightsSlept7h ?? 5);
  const [saved, setSaved] = useState(false);

  // Số liệu tuần này để trả lời có căn cứ.
  const weekStats = useMemo(() => {
    const bySubject: Record<Subject, number> = { programming: 0, japanese: 0, toeic: 0 };
    const tiers: string[] = [];
    for (let i = 0; i < 7; i++) {
      const date = addDaysToDate(thisWeekStart, i);
      if (date > today) break;
      const log = dayLogs[date];
      const dayBlocks = scheduleBlocks.filter((b) => b.dayOfWeek === getDayOfWeek(date));
      const tier = date === today ? (log?.tier ?? 'pending') : finalTierForPastDay(log, dayBlocks);
      tiers.push(`${['CN','T2','T3','T4','T5','T6','T7'][getDayOfWeek(date)]}: ${TIER_LABELS[tier].emoji}`);
      if (log) {
        for (const s of Object.keys(bySubject) as Subject[]) bySubject[s] += log.minutesBySubject[s] ?? 0;
      }
    }
    return { bySubject, tiers };
  }, [dayLogs, scheduleBlocks, thisWeekStart, today]);

  async function handleSave() {
    const review: WeeklyReview = {
      weekStartDate: thisWeekStart,
      skippedBlocks,
      avoidedSubject,
      rewardBoxStillFun,
      nightsSlept7h,
      createdAt: new Date().toISOString(),
    };
    await saveWeeklyReview(review);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 flex items-center gap-2 text-2xl font-extrabold tracking-tight text-slate-900">
        <MagnifyingGlass size={26} weight="fill" className="text-primary" />
        Rà soát chủ nhật
      </h1>
      <p className="mb-6 text-sm font-semibold text-slate-500">Tuần bắt đầu {thisWeekStart}. 5 phút nhìn lại — không phán xét, chỉ điều chỉnh.</p>

      {/* Số liệu tuần */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 text-sm">
        <p className="mb-2 font-semibold text-slate-500">Tuần vừa rồi của bạn</p>
        <p className="mb-2">{weekStats.tiers.join(' · ')}</p>
        <div className="flex gap-4">
          {(Object.keys(SUBJECT_LABELS) as Subject[]).map((s) => (
            <span key={s} className="text-slate-500">
              {SUBJECT_LABELS[s]}: <span className="font-semibold text-slate-700">{Math.round(weekStats.bySubject[s] / 6) / 10}h</span>
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold">1. Tuần này mình hay bỏ block nào? Vì sao?</span>
          <textarea value={skippedBlocks} onChange={(e) => setSkippedBlocks(e.target.value)} rows={2} className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-400" placeholder="Ví dụ: block active recall buổi tối — vì về muộn quá mệt" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold">2. Môn nào mình đang né? </span>
          <textarea value={avoidedSubject} onChange={(e) => setAvoidedSubject(e.target.value)} rows={2} className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-400" placeholder="Nhìn số giờ ở trên — môn nào ít bất thường?" />
        </label>
        <div className="text-sm">
          <p className="mb-2 font-semibold">3. Hộp phần thưởng còn vui không?</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setRewardBoxStillFun(true)} className={`rounded-xl px-4 py-2 font-medium ${rewardBoxStillFun ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-400' : 'bg-slate-100 text-slate-500'}`}>
              Còn vui 🎁
            </button>
            <button type="button" onClick={() => setRewardBoxStillFun(false)} className={`rounded-xl px-4 py-2 font-medium ${!rewardBoxStillFun ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-400' : 'bg-slate-100 text-slate-500'}`}>
              Hơi nhạt rồi — CN này nạp giấy mới
            </button>
          </div>
        </div>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold">4. Mấy đêm ngủ đủ 7 tiếng?</span>
          <div className="flex items-center gap-3">
            <input type="range" min={0} max={7} value={nightsSlept7h} onChange={(e) => setNightsSlept7h(Number(e.target.value))} className="flex-1 accent-slate-900" />
            <span className="w-12 text-center font-mono font-bold">{nightsSlept7h}/7</span>
          </div>
        </label>
        <button type="button" onClick={() => void handleSave()} className="btn-3d rounded-2xl bg-primary py-2.5 font-extrabold text-white [--edge:#5a41a3]">
          {saved ? 'Đã lưu' : existing ? 'Cập nhật bản rà soát' : 'Lưu bản rà soát'}
        </button>
      </div>

      {/* Các bản cũ */}
      {weeklyReviews.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">Các tuần trước</h2>
          <ul className="flex flex-col gap-2">
            {weeklyReviews.map((r) => (
              <li key={r.weekStartDate} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                <p className="font-semibold">Tuần {r.weekStartDate} · ngủ đủ {r.nightsSlept7h}/7 đêm · hộp thưởng {r.rewardBoxStillFun ? 'còn vui' : 'cần làm mới'}</p>
                {r.skippedBlocks && <p className="mt-1 text-slate-500">Bỏ block: {r.skippedBlocks}</p>}
                {r.avoidedSubject && <p className="text-slate-500">Đang né: {r.avoidedSubject}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
