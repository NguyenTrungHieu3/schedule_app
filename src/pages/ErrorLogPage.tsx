// /so-loi — Sổ lỗi TOEIC. Theo §4.5 + §6.4 của spec.
// Thông tin giá trị nhất: "sai nhiều nhất ở Part mấy / vì lý do gì" → đặt đầu trang.

import { useMemo, useState } from 'react';
import { BookOpen, NotePencil, Plus } from '@phosphor-icons/react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAppStore } from '../store/appStore';
import { dueErrorEntries, ERROR_REASONS } from '../logic/errorLog';
import { getLogicalDate } from '../logic/date';
import type { ErrorEntry, ToeicPart } from '../types';

const PARTS: ToeicPart[] = [1, 2, 3, 4, 5, 6, 7];

export default function ErrorLogPage() {
  const { errorEntries, addErrorEntry, answerError, deleteErrorEntry } = useAppStore();
  const today = getLogicalDate();

  const [showAddForm, setShowAddForm] = useState(false);
  const [filterPart, setFilterPart] = useState<ToeicPart | 'all'>('all');
  const [filterReason, setFilterReason] = useState<string>('all');
  const [showResolved, setShowResolved] = useState(false);

  const due = useMemo(() => dueErrorEntries(errorEntries, today), [errorEntries, today]);

  const byPart = useMemo(
    () =>
      PARTS.map((part) => ({
        name: `Part ${part}`,
        count: errorEntries.filter((e) => e.part === part).length,
      })),
    [errorEntries],
  );

  const byReason = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of errorEntries) counts.set(e.reason, (counts.get(e.reason) ?? 0) + 1);
    return [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [errorEntries]);

  const filtered = errorEntries.filter(
    (e) =>
      (filterPart === 'all' || e.part === filterPart) &&
      (filterReason === 'all' || e.reason === filterReason) &&
      (showResolved || !e.resolved),
  );

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-slate-900">
          <NotePencil size={26} weight="fill" className="text-primary" />
          Sổ lỗi TOEIC
        </h1>
        <button type="button" onClick={() => setShowAddForm(true)} className="btn-3d inline-flex items-center gap-1.5 rounded-2xl bg-primary px-4 py-2 text-sm font-extrabold text-white [--edge:#5a41a3]">
          <Plus size={14} weight="bold" />
          Thêm câu sai
        </button>
      </div>

      {showAddForm && <AddErrorForm onDone={() => setShowAddForm(false)} onAdd={addErrorEntry} />}

      {errorEntries.length > 0 && (
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="mb-2 text-sm font-semibold text-slate-500">Bạn sai nhiều nhất ở Part…</h2>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={byPart}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} width={24} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#7c5cd6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="mb-2 text-sm font-semibold text-slate-500">…vì lý do gì</h2>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={byReason} layout="vertical">
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Đến hạn ôn hôm nay — trên cùng */}
      {due.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Đến hạn ôn hôm nay ({due.length})
          </h2>
          <ul className="flex flex-col gap-2">
            {due.map((entry) => (
              <ErrorCard key={entry.id} entry={entry} reviewMode onAnswer={(ok) => void answerError(entry.id, ok)} onDelete={() => void deleteErrorEntry(entry.id)} />
            ))}
          </ul>
        </div>
      )}

      {/* Bộ lọc */}
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <select value={filterPart} onChange={(e) => setFilterPart(e.target.value === 'all' ? 'all' : (Number(e.target.value) as ToeicPart))} className="rounded-lg border border-slate-200 px-2 py-1.5">
          <option value="all">Mọi Part</option>
          {PARTS.map((p) => (
            <option key={p} value={p}>Part {p}</option>
          ))}
        </select>
        <select value={filterReason} onChange={(e) => setFilterReason(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1.5">
          <option value="all">Mọi lý do</option>
          {[...new Set([...ERROR_REASONS, ...errorEntries.map((e) => e.reason)])].map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-slate-500">
          <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} />
          Hiện cả câu đã thuộc
        </label>
      </div>

      <ul className="flex flex-col gap-2">
        {filtered.map((entry) => (
          <ErrorCard key={entry.id} entry={entry} onDelete={() => void deleteErrorEntry(entry.id)} />
        ))}
      </ul>

      {errorEntries.length === 0 && (
        <div className="py-16 text-center text-slate-400">
          <BookOpen size={40} weight="fill" className="mx-auto text-slate-300" />
          <p className="mt-3 font-semibold">Chưa có câu sai nào. Sau mỗi lần chữa đề, ghi hết câu sai vào đây.</p>
        </div>
      )}
    </div>
  );
}

function ErrorCard({
  entry,
  reviewMode,
  onAnswer,
  onDelete,
}: {
  entry: ErrorEntry;
  reviewMode?: boolean;
  onAnswer?: (remembered: boolean) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(reviewMode ?? false);
  return (
    <li className={`rounded-xl border bg-white p-3 ${entry.resolved ? 'border-emerald-200 opacity-70' : 'border-slate-200'}`}>
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Part {entry.part}</span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">{entry.reason}</span>
        {entry.resolved && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">✓ đã thuộc</span>}
        <button type="button" onClick={() => setExpanded(!expanded)} className="ml-auto text-xs text-slate-400 hover:text-slate-600">
          {expanded ? 'Thu gọn' : 'Xem'}
        </button>
      </div>
      <p className="mt-2 text-sm">{entry.questionText}</p>
      {expanded && (
        <div className="mt-2 rounded-lg bg-slate-50 p-3 text-sm">
          <p>
            Mình chọn: <span className="font-mono">{entry.myAnswer}</span> · Đáp án đúng:{' '}
            <span className="font-mono font-semibold text-emerald-600">{entry.correctAnswer}</span>
          </p>
          <div className="mt-2 flex items-center gap-2">
            {reviewMode && onAnswer && (
              <>
                <button type="button" onClick={() => onAnswer(true)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">
                  Đã nhớ
                </button>
                <button type="button" onClick={() => onAnswer(false)} className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600">
                  Chưa nhớ — ôn lại từ đầu
                </button>
              </>
            )}
            <button type="button" onClick={onDelete} className="ml-auto text-xs text-slate-400 hover:text-slate-600">
              Xoá
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

function AddErrorForm({
  onDone,
  onAdd,
}: {
  onDone: () => void;
  onAdd: (args: { part: ToeicPart; questionText: string; myAnswer: string; correctAnswer: string; reason: string }) => Promise<void>;
}) {
  const [part, setPart] = useState<ToeicPart>(5);
  const [questionText, setQuestionText] = useState('');
  const [myAnswer, setMyAnswer] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [reason, setReason] = useState(ERROR_REASONS[0]);
  const [customReason, setCustomReason] = useState('');

  return (
    <form
      className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!questionText.trim()) return;
        void onAdd({
          part,
          questionText: questionText.trim(),
          myAnswer: myAnswer.trim(),
          correctAnswer: correctAnswer.trim(),
          reason: reason === '__custom__' ? customReason.trim() || 'khác' : reason,
        }).then(onDone);
      }}
    >
      <div className="flex flex-wrap gap-1.5">
        {PARTS.map((p) => (
          <button key={p} type="button" onClick={() => setPart(p)} className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${part === p ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>
            Part {p}
          </button>
        ))}
      </div>
      <textarea
        autoFocus
        value={questionText}
        onChange={(e) => setQuestionText(e.target.value)}
        placeholder="Nội dung câu hỏi (hoặc mô tả ngắn)"
        rows={2}
        className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
      />
      <div className="flex gap-2">
        <input value={myAnswer} onChange={(e) => setMyAnswer(e.target.value)} placeholder="Mình chọn (A/B/C/D…)" className="w-1/2 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
        <input value={correctAnswer} onChange={(e) => setCorrectAnswer(e.target.value)} placeholder="Đáp án đúng" className="w-1/2 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <select value={reason} onChange={(e) => setReason(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1.5">
          {ERROR_REASONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
          <option value="__custom__">lý do khác…</option>
        </select>
        {reason === '__custom__' && (
          <input value={customReason} onChange={(e) => setCustomReason(e.target.value)} placeholder="lý do" className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
        )}
      </div>
      <div className="flex gap-2">
        <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Thêm</button>
        <button type="button" onClick={onDone} className="rounded-xl px-4 py-2 text-sm text-slate-500">Huỷ</button>
      </div>
    </form>
  );
}
