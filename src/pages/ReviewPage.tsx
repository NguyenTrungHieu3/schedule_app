// /on-tap — Hàng đợi ôn tập SRS. Theo §4.4 + §6.3 của spec.

import { useMemo, useState } from 'react';
import { Cards, Confetti as ConfettiIcon, Gift, Plant, Plus } from '@phosphor-icons/react';
import { useAppStore } from '../store/appStore';
import { buildReviewQueue, INTERVALS } from '../logic/srs';
import { getLogicalDate } from '../logic/date';
import { SUBJECT_COLORS, SUBJECT_LABELS } from '../ui/labels';
import RewardModal from '../components/RewardModal';
import type { ReviewItem, ReviewResult, Subject } from '../types';

export default function ReviewPage() {
  const { reviewItems, addReviewItem, answerReview, grantBonusSmall } = useAppStore();
  const today = getLogicalDate();
  const queue = useMemo(() => buildReviewQueue(reviewItems, today), [reviewItems, today]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [showCongrats, setShowCongrats] = useState(false);
  const [drawingSmall, setDrawingSmall] = useState(false);

  // Danh sách phiên ôn được chốt khi bấm "Ôn ngay" — dùng id để lấy item mới nhất.
  const [sessionIds, setSessionIds] = useState<string[]>([]);
  const currentItem = reviewing ? reviewItems.find((i) => i.id === sessionIds[reviewIndex]) : undefined;

  function startReview() {
    setSessionIds(queue.visible.map((i) => i.id));
    setReviewIndex(0);
    setReviewing(true);
  }

  async function handleAnswer(result: ReviewResult) {
    if (!currentItem) return;
    await answerReview(currentItem.id, result);
    if (reviewIndex + 1 >= sessionIds.length) {
      setReviewing(false);
      setShowCongrats(true);
      // Ôn xong hết → cấp 1 lượt bốc hộp nhỏ (1 lần mỗi ngày).
      await grantBonusSmall(`small:bonus:srs:${today}`);
    } else {
      setReviewIndex(reviewIndex + 1);
    }
  }

  if (reviewing && currentItem) {
    return <ReviewSession item={currentItem} index={reviewIndex} total={sessionIds.length} onAnswer={handleAnswer} onExit={() => setReviewing(false)} />;
  }

  return (
    <div className="mx-auto max-w-2xl">
      {drawingSmall && <RewardModal box="small" onClose={() => setDrawingSmall(false)} />}

      {showCongrats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="animate-pop-in rounded-3xl bg-white p-8 text-center shadow-2xl">
            <ConfettiIcon size={52} weight="fill" className="mx-auto text-primary" />
            <p className="mt-3 text-2xl font-extrabold">Ôn xong hết rồi!</p>
            <p className="mt-2 font-semibold text-slate-500">Bạn được 1 lượt bốc hộp nhỏ.</p>
            <div className="mt-5 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => { setShowCongrats(false); setDrawingSmall(true); }}
                className="btn-3d inline-flex items-center gap-1.5 rounded-2xl bg-amber-400 px-5 py-2.5 font-extrabold text-amber-950 [--edge:#b45309]"
              >
                <Gift size={16} weight="fill" />
                Bốc ngay
              </button>
              <button type="button" onClick={() => setShowCongrats(false)} className="rounded-2xl bg-slate-100 px-5 py-2.5 font-bold text-slate-600 transition-colors hover:bg-slate-200">
                Để sau
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-slate-900">
          <Cards size={26} weight="fill" className="text-primary" />
          Hàng đợi ôn tập
        </h1>
        <button type="button" onClick={() => setShowAddForm(true)} className="btn-3d inline-flex items-center gap-1.5 rounded-2xl bg-primary px-4 py-2 text-sm font-extrabold text-white [--edge:#5a41a3]">
          <Plus size={14} weight="bold" />
          Thêm bài đã học
        </button>
      </div>

      {showAddForm && <AddItemForm onDone={() => setShowAddForm(false)} onAdd={addReviewItem} />}

      {queue.visible.length > 0 && (
        <div className="mb-6 flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5">
          <div>
            <p className="font-semibold">Hôm nay có {queue.visible.length} item cần ôn</p>
            {/* Chống ngợp §4.4: không đập con số tổng vào mặt người dùng */}
            {queue.hiddenCount > 0 && (
              <p className="mt-1 text-sm text-slate-500">
                Còn {queue.hiddenCount} item nữa — làm hết {queue.visible.length} cái này đã, phần còn lại tự dời sang mai.
              </p>
            )}
          </div>
          <button type="button" onClick={startReview} className="btn-3d rounded-2xl bg-primary px-5 py-2.5 font-extrabold text-white [--edge:#5a41a3]">
            Ôn ngay
          </button>
        </div>
      )}

      <QueueGroup title="Quá hạn" note="Không sao cả — ôn dần là được." items={queue.overdue} />
      <QueueGroup title="Hôm nay" items={queue.dueToday} />
      <QueueGroup title="Sắp tới (7 ngày)" items={queue.upcoming} showDate />

      {queue.overdue.length === 0 && queue.dueToday.length === 0 && queue.upcoming.length === 0 && (
        <div className="py-16 text-center text-slate-400">
          <Plant size={40} weight="fill" className="mx-auto text-slate-300" />
          <p className="mt-3 font-semibold">Chưa có gì trong hàng đợi. Học xong bài nào thì bấm "Thêm bài đã học".</p>
        </div>
      )}

      <ItemLibrary />
    </div>
  );
}

// Thư viện TOÀN BỘ item — hàng đợi phía trên chỉ hiện phần đến hạn + 7 ngày
// tới, item xa hơn thì "tàng hình". Đây là nơi tìm / lọc / xoá tất cả.
function ItemLibrary() {
  const { reviewItems, deleteReviewItem } = useAppStore();
  const [query, setQuery] = useState('');
  const [subject, setSubject] = useState<Subject | 'all'>('all');
  const [showArchived, setShowArchived] = useState(false);

  const activeItems = reviewItems.filter(
    (i) =>
      !i.archived &&
      (subject === 'all' || i.subject === subject) &&
      i.title.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const archivedItems = reviewItems.filter((i) => i.archived);

  if (reviewItems.length === 0) return null;

  return (
    <div className="mt-10">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
        Thư viện item ({activeItems.length})
      </h2>
      <div className="mb-3 flex flex-wrap gap-2 text-sm">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm theo tên…"
          className="min-w-40 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 outline-none focus:border-slate-400"
        />
        <select
          value={subject}
          onChange={(e) => setSubject(e.target.value as Subject | 'all')}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5"
        >
          <option value="all">Mọi môn</option>
          {(Object.keys(SUBJECT_LABELS) as Subject[]).map((s) => (
            <option key={s} value={s}>{SUBJECT_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {activeItems.length === 0 ? (
        <p className="py-4 text-center text-sm font-semibold text-slate-400">Không item nào khớp bộ lọc.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {activeItems.map((item) => (
            <LibraryRow key={item.id} item={item} onDelete={() => void deleteReviewItem(item.id)} />
          ))}
        </ul>
      )}

      {archivedItems.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowArchived(!showArchived)}
            className="text-xs font-semibold text-slate-400 hover:text-slate-600"
          >
            {showArchived ? 'Ẩn' : 'Xem'} {archivedItems.length} item đã hoàn thành hết chuỗi ôn
          </button>
          {showArchived && (
            <ul className="mt-2 flex flex-col gap-1.5 opacity-60">
              {archivedItems.map((item) => (
                <LibraryRow key={item.id} item={item} onDelete={() => void deleteReviewItem(item.id)} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function LibraryRow({ item, onDelete }: { item: ReviewItem; onDelete: () => void }) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${SUBJECT_COLORS[item.subject].bg} ${SUBJECT_COLORS[item.subject].text}`}>
        {SUBJECT_LABELS[item.subject]}
      </span>
      <span className="flex-1 text-sm">{item.title}</span>
      <span className="hidden shrink-0 text-xs text-slate-400 tabular-nums sm:inline">
        mức {item.intervalIndex + 1}/{INTERVALS.length}
      </span>
      <span className="shrink-0 font-mono text-xs text-slate-400">{item.nextReviewDate}</span>
      <button type="button" onClick={onDelete} className="shrink-0 text-xs text-slate-400 hover:text-slate-600">
        Xoá
      </button>
    </li>
  );
}

function QueueGroup({ title, note, items, showDate }: { title: string; note?: string; items: ReviewItem[]; showDate?: boolean }) {
  if (items.length === 0) return null;
  return (
    <div className="mb-6">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
        {title} ({items.length})
      </h2>
      {note && <p className="mb-2 text-xs text-slate-400">{note}</p>}
      <ul className="flex flex-col gap-1.5">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${SUBJECT_COLORS[item.subject].bg} ${SUBJECT_COLORS[item.subject].text}`}>
              {SUBJECT_LABELS[item.subject]}
            </span>
            <span className="flex-1 text-sm">{item.title}</span>
            {showDate && <span className="font-mono text-xs text-slate-400">{item.nextReviewDate}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AddItemForm({ onDone, onAdd }: { onDone: () => void; onAdd: (subject: Subject, title: string, learnedOn: string) => Promise<void> }) {
  const [subject, setSubject] = useState<Subject>('programming');
  const [title, setTitle] = useState('');
  const [learnedOn, setLearnedOn] = useState(getLogicalDate());

  return (
    <form
      className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        void onAdd(subject, title.trim(), learnedOn).then(onDone);
      }}
    >
      <div className="flex gap-2">
        {(Object.keys(SUBJECT_LABELS) as Subject[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSubject(s)}
            className={`rounded-xl px-3 py-1.5 text-sm font-medium ${
              subject === s ? `${SUBJECT_COLORS[s].bg} ${SUBJECT_COLORS[s].text} ring-2 ring-current` : 'bg-slate-100 text-slate-500'
            }`}
          >
            {SUBJECT_LABELS[s]}
          </button>
        ))}
      </div>
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder='Ví dụ: "Kanji bài 12" / "React useEffect" / "Part 5 — mệnh đề quan hệ"'
        className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
      />
      <label className="flex items-center gap-2 text-sm text-slate-500">
        Ngày học:
        <input type="date" value={learnedOn} max={getLogicalDate()} onChange={(e) => setLearnedOn(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1" />
      </label>
      <div className="flex gap-2">
        <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
          Thêm
        </button>
        <button type="button" onClick={onDone} className="rounded-xl px-4 py-2 text-sm text-slate-500">
          Huỷ
        </button>
      </div>
    </form>
  );
}

// Chế độ ôn: 1 item toàn màn hình, 3 nút kết quả.
function ReviewSession({
  item,
  index,
  total,
  onAnswer,
  onExit,
}: {
  item: ReviewItem;
  index: number;
  total: number;
  onAnswer: (result: ReviewResult) => void;
  onExit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900 px-6 text-white">
      <p className="text-sm text-slate-400">
        {index + 1} / {total}
      </p>
      <span className={`mt-4 rounded-full px-3 py-1 text-xs font-medium ${SUBJECT_COLORS[item.subject].bg} ${SUBJECT_COLORS[item.subject].text}`}>
        {SUBJECT_LABELS[item.subject]}
      </span>
      <p className="mt-4 max-w-xl text-center text-3xl font-bold leading-snug">{item.title}</p>
      {/* Với môn lập trình: active recall thật sự, không đọc lại suông */}
      {item.subject === 'programming' && (
        <p className="mt-4 rounded-xl bg-white/10 px-4 py-2 text-sm text-slate-300">
          Mở file trống. Viết lại không nhìn tài liệu.
        </p>
      )}
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={() => onAnswer('good')} className="btn-3d rounded-2xl bg-emerald-500 px-6 py-3 font-extrabold [--edge:#047857]">
          Nhớ rõ
        </button>
        <button type="button" onClick={() => onAnswer('hard')} className="btn-3d rounded-2xl bg-amber-400 px-6 py-3 font-extrabold text-amber-950 [--edge:#b45309]">
          Hơi quên
        </button>
        <button type="button" onClick={() => onAnswer('again')} className="btn-3d rounded-2xl bg-slate-600 px-6 py-3 font-extrabold [--edge:#241c3a]">
          Quên hẳn
        </button>
      </div>
      <button type="button" onClick={onExit} className="mt-8 text-sm text-slate-400 hover:text-white">
        Tạm dừng phiên ôn
      </button>
    </div>
  );
}
