// /tuan — Lịch tuần. Theo §6.2 của spec.
// Click vào ngày quá khứ → xem/sửa DayLog và dùng freeze token.

import { useState } from 'react';
import { CalendarBlank, CaretLeft, CaretRight, Snowflake } from '@phosphor-icons/react';
import { useAppStore, weekStartOf } from '../store/appStore';
import { TIER_ICONS } from '../ui/TierBadge';
import { addDaysToDate, blockDurationMinutes, getDayOfWeek, getLogicalDate } from '../logic/date';
import { canUnfreezeDay, canUseFreezeToken, finalTierForPastDay } from '../logic/streak';
import { computeTier } from '../logic/tier';
import { SUBJECT_COLORS, TIER_LABELS } from '../ui/labels';
import type { DayTier, ScheduleBlock } from '../types';

const DAY_NAMES = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export default function WeekPage() {
  const { scheduleBlocks, dayLogs, streak } = useAppStore();
  const today = getLogicalDate();
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const weekStart = addDaysToDate(weekStartOf(today), weekOffset * 7);
  const weekDates = Array.from({ length: 7 }, (_, i) => addDaysToDate(weekStart, i));

  function tierOf(date: string): DayTier | null {
    const dayBlocks = scheduleBlocks.filter((b) => b.dayOfWeek === getDayOfWeek(date));
    if (date > today) return null;
    if (date === today) {
      const log = dayLogs[date];
      return computeTier({
        dayBlocks,
        completedBlockIds: log?.completedBlockIds ?? [],
        isToday: true,
        frozen: log?.tier === 'frozen',
      });
    }
    return finalTierForPastDay(dayLogs[date], dayBlocks);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-slate-900">
          <CalendarBlank size={26} weight="fill" className="text-primary" />
          Lịch tuần
        </h1>
        <div className="flex items-center gap-2 text-sm">
          <button type="button" aria-label="Tuần trước" onClick={() => setWeekOffset(weekOffset - 1)} className="rounded-lg bg-white px-3 py-1.5 font-bold transition-colors hover:bg-slate-100"><CaretLeft size={14} weight="bold" /></button>
          <span className="font-bold text-slate-500 tabular-nums">{weekStart}</span>
          <button type="button" aria-label="Tuần sau" onClick={() => setWeekOffset(weekOffset + 1)} className="rounded-lg bg-white px-3 py-1.5 font-bold transition-colors hover:bg-slate-100"><CaretRight size={14} weight="bold" /></button>
          {weekOffset !== 0 && (
            <button type="button" onClick={() => setWeekOffset(0)} className="rounded-lg px-2 py-1.5 text-slate-400 hover:text-slate-600">
              Tuần này
            </button>
          )}
        </div>
      </div>

      {/* Lưới 7 cột */}
      <div className="grid grid-cols-7 gap-1.5 overflow-x-auto">
        {weekDates.map((date) => {
          const isToday = date === today;
          const blocks = scheduleBlocks
            .filter((b) => b.dayOfWeek === getDayOfWeek(date))
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
          const completed = new Set(dayLogs[date]?.completedBlockIds ?? []);
          return (
            <div
              key={date}
              className={`min-w-24 rounded-xl border bg-white p-1.5 ${isToday ? 'border-2 border-slate-900' : 'border-slate-200'}`}
            >
              <p className={`mb-1.5 text-center text-xs font-semibold ${isToday ? 'text-slate-900' : 'text-slate-400'}`}>
                {DAY_NAMES[getDayOfWeek(date)]} <span className="font-normal">{date.slice(8)}</span>
              </p>
              <div className="flex flex-col gap-1">
                {blocks.map((b) => (
                  <WeekBlockCell key={b.id} block={b} done={completed.has(b.id)} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dải tier 7 ngày */}
      <div className="mt-4 grid grid-cols-7 gap-1.5">
        {weekDates.map((date) => {
          const tier = tierOf(date);
          const info = tier ? TIER_LABELS[tier] : null;
          const clickable = date <= today;
          return (
            <button
              key={date}
              type="button"
              disabled={!clickable}
              onClick={() => setSelectedDate(date)}
              className={`flex h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-xs font-bold transition-transform ${
                info ? info.className : 'bg-slate-50 text-slate-300'
              } ${clickable ? 'hover:scale-105' : 'cursor-default'}`}
              title={clickable ? 'Xem / sửa ngày này' : ''}
            >
              {tier ? TIER_ICONS[tier] : <span>·</span>}
              {info?.label ?? ''}
            </button>
          );
        })}
      </div>
      <p className="mt-2 flex items-center justify-center gap-1 text-center text-xs font-semibold text-slate-400">
        Bấm vào ô ngày để xem lại / sửa / dùng thẻ freeze
        <Snowflake size={12} weight="bold" className="text-cyan-500" />
        ({streak.freezeTokensRemaining} thẻ còn lại)
      </p>

      {selectedDate && <DayDetailModal date={selectedDate} onClose={() => setSelectedDate(null)} />}
    </div>
  );
}

function WeekBlockCell({ block, done }: { block: ScheduleBlock; done: boolean }) {
  const colors = block.subject ? SUBJECT_COLORS[block.subject] : null;
  const isRest = block.kind === 'rest';
  return (
    <div
      className={`rounded-md px-1.5 py-1 text-[10px] leading-tight ${
        isRest ? 'bg-slate-50 text-slate-300' : colors ? `${colors.bg} ${colors.text}` : 'bg-slate-100 text-slate-500'
      } ${done ? 'opacity-60' : ''}`}
      title={`${block.startTime}–${block.endTime} ${block.title}`}
    >
      <span className="font-mono">{block.startTime}</span> {done && '✓'}
      <p className="truncate">{block.title}</p>
    </div>
  );
}

// Modal xem/sửa một ngày (quá khứ hoặc hôm nay) + dùng/huỷ freeze token + ghi chú.
function DayDetailModal({ date, onClose }: { date: string; onClose: () => void }) {
  const { scheduleBlocks, dayLogs, streak, toggleBlock, useFreezeToken, unfreezeDay, setDayNote } = useAppStore();
  const today = getLogicalDate();
  const blocks = scheduleBlocks
    .filter((b) => b.dayOfWeek === getDayOfWeek(date))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const log = dayLogs[date];
  const completed = new Set(log?.completedBlockIds ?? []);
  const [note, setNote] = useState(log?.note ?? '');

  const tier =
    date === today
      ? computeTier({ dayBlocks: blocks, completedBlockIds: [...completed], isToday: true, frozen: log?.tier === 'frozen' })
      : finalTierForPastDay(log, blocks);
  const tierInfo = TIER_LABELS[tier];

  const freezeOk = canUseFreezeToken({ date, today, streak, dayLogs, scheduleBlocks });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <p className="font-extrabold tabular-nums">{date}</p>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${tierInfo.className}`}>
            {TIER_ICONS[tier]} {tierInfo.label}
          </span>
        </div>

        {freezeOk && (
          <button
            type="button"
            onClick={() => void useFreezeToken(date).then((ok) => ok && onClose())}
            className="btn-3d mb-3 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-cyan-100 py-2.5 text-sm font-extrabold text-cyan-700 [--edge:#0e7490]"
          >
            <Snowflake size={15} weight="bold" />
            Dùng 1 thẻ freeze cho ngày này (còn {streak.freezeTokensRemaining})
          </button>
        )}
        {/* Gắn freeze nhầm → huỷ được, hoàn lại thẻ */}
        {canUnfreezeDay(log, date, today) && (
          <button
            type="button"
            onClick={() => void unfreezeDay(date).then((ok) => ok && onClose())}
            className="btn-3d mb-3 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-slate-100 py-2.5 text-sm font-extrabold text-slate-600 [--edge:#7d6f9e]"
          >
            <Snowflake size={15} weight="bold" />
            Huỷ freeze ngày này — hoàn lại 1 thẻ
          </button>
        )}

        <ul className="flex flex-col gap-1">
          {blocks.map((b) => {
            const isRest = b.kind === 'rest' && !b.isTrueRest;
            const minutes = blockDurationMinutes(b.startTime, b.endTime);
            return (
              <li key={b.id} className={`flex items-center gap-2 rounded-lg border border-slate-100 px-2 py-1.5 text-sm ${isRest ? 'opacity-40' : ''}`}>
                {!isRest ? (
                  <input type="checkbox" checked={completed.has(b.id)} onChange={() => void toggleBlock(b.id, date)} className="size-4 accent-emerald-600" />
                ) : (
                  <span className="w-4 text-center text-slate-300">·</span>
                )}
                <span className="font-mono text-xs text-slate-400">{b.startTime}</span>
                <span className="flex-1 truncate">{b.title}</span>
                {b.kind !== 'rest' && <span className="text-[10px] text-slate-400">{minutes}p</span>}
              </li>
            );
          })}
        </ul>

        {/* Ghi chú tự do cho ngày — lưu khi rờ ô nhập hoặc bấm Xong */}
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => void setDayNote(date, note)}
          rows={2}
          placeholder="Ghi chú cho ngày này (mệt, ốm, bận đột xuất…)"
          className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
        />

        <button
          type="button"
          onClick={() => {
            void setDayNote(date, note);
            onClose();
          }}
          className="btn-3d mt-4 w-full rounded-2xl bg-primary py-2.5 font-extrabold text-white [--edge:#5a41a3]"
        >
          Xong
        </button>
      </div>
    </div>
  );
}
