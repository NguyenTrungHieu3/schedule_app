import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  CaretRight,
  CheckFat,
  Clock,
  Confetti as ConfettiIcon,
  DownloadSimple,
  FireSimple,
  Gift,
  MagnifyingGlass,
  Play,
  Snowflake,
  SunHorizon,
} from '@phosphor-icons/react';
import { buildReviewQueue } from '../logic/srs';
import { useAppStore, selectTodayBlocks, selectDisplayStreak, weekStartOf } from '../store/appStore';
import { useTimerStore } from '../store/timerStore';
import { countAvailable } from '../logic/reward';
import RewardModal from '../components/RewardModal';
import Confetti from '../components/Confetti';
import TierBadge from '../ui/TierBadge';
import { SubjectIcon } from '../ui/subjectIcons';
import { blockDurationMinutes, daysBetween, getDayOfWeek, timeToLogicalMinutes } from '../logic/date';
import { useClockStore } from '../store/clockStore';
import { computeDayStats, MINIMUM_MINUTES_PER_SUBJECT, computeTier } from '../logic/tier';
import { SUBJECT_COLORS, SUBJECT_LABELS } from '../ui/labels';
import type { RewardBox, ScheduleBlock, Subject } from '../types';

function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}p`;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
}

const DAY_TITLES = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

export default function TodayPage() {
  const { scheduleBlocks, dayLogs, streak, toggleBlock, pendingRewards, justHitMilestone, clearMilestone, reviewItems, weeklyReviews, settings } = useAppStore();
  // Ngày logic + "bây giờ" lấy từ đồng hồ trung tâm — tự cập nhật khi qua 04:00,
  // không cần reload trang (xem clockStore).
  const today = useClockStore((s) => s.logicalDate);
  const nowMinutes = useClockStore((s) => s.nowMinutes);
  const [drawingBox, setDrawingBox] = useState<RewardBox | null>(null);
  const srsDueCount = buildReviewQueue(reviewItems, today).visible.length;

  // Nhắc rà soát vào Chủ nhật (nếu tuần này chưa làm).
  const isSunday = getDayOfWeek(today) === 0;
  const reviewedThisWeek = weeklyReviews.some((r) => r.weekStartDate === weekStartOf(today));

  // Nhắc backup mỗi 30 ngày (§1.5).
  const backupOverdue =
    settings.lastBackupDate === null || daysBetween(settings.lastBackupDate, today) >= 30;

  const todayBlocks = selectTodayBlocks({ scheduleBlocks });
  const log = dayLogs[today];
  const completedIds = log?.completedBlockIds ?? [];
  const completedSet = new Set(completedIds);

  const stats = computeDayStats(todayBlocks, completedIds);
  const tier = computeTier({
    dayBlocks: todayBlocks,
    completedBlockIds: completedIds,
    isToday: true,
    frozen: log?.tier === 'frozen',
  });

  // Việc tiếp theo: block học đầu tiên (không phải rest) chưa tick.
  const nextBlock = todayBlocks.find((b) => b.kind !== 'rest' && !completedSet.has(b.id));

  const bigDrawsAvailable = countAvailable(pendingRewards, 'big');

  return (
    <div className="mx-auto max-w-2xl">
      {drawingBox && <RewardModal box={drawingBox} onClose={() => setDrawingBox(null)} />}

      {/* Chạm mốc chuỗi → confetti + chúc mừng */}
      {justHitMilestone !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" onClick={clearMilestone}>
          <Confetti />
          <div className="animate-pop-in rounded-3xl bg-white p-8 text-center shadow-2xl">
            <FireSimple size={56} weight="fill" className="mx-auto animate-flame text-amber-500" />
            <p className="mt-3 text-2xl font-extrabold">Chuỗi {justHitMilestone} ngày!</p>
            <p className="mt-2 font-semibold text-slate-500">
              Bạn được {justHitMilestone === 14 ? '2 lượt' : '1 lượt'} bốc hộp lớn
            </p>
            <button type="button" onClick={clearMilestone} className="btn-3d mt-5 rounded-2xl bg-primary px-8 py-3 font-extrabold text-white [--edge:#5a41a3]">
              Tuyệt!
            </button>
          </div>
        </div>
      )}

      {/* Tiêu đề ngày + tier */}
      <header className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            {DAY_TITLES[getDayOfWeek(today)]}
          </h1>
          <p className="text-sm font-semibold text-slate-400 tabular-nums">{today}</p>
        </div>
        <div className="flex items-center gap-2">
          <TierBadge tier={tier} size="lg" />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-sm font-bold text-slate-600 tabular-nums">
            <Clock size={14} weight="bold" />
            {formatHours(stats.totalCompletedMinutes)}/{formatHours(stats.totalPlannedMinutes)}
          </span>
          {/* Sidebar đã có chuỗi + freeze; trên mobile hiện ở đây */}
          <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-sm font-bold text-slate-600 tabular-nums md:hidden">
            <FireSimple size={14} weight="fill" className="text-amber-500" />
            {selectDisplayStreak({ scheduleBlocks, dayLogs, streak })}
            <Snowflake size={13} weight="bold" className="ml-1.5 text-cyan-500" />
            {streak.freezeTokensRemaining}
          </span>
        </div>
      </header>

      {isSunday && !reviewedThisWeek && (
        <Link to="/ra-soat" className="mb-3 flex items-center gap-2.5 rounded-2xl border-2 border-slate-200 bg-white p-3.5 text-sm font-bold text-slate-600 transition-colors hover:border-primary hover:text-primary-dark">
          <MagnifyingGlass size={18} weight="bold" />
          Chủ nhật rồi — 5 phút rà soát tuần nhé?
          <CaretRight size={14} weight="bold" className="ml-auto" />
        </Link>
      )}
      {backupOverdue && (
        <Link to="/cai-dat" className="mb-3 flex items-center gap-2.5 rounded-2xl border-2 border-slate-200 bg-white p-3.5 text-sm font-bold text-slate-600 transition-colors hover:border-primary hover:text-primary-dark">
          <DownloadSimple size={18} weight="bold" />
          Đã lâu chưa backup — vào Cài đặt bấm Export JSON cho chắc
          <CaretRight size={14} weight="bold" className="ml-auto" />
        </Link>
      )}

      {/* Thẻ "Việc tiếp theo" */}
      {nextBlock ? (
        <NextBlockCard block={nextBlock} nowMinutes={nowMinutes} pomodorosDone={log?.pomodorosByBlock?.[nextBlock.id] ?? 0} />
      ) : (
        <div className="card mb-6 border-emerald-200 bg-emerald-50 p-8 text-center">
          <ConfettiIcon size={40} weight="fill" className="mx-auto text-emerald-500" />
          <p className="mt-2 text-lg font-extrabold text-emerald-700">Hết việc hôm nay rồi</p>
          <p className="mt-1 text-sm font-semibold text-emerald-600">Nghỉ ngơi xứng đáng.</p>
        </div>
      )}

      {/* Lượt bốc hộp lớn (Ngày Vàng / mock test / mốc chuỗi) */}
      {bigDrawsAvailable > 0 && (
        <div className="card mb-6 flex items-center justify-between gap-3 border-amber-300 bg-amber-50 p-4">
          <p className="flex items-center gap-2 font-extrabold text-amber-800">
            <Gift size={22} weight="fill" className="text-amber-500" />
            Bạn có {bigDrawsAvailable} lượt bốc hộp lớn!
          </p>
          <button
            type="button"
            onClick={() => setDrawingBox('big')}
            className="btn-3d rounded-2xl bg-amber-400 px-5 py-2.5 font-extrabold text-amber-950 [--edge:#b45309]"
          >
            Bốc ngay
          </button>
        </div>
      )}

      {/* Timeline hôm nay */}
      <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wider text-slate-400">
        Hôm nay
      </h2>
      <ul className="mb-7 flex flex-col gap-2">
        {todayBlocks.map((block, i) => (
          <TimelineRow
            key={block.id}
            block={block}
            index={i}
            completed={completedSet.has(block.id)}
            nowMinutes={nowMinutes}
            pomodorosDone={log?.pomodorosByBlock?.[block.id] ?? 0}
            onToggle={() => toggleBlock(block.id)}
            canDrawSmall={pendingRewards.available.some((g) => g.key === `small:${today}:${block.id}`)}
            onDrawSmall={() => setDrawingBox('small')}
          />
        ))}
      </ul>

      {/* Hộp SRS đến hạn */}
      {srsDueCount > 0 && (
        <div className="card mb-6 flex items-center justify-between gap-3 p-4">
          <p className="flex items-center gap-2.5 text-sm font-bold text-slate-600">
            <BookOpen size={22} weight="fill" className="text-primary" />
            Hôm nay có <span className="text-slate-900">{srsDueCount} item</span> cần ôn
          </p>
          <Link to="/on-tap" className="btn-3d rounded-2xl bg-primary px-4 py-2 text-sm font-extrabold text-white [--edge:#5a41a3]">
            Ôn ngay
          </Link>
        </div>
      )}

      {/* Thanh tiến độ 3 môn — vạch 30 phút là ngưỡng cứu chuỗi khi mệt */}
      <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wider text-slate-400">
        Tiến độ 3 môn
      </h2>
      <div className="card flex flex-col gap-4 p-5">
        {(Object.keys(SUBJECT_LABELS) as Subject[]).map((subject) => (
          <SubjectProgressBar
            key={subject}
            subject={subject}
            doneMinutes={stats.minutesBySubject[subject]}
            plannedMinutes={plannedMinutesFor(todayBlocks, subject)}
          />
        ))}
      </div>
    </div>
  );
}

function plannedMinutesFor(blocks: ScheduleBlock[], subject: Subject): number {
  return blocks
    .filter((b) => b.subject === subject && b.kind !== 'rest')
    .reduce((sum, b) => sum + blockDurationMinutes(b.startTime, b.endTime), 0);
}

function NextBlockCard({ block, nowMinutes, pomodorosDone }: { block: ScheduleBlock; nowMinutes: number; pomodorosDone: number }) {
  const { startWork, startTwoMinute } = useTimerStore();
  const start = timeToLogicalMinutes(block.startTime);
  const end = timeToLogicalMinutes(block.endTime);
  const inWindow = nowMinutes >= start && nowMinutes < end;
  const isLate = nowMinutes >= end;
  const colors = block.subject ? SUBJECT_COLORS[block.subject] : null;

  return (
    <div className="card relative mb-6 overflow-hidden p-6">
      {/* Rail màu môn bên trái */}
      <span className={`absolute inset-y-0 left-0 w-1.5 ${colors ? colors.bar : 'bg-slate-300'}`} />
      <div className="mb-1.5 flex items-center gap-2">
        {block.subject && (
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${colors!.bg} ${colors!.text}`}>
            <SubjectIcon subject={block.subject} />
            {SUBJECT_LABELS[block.subject]}
          </span>
        )}
        {inWindow && (
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
            Đang tới giờ
          </span>
        )}
      </div>
      <p className="text-balance text-xl font-extrabold tracking-tight text-slate-900">{block.title}</p>
      <p className="mt-1 text-sm font-semibold text-slate-400 tabular-nums">
        {block.startTime}–{block.endTime}
        {/* Trễ giờ thì không trách móc */}
        {isLate && <span className="ml-2 font-semibold text-slate-400">· Bắt đầu bây giờ cũng được</span>}
      </p>
      <div className="mt-5 flex items-center gap-3">
        {block.kind !== 'class' ? (
          <>
            <button
              type="button"
              onClick={() => void startWork(block)}
              className="btn-3d inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 font-extrabold text-white [--edge:#5a41a3]"
            >
              <Play size={18} weight="fill" />
              Bắt đầu Pomodoro
            </button>
            <button
              type="button"
              onClick={() => void startTwoMinute(block)}
              className="rounded-2xl px-3 py-3 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-100"
            >
              Chỉ làm 1 chút thôi
            </button>
          </>
        ) : (
          <p className="text-sm font-semibold text-slate-500">Buổi học ở trung tâm — tick khi đã đi học.</p>
        )}
      </div>
      {block.pomodoroCount > 0 && (
        <p className="mt-3 text-xs font-bold text-slate-400 tabular-nums">
          🍅 {pomodorosDone}/{block.pomodoroCount} pomodoro hôm nay
        </p>
      )}
    </div>
  );
}

function TimelineRow({
  block,
  index,
  completed,
  nowMinutes,
  pomodorosDone,
  onToggle,
  canDrawSmall,
  onDrawSmall,
}: {
  block: ScheduleBlock;
  index: number;
  completed: boolean;
  nowMinutes: number;
  pomodorosDone: number;
  onToggle: () => void;
  canDrawSmall: boolean;
  onDrawSmall: () => void;
}) {
  const isRest = block.kind === 'rest';
  const tickable = !isRest || block.isTrueRest === true;
  const isPastAndUnticked = !completed && nowMinutes >= timeToLogicalMinutes(block.endTime);
  const colors = block.subject ? SUBJECT_COLORS[block.subject] : null;

  return (
    <li
      className={`animate-rise-in relative flex items-center gap-3 overflow-hidden rounded-2xl border-2 bg-white py-3 pl-4 pr-3 ${
        isRest && !block.isTrueRest ? 'border-transparent bg-transparent opacity-60' : 'border-slate-200'
      } ${isPastAndUnticked && !isRest ? 'opacity-60' : ''}`}
      style={{ animationDelay: `${Math.min(index * 40, 320)}ms` }}
    >
      {colors && !isRest && <span className={`absolute inset-y-0 left-0 w-1 ${colors.bar}`} />}
      {tickable ? (
        <label className="flex cursor-pointer items-center">
          <input type="checkbox" checked={completed} onChange={onToggle} className="peer sr-only" aria-label={`Hoàn thành: ${block.title}`} />
          <span className="flex size-6 shrink-0 items-center justify-center rounded-lg border-2 border-slate-300 bg-white text-white transition-all peer-checked:border-emerald-500 peer-checked:bg-emerald-500 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-primary">
            {completed && <CheckFat size={13} weight="fill" />}
          </span>
        </label>
      ) : (
        <span className="w-6 shrink-0 text-center font-bold text-slate-300">·</span>
      )}
      <span className="w-20 shrink-0 text-xs font-bold text-slate-400 tabular-nums">
        {block.startTime}–{block.endTime}
      </span>
      <span className={`flex-1 text-sm font-bold ${completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
        {block.title}
        {block.isTrueRest && completed && (
          <span className="ml-2 inline-flex items-center gap-1 font-bold text-emerald-600">
            <SunHorizon size={14} weight="fill" /> Tuyệt — nghỉ cũng là một phần kế hoạch
          </span>
        )}
      </span>
      {/* Tick xong block deep/light → hiện ngay nút bốc hộp nhỏ (§6.1c) */}
      {canDrawSmall && (
        <button
          type="button"
          onClick={onDrawSmall}
          className="btn-3d animate-pop-in inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-amber-400 px-2.5 py-1.5 text-xs font-extrabold text-amber-950 [--edge:#b45309]"
        >
          <Gift size={14} weight="fill" />
          Bốc hộp nhỏ
        </button>
      )}
      {/* Tiến độ pomodoro của block — dùng pomodoroCount vốn chỉ nằm trong Cài đặt */}
      {block.pomodoroCount > 0 && !isRest && (
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${
            pomodorosDone >= block.pomodoroCount ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
          }`}
          title="Số pomodoro đã chạy / mục tiêu"
        >
          🍅 {pomodorosDone}/{block.pomodoroCount}
        </span>
      )}
      {block.subject && (
        <span className={`hidden shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold sm:inline-flex ${colors!.bg} ${colors!.text}`}>
          <SubjectIcon subject={block.subject} size={11} />
          {SUBJECT_LABELS[block.subject]}
        </span>
      )}
    </li>
  );
}

function SubjectProgressBar({
  subject,
  doneMinutes,
  plannedMinutes,
}: {
  subject: Subject;
  doneMinutes: number;
  plannedMinutes: number;
}) {
  const colors = SUBJECT_COLORS[subject];
  // Thang đo là số phút dự kiến của môn hôm nay (tối thiểu 30 để vạch luôn hiện).
  const scale = Math.max(plannedMinutes, MINIMUM_MINUTES_PER_SUBJECT);
  const donePercent = Math.min(100, (doneMinutes / scale) * 100);
  const markerPercent = (MINIMUM_MINUTES_PER_SUBJECT / scale) * 100;

  return (
    <div>
      <div className="mb-1.5 flex justify-between text-xs font-bold text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <SubjectIcon subject={subject} size={13} />
          {SUBJECT_LABELS[subject]}
        </span>
        <span className="tabular-nums">
          {formatHours(doneMinutes)} / {formatHours(plannedMinutes)}
        </span>
      </div>
      <div className="relative h-3.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
          style={{ width: `${donePercent}%` }}
        />
        {/* Vạch mốc 30 phút — ngưỡng Ngày Tối thiểu */}
        <div
          className="absolute inset-y-0 w-1 rounded-full bg-white"
          style={{ left: `${markerPercent}%` }}
          title={`Mốc ${MINIMUM_MINUTES_PER_SUBJECT} phút (Ngày Tối thiểu)`}
        />
      </div>
    </div>
  );
}
