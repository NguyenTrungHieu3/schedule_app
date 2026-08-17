// /hoc — Trang chủ khu "Học" (danh sách bộ thẻ + ôn nhanh toàn cục). Bố cục
// theo thiết kế Stitch (hero "N thẻ cần ôn" + lưới deck) — CHỈ port phần nội
// dung chính; sidebar/logo/tagline lấy từ Layout thật nên luôn đúng brand.

import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, CaretRight, ClipboardText, GraduationCap, Lightning, Plus } from '@phosphor-icons/react';
import { useLearningStore } from '../store/learningStore';
import Mascot from '../ui/Mascot';

export default function HocPage() {
  const { summaries, loading, loadSummaries } = useLearningStore();

  useEffect(() => {
    void loadSummaries('ja');
  }, [loadSummaries]);

  const totalDue = useMemo(() => summaries.reduce((sum, d) => sum + d.summary.dueCount, 0), [summaries]);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-slate-900">
          <GraduationCap size={26} weight="fill" className="text-primary" />
          Học
        </h1>
        <Link
          to="/hoc/kiem-tra"
          className="inline-flex items-center gap-1.5 rounded-2xl border-2 border-slate-200 px-4 py-2 text-sm font-extrabold text-slate-600 transition-colors hover:border-primary hover:text-primary"
        >
          <ClipboardText size={16} weight="bold" />
          Kiểm tra từ vựng
        </Link>
      </div>

      {loading && <p className="py-8 text-center font-semibold text-slate-400">Đang tải…</p>}

      {!loading && summaries.length === 0 && (
        <div className="card p-8 text-center">
          <BookOpen size={40} weight="fill" className="mx-auto text-slate-300" />
          <p className="mt-3 font-semibold text-slate-500">
            Chưa có bộ thẻ nào. Chạy <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">npm run seed:learning</code> để
            nạp bộ N5 mẫu.
          </p>
        </div>
      )}

      {!loading && summaries.length > 0 && (
        <>
          {/* Hero — cùng vai trò với "Việc tiếp theo" của TodayPage: hành động chính trong ngày */}
          <div className="card relative mb-8 flex items-center justify-between gap-4 overflow-hidden p-6 sm:p-8">
            <div>
              {totalDue > 0 ? (
                <>
                  <p className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                    Hôm nay bạn có <span className="text-primary">{totalDue}</span> thẻ cần ôn!
                  </p>
                  <p className="mt-2 max-w-md font-semibold text-slate-500">
                    Giữ vững phong độ nhé. Mỗi ngày một chút, tiếng Nhật của bạn sẽ ngày càng tiến bộ!
                  </p>
                  <Link
                    to="/hoc/on-tap"
                    className="btn-3d mt-5 inline-flex items-center gap-1.5 rounded-2xl bg-primary px-5 py-2.5 font-extrabold text-white [--edge:#5a41a3]"
                  >
                    <Lightning size={16} weight="fill" />
                    Ôn ngay
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-2xl font-extrabold tracking-tight text-emerald-700 sm:text-3xl">Hết thẻ cần ôn rồi!</p>
                  <p className="mt-2 max-w-md font-semibold text-slate-500">Quay lại vào ngày mai nhé — SRS sẽ tự sắp lịch tiếp.</p>
                </>
              )}
            </div>
            <Mascot size={96} className="hidden shrink-0 sm:block" />
          </div>

          <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wider text-slate-400">Bộ thẻ của bạn</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {summaries.map((deck) => (
              <Link
                key={deck.id}
                to={`/hoc/bo-the/${deck.id}`}
                className="card flex flex-col gap-3 p-5 transition-transform hover:scale-[1.01]"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-dark">
                    <BookOpen size={22} weight="fill" />
                  </span>
                  {deck.level && (
                    <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
                      {deck.level}
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-extrabold text-slate-900">{deck.name}</p>
                  {deck.description && <p className="mt-0.5 text-sm text-slate-500">{deck.description}</p>}
                </div>
                <p className="text-sm font-bold text-slate-700">
                  {deck.summary.dueCount > 0 ? (
                    <>
                      <span className="text-primary">{deck.summary.dueCount}</span> thẻ cần ôn
                    </>
                  ) : (
                    <span className="text-emerald-600">Đã ôn hết hôm nay</span>
                  )}
                </p>
                <div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-primary-soft">
                    <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${deck.summary.progressPercent}%` }} />
                  </div>
                  <p className="mt-1 flex justify-between text-xs font-semibold text-slate-400">
                    <span>Tiến độ</span>
                    <span>{deck.summary.progressPercent}%</span>
                  </p>
                </div>
                <span className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-slate-400">
                  Vào ôn <CaretRight size={12} weight="bold" />
                </span>
              </Link>
            ))}

            {/* M6 (sổ tay + tự tạo thẻ) chưa làm — đặt sẵn ô để không đổi bố cục sau này */}
            <div
              className="flex flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-slate-200 p-5 text-center opacity-60"
              title="Sắp có — tự tạo bộ thẻ riêng (milestone sau)"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                <Plus size={22} weight="bold" />
              </span>
              <p className="font-extrabold text-slate-500">Thêm bộ thẻ mới</p>
              <p className="text-sm text-slate-400">Sắp có — tự tạo bộ thẻ riêng</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
