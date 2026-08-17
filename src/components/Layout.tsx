import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  CalendarBlank,
  Cards,
  ChartBar,
  FireSimple,
  GearSix,
  GraduationCap,
  MagnifyingGlass,
  NotePencil,
  Snowflake,
  Sun,
  type Icon,
} from '@phosphor-icons/react';
import TimerOverlay from './TimerOverlay';
import { selectDisplayStreak, useAppStore } from '../store/appStore';
import { startLogicalClock } from '../store/clockStore';
import { STORAGE_ERROR_EVENT } from '../storage/repository';

const NAV_ITEMS: { to: string; label: string; icon: Icon }[] = [
  { to: '/', label: 'Hôm nay', icon: Sun },
  { to: '/tuan', label: 'Tuần', icon: CalendarBlank },
  { to: '/on-tap', label: 'Ôn tập', icon: Cards },
  { to: '/hoc', label: 'Học', icon: GraduationCap },
  { to: '/so-loi', label: 'Sổ lỗi', icon: NotePencil },
  { to: '/thong-ke', label: 'Thống kê', icon: ChartBar },
  { to: '/ra-soat', label: 'Rà soát', icon: MagnifyingGlass },
  { to: '/cai-dat', label: 'Cài đặt', icon: GearSix },
];

// Logo ngọn lửa — trùng với favicon.
function BrandMark() {
  return (
    <div className="flex items-center gap-2.5 px-2">
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary">
        <FireSimple size={20} weight="fill" className="text-white" />
      </span>
      <span className="leading-tight">
        <span className="block text-lg font-extrabold tracking-tight text-slate-900">Chăm</span>
        <span className="block text-[11px] font-semibold text-slate-400">học đều mỗi ngày</span>
      </span>
    </div>
  );
}

// Chuỗi hiện ở chân sidebar — nhắc nhẹ, không áp lực.
function StreakChip() {
  const { scheduleBlocks, dayLogs, streak } = useAppStore();
  const days = selectDisplayStreak({ scheduleBlocks, dayLogs, streak });
  return (
    <div className="mt-auto flex items-center gap-3 rounded-2xl bg-primary-soft px-3.5 py-3">
      <FireSimple size={26} weight="fill" className={`text-amber-500 ${days > 0 ? 'animate-flame' : 'opacity-40'}`} />
      <div className="leading-tight">
        <p className="text-sm font-extrabold text-slate-800 tabular-nums">{days} ngày liên tiếp</p>
        <p className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
          <Snowflake size={11} weight="bold" /> {streak.freezeTokensRemaining} thẻ freeze
        </p>
      </div>
    </div>
  );
}

// Sidebar trái cố định trên desktop, thu thành bottom nav trên mobile.
export default function Layout() {
  // Đồng hồ ngày logic: tự chuyển sang ngày mới lúc 04:00 không cần reload.
  useEffect(() => startLogicalClock(), []);

  // Nghe sự kiện ghi storage thất bại (hết quota…) → cảnh báo backup.
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    const onError = () => setStorageError(true);
    window.addEventListener(STORAGE_ERROR_EVENT, onError);
    return () => window.removeEventListener(STORAGE_ERROR_EVENT, onError);
  }, []);

  return (
    <div className="min-h-dvh">
      <TimerOverlay />
      {storageError && (
        <div className="fixed inset-x-0 top-0 z-[70] bg-amber-100 px-4 py-2 text-center text-sm font-bold text-amber-800">
          Không lưu được dữ liệu (bộ nhớ trình duyệt đầy?) — hãy vào Cài đặt Export JSON rồi tải lại trang.
        </div>
      )}

      <aside className="fixed inset-y-0 left-0 hidden w-56 flex-col gap-1 border-r-2 border-slate-200 bg-white p-4 md:flex">
        <div className="mb-5"><BrandMark /></div>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ to, label, icon: NavIcon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors ${
                  isActive
                    ? 'bg-primary-soft text-primary-dark'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <NavIcon size={20} weight={isActive ? 'fill' : 'regular'} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <StreakChip />
      </aside>

      <main className="px-4 pb-24 pt-6 md:ml-56 md:px-8 md:pb-10">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t-2 border-slate-200 bg-white py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] md:hidden">
        {NAV_ITEMS.map(({ to, label, icon: NavIcon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-1 pt-1 text-[10px] font-bold ${
                isActive ? 'text-primary-dark' : 'text-slate-400'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <NavIcon size={22} weight={isActive ? 'fill' : 'regular'} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
