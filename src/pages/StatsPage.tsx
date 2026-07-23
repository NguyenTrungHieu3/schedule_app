// /thong-ke — Thống kê. Theo §6.5 của spec.
// Lịch ô vuông kiểu GitHub đặt ĐẦU TIÊN — hình ảnh "không muốn làm đứt chuỗi".

import { useMemo } from 'react';
import { ChartBar, FireSimple, Gift, Medal, Timer as TimerIcon, Clock } from '@phosphor-icons/react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { selectDisplayStreak, useAppStore, weekStartOf } from '../store/appStore';
import { addDaysToDate, blockDurationMinutes, getDayOfWeek, getLogicalDate, timeToLogicalMinutes } from '../logic/date';
import { finalTierForPastDay } from '../logic/streak';
import { SUBJECT_LABELS } from '../ui/labels';
import type { DayTier, ScheduleBlock, Subject } from '../types';

// Phút/pomodoro theo kind — khớp WORK_MINUTES trong timerStore.ts (deep 50, còn lại 25).
// Block đã bị xoá khỏi lịch (không tra được kind) → coi như 'light' (ước lượng thấp hơn thật).
function minutesPerPomodoro(kind: ScheduleBlock['kind'] | undefined): number {
  return kind === 'deep' ? 50 : 25;
}

// Màu ô theo tier — không có màu đỏ (ngày trống chỉ là ô nhạt, tông tím của nền).
const TIER_CELL_COLORS: Record<DayTier | 'empty', string> = {
  gold: '#f59e0b',
  silver: '#a294c2',
  minimum: '#10b981',
  frozen: '#67e8f9',
  pending: '#e4ddf1',
  broken: '#ede8f7',
  empty: '#ede8f7',
};

export default function StatsPage() {
  const { dayLogs, scheduleBlocks, streak, rewardDraws, setDrawClaimed } = useAppStore();
  const today = getLogicalDate();

  // Đã bốc nhưng chưa bấm "Nhận" (ví dụ tắt tab giữa modal) — không để mất dấu.
  const unclaimed = rewardDraws.filter((d) => !d.claimed);

  // ===== Lịch ô vuông 1 năm =====
  const yearGrid = useMemo(() => {
    // 53 cột tuần × 7 hàng. Cột cuối chứa hôm nay; bắt đầu từ thứ Hai.
    const weeks: { date: string; tier: DayTier | 'empty' }[][] = [];
    const start = addDaysToDate(today, -364);
    // lùi về thứ Hai gần nhất trước start
    let cursor = weekStartOf(start);
    while (cursor <= today) {
      const week: { date: string; tier: DayTier | 'empty' }[] = [];
      for (let i = 0; i < 7; i++) {
        const date = addDaysToDate(cursor, i);
        if (date > today) {
          week.push({ date, tier: 'empty' });
        } else if (date === today) {
          week.push({ date, tier: dayLogs[date]?.tier ?? 'pending' });
        } else {
          const dayBlocks = scheduleBlocks.filter((b) => b.dayOfWeek === getDayOfWeek(date));
          week.push({ date, tier: dayLogs[date] ? finalTierForPastDay(dayLogs[date], dayBlocks) : 'empty' });
        }
      }
      weeks.push(week);
      cursor = addDaysToDate(cursor, 7);
    }
    return weeks;
  }, [dayLogs, scheduleBlocks, today]);

  // ===== Giờ học theo môn, theo tuần (8 tuần gần nhất) =====
  const weeklyBySubject = useMemo(() => {
    const rows: ({ week: string } & Record<Subject, number>)[] = [];
    for (let w = 7; w >= 0; w--) {
      const weekStart = addDaysToDate(weekStartOf(today), -7 * w);
      const row = { week: weekStart.slice(5), programming: 0, japanese: 0, toeic: 0 };
      for (let d = 0; d < 7; d++) {
        const log = dayLogs[addDaysToDate(weekStart, d)];
        if (!log) continue;
        for (const s of ['programming', 'japanese', 'toeic'] as Subject[]) {
          row[s] += (log.minutesBySubject[s] ?? 0) / 60;
        }
      }
      rows.push({
        ...row,
        programming: Math.round(row.programming * 10) / 10,
        japanese: Math.round(row.japanese * 10) / 10,
        toeic: Math.round(row.toeic * 10) / 10,
      });
    }
    return rows;
  }, [dayLogs, today]);

  // ===== Tổng giờ/ngày trong 30 ngày =====
  const daily30 = useMemo(() => {
    const rows: { day: string; hours: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = addDaysToDate(today, -i);
      const log = dayLogs[date];
      const minutes = log
        ? Object.values(log.minutesBySubject).reduce((a, b) => a + b, 0)
        : 0;
      rows.push({ day: date.slice(5), hours: Math.round((minutes / 60) * 10) / 10 });
    }
    return rows;
  }, [dayLogs, today]);

  // ===== Số liệu tổng =====
  const totals = useMemo(() => {
    const bySubject: Record<Subject, number> = { programming: 0, japanese: 0, toeic: 0 };
    let goldDays = 0;
    let pomodoros = 0;
    for (const log of Object.values(dayLogs)) {
      for (const s of ['programming', 'japanese', 'toeic'] as Subject[]) {
        bySubject[s] += log.minutesBySubject[s] ?? 0;
      }
      if (log.tier === 'gold') goldDays += 1;
      pomodoros += log.pomodorosCompleted;
    }
    return { bySubject, goldDays, pomodoros };
  }, [dayLogs]);

  // ===== Giờ tập trung THỰC (từ số pomodoro đã chạy) — khác "Tổng giờ học" ở
  // trên vốn là phút KẾ HOẠCH của block đã tick, không phải thời gian ngồi thật.
  const focusMinutes = useMemo(() => {
    const blockById = new Map(scheduleBlocks.map((b) => [b.id, b]));
    let total = 0;
    for (const log of Object.values(dayLogs)) {
      if (!log.pomodorosByBlock) continue;
      for (const [blockId, count] of Object.entries(log.pomodorosByBlock)) {
        total += count * minutesPerPomodoro(blockById.get(blockId)?.kind);
      }
    }
    return total;
  }, [dayLogs, scheduleBlocks]);

  // ===== Giờ học theo khung giờ trong ngày (toàn bộ lịch sử, rổ 2 tiếng) =====
  const timeOfDayBuckets = useMemo(() => {
    const blockById = new Map(scheduleBlocks.map((b) => [b.id, b]));
    const BUCKET_HOURS = 2;
    const bucketCount = 12; // trục ngày logic 04:00 → 28:00, mỗi rổ 2h
    const sums = new Array(bucketCount).fill(0) as number[];
    for (const log of Object.values(dayLogs)) {
      for (const blockId of log.completedBlockIds) {
        const block = blockById.get(blockId);
        if (!block || block.kind === 'rest') continue;
        const offsetMin = timeToLogicalMinutes(block.startTime) - 4 * 60;
        const idx = Math.floor(offsetMin / (BUCKET_HOURS * 60));
        if (idx >= 0 && idx < bucketCount) {
          sums[idx] += blockDurationMinutes(block.startTime, block.endTime) / 60;
        }
      }
    }
    return sums.map((hours, i) => ({
      range: `${(4 + i * BUCKET_HOURS) % 24}h`,
      hours: Math.round(hours * 10) / 10,
    }));
  }, [dayLogs, scheduleBlocks]);

  // ===== Lịch sử bốc thưởng =====
  const drawStats = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of rewardDraws) counts.set(d.slipTextSnapshot, (counts.get(d.slipTextSnapshot) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
  }, [rewardDraws]);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 flex items-center gap-2 text-2xl font-extrabold tracking-tight text-slate-900">
        <ChartBar size={26} weight="fill" className="text-primary" />
        Thống kê
      </h1>

      {/* Lịch chuỗi 1 năm */}
      <div className="mb-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-500">Một năm của bạn</h2>
        <div className="flex gap-[3px]" style={{ minWidth: 700 }}>
          {yearGrid.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((cell) => (
                <div
                  key={cell.date}
                  title={`${cell.date}`}
                  className="size-3 rounded-[2px]"
                  style={{ backgroundColor: TIER_CELL_COLORS[cell.tier] }}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
          <LegendDot color={TIER_CELL_COLORS.gold} label="Vàng" />
          <LegendDot color={TIER_CELL_COLORS.silver} label="Bạc" />
          <LegendDot color={TIER_CELL_COLORS.minimum} label="Tối thiểu" />
          <LegendDot color={TIER_CELL_COLORS.frozen} label="Freeze" />
          <LegendDot color={TIER_CELL_COLORS.empty} label="Trống" />
        </div>
      </div>

      {/* Số liệu tổng */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          icon={<FireSimple size={16} weight="fill" className="text-amber-500" />}
          label="Chuỗi dài nhất"
          value={`${Math.max(streak.longestStreak, selectDisplayStreak({ scheduleBlocks, dayLogs, streak }))} ngày`}
        />
        <StatCard icon={<Medal size={16} weight="fill" className="text-amber-500" />} label="Số Ngày Vàng" value={`${totals.goldDays}`} />
        <StatCard icon={<TimerIcon size={16} weight="fill" className="text-primary" />} label="Tổng pomodoro" value={`${totals.pomodoros}`} />
        <StatCard
          icon={<Clock size={16} weight="fill" className="text-primary" />}
          label="Tổng giờ học"
          value={`${Math.round(Object.values(totals.bySubject).reduce((a, b) => a + b, 0) / 60)}h`}
        />
        <StatCard
          icon={<TimerIcon size={16} weight="fill" className="text-emerald-500" />}
          label="Giờ tập trung (pomodoro)"
          value={`${Math.round(focusMinutes / 60)}h`}
        />
      </div>
      <div className="mb-6 grid grid-cols-3 gap-3">
        {(['programming', 'japanese', 'toeic'] as Subject[]).map((s) => (
          <StatCard key={s} label={SUBJECT_LABELS[s]} value={`${Math.round(totals.bySubject[s] / 60)}h`} />
        ))}
      </div>

      {/* Giờ học theo khung giờ trong ngày — tìm ra "giờ vàng" học tốt nhất */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-500">Giờ học theo khung giờ trong ngày</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={timeOfDayBuckets}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="range" tick={{ fontSize: 11 }} />
            <YAxis width={28} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="hours" name="giờ" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Giờ học theo môn theo tuần */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-500">Giờ học theo môn, theo tuần</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={weeklyBySubject}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="week" tick={{ fontSize: 11 }} />
            <YAxis width={28} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="programming" name="Lập trình" stackId="a" fill="#0ea5e9" />
            <Bar dataKey="japanese" name="Tiếng Nhật" stackId="a" fill="#fb7185" />
            <Bar dataKey="toeic" name="TOEIC" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tổng giờ/ngày 30 ngày */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-500">Tổng giờ mỗi ngày — 30 ngày qua</h2>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={daily30}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={4} />
            <YAxis width={28} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="hours" name="giờ" stroke="#10b981" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Phần thưởng đã bốc nhưng chưa nhận — tắt tab giữa modal cũng không mất */}
      {unclaimed.length > 0 && (
        <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-amber-800">
            <Gift size={15} weight="fill" className="text-amber-500" />
            Phần thưởng chưa nhận ({unclaimed.length})
          </h2>
          <ul className="flex flex-col gap-1.5 text-sm">
            {unclaimed.map((d) => (
              <li key={d.id} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2">
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    d.box === 'big' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {d.box === 'big' ? 'Hộp lớn' : 'Hộp nhỏ'}
                </span>
                <span className="flex-1 font-semibold text-slate-700">{d.slipTextSnapshot}</span>
                <span className="hidden text-xs text-slate-400 tabular-nums sm:inline">{d.drawnAt.slice(0, 10)}</span>
                <button
                  type="button"
                  onClick={() => void setDrawClaimed(d.id, true)}
                  className="shrink-0 rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-200"
                >
                  Đã nhận
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Lịch sử bốc thưởng */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-slate-500">
          <Gift size={15} weight="fill" className="text-amber-500" />
          Đã trúng gì bao nhiêu lần
        </h2>
        {drawStats.length === 0 ? (
          <p className="text-sm font-semibold text-slate-400">Chưa bốc lần nào.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {drawStats.map(([text, count]) => (
              <li key={text} className="flex justify-between border-b border-slate-50 py-1">
                <span>{text}</span>
                <span className="font-mono text-slate-400">×{count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border-2 border-slate-200 bg-white p-4">
      <p className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-xl font-extrabold tabular-nums">{value}</p>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="size-3 rounded-[2px]" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
