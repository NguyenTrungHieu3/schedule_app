// /cai-dat — Cài đặt. Theo §6.7 của spec:
// sửa lịch tuần · quản lý giấy thưởng + thanh tỉ lệ · âm thanh/thông báo ·
// export/import JSON · xoá toàn bộ (gõ chữ xác nhận).

import { useEffect, useRef, useState } from 'react';
import { Barbell, CalendarBlank, Clover, DownloadSimple, FloppyDisk, GearSix, Gift, SignOut, UploadSimple, UserCircle } from '@phosphor-icons/react';
import { useAppStore } from '../store/appStore';
import { poolComposition } from '../logic/reward';
import { blockDurationMinutes, getLogicalDate, timeRangesOverlap } from '../logic/date';
import { supabase } from '../storage/supabaseClient';
import { SUBJECT_LABELS } from '../ui/labels';
import type { BlockKind, RewardBox, RewardType, ScheduleBlock, Subject } from '../types';

const DAY_NAMES = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
const KIND_LABELS: Record<BlockKind, string> = {
  class: '🏫 Lớp học',
  deep: 'Deep (50/10)',
  light: 'Light (25/5)',
  srs: 'Ôn tập SRS',
  review: 'Active recall',
  rest: 'Nghỉ',
};

export default function SettingsPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-slate-900">
        <GearSix size={26} weight="fill" className="text-primary" />
        Cài đặt
      </h1>
      <AccountSection />
      <GeneralSection />
      <RewardSlipsSection />
      <ScheduleSection />
      <DataSection />
    </div>
  );
}

// ===== Tài khoản (đăng nhập magic link — đồng bộ dữ liệu qua Supabase) =====
function AccountSection() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="mb-3 flex items-center gap-1.5 font-extrabold">
        <UserCircle size={18} weight="fill" className="text-primary" />
        Tài khoản
      </h2>
      <p className="mb-3 text-sm text-slate-500">
        Đăng nhập: <span className="font-bold text-slate-700">{email ?? '…'}</span>
      </p>
      <button
        type="button"
        onClick={() => void supabase.auth.signOut()}
        className="inline-flex items-center gap-1.5 rounded-2xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200"
      >
        <SignOut size={15} weight="bold" />
        Đăng xuất
      </button>
    </section>
  );
}

// ===== Âm thanh / thông báo =====
function GeneralSection() {
  const { settings, updateSettings } = useAppStore();
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="mb-3 font-semibold">Chung</h2>
      <label className="flex items-center justify-between py-1.5 text-sm">
        Âm thanh (hết giờ, bốc thưởng)
        <input type="checkbox" checked={settings.soundEnabled} onChange={(e) => void updateSettings({ soundEnabled: e.target.checked })} className="size-5 accent-slate-900" />
      </label>
      <label className="flex items-center justify-between py-1.5 text-sm">
        Thông báo trình duyệt khi hết giờ
        <input type="checkbox" checked={settings.notificationsEnabled} onChange={(e) => void updateSettings({ notificationsEnabled: e.target.checked })} className="size-5 accent-slate-900" />
      </label>
    </section>
  );
}

// ===== Quản lý giấy hộp thưởng =====
function RewardSlipsSection() {
  const { rewardSlips, addSlip, updateSlip, deleteSlip } = useAppStore();
  const [box, setBox] = useState<RewardBox>('small');
  const [newText, setNewText] = useState('');
  const [newType, setNewType] = useState<RewardType>('reward');

  const comp = poolComposition(rewardSlips, box);
  const slips = rewardSlips.filter((s) => s.box === box);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="mb-3 flex items-center gap-1.5 font-extrabold">
        <Gift size={18} weight="fill" className="text-amber-500" />
        Giấy hộp thưởng
      </h2>

      <div className="mb-3 flex gap-2">
        <button type="button" onClick={() => setBox('small')} className={`rounded-xl px-4 py-1.5 text-sm font-medium ${box === 'small' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>
          Hộp nhỏ ({rewardSlips.filter((s) => s.box === 'small').length})
        </button>
        <button type="button" onClick={() => setBox('big')} className={`rounded-xl px-4 py-1.5 text-sm font-medium ${box === 'big' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>
          Hộp lớn ({rewardSlips.filter((s) => s.box === 'big').length})
        </button>
      </div>

      {/* Thanh tỉ lệ trực quan */}
      <div className="mb-1 flex h-4 overflow-hidden rounded-full">
        <div className="bg-emerald-400" style={{ width: `${comp.percents.reward}%` }} title={`Thưởng ${comp.counts.reward}`} />
        <div className="bg-slate-300" style={{ width: `${comp.percents.neutral}%` }} title={`Trung tính ${comp.counts.neutral}`} />
        <div className="bg-sky-400" style={{ width: `${comp.percents.penalty}%` }} title={`Phạt ${comp.counts.penalty}`} />
      </div>
      <p className="mb-2 text-xs text-slate-500">
        🎁 thưởng {Math.round(comp.percents.reward)}% · 🍀 trung tính {Math.round(comp.percents.neutral)}% · 💪 phạt {Math.round(comp.percents.penalty)}%
      </p>
      {/* Gợi ý (không chặn) khi phạt >15% */}
      {comp.percents.penalty > 15 && (
        <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Tỉ lệ phạt cao có thể khiến bạn né việc bốc hộp — cân nhắc giữ dưới 15%.
        </p>
      )}
      {/* Ghi chú cố định — §5.3 */}
      <p className="mb-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
        Đừng bỏ vào hộp: nghỉ nguyên 1 ngày · bỏ buổi trung tâm · phần thưởng trên 500k.
      </p>

      <ul className="mb-4 flex max-h-72 flex-col gap-1 overflow-y-auto">
        {slips.map((slip) => (
          <li key={slip.id} className={`flex items-center gap-2 rounded-lg border border-slate-100 px-2 py-1.5 text-sm ${slip.enabled ? '' : 'opacity-40'}`}>
            <span className="shrink-0">
              {slip.type === 'reward' ? (
                <Gift size={14} weight="fill" className="text-amber-500" />
              ) : slip.type === 'neutral' ? (
                <Clover size={14} weight="fill" className="text-emerald-500" />
              ) : (
                <Barbell size={14} weight="fill" className="text-sky-500" />
              )}
            </span>
            <span className="flex-1">{slip.text}</span>
            <button type="button" onClick={() => void updateSlip({ ...slip, enabled: !slip.enabled })} className="text-xs text-slate-400 hover:text-slate-600">
              {slip.enabled ? 'Tắt' : 'Bật'}
            </button>
            <button type="button" onClick={() => void deleteSlip(slip.id)} className="text-xs text-slate-400 hover:text-slate-600">
              Xoá
            </button>
          </li>
        ))}
      </ul>

      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!newText.trim()) return;
          void addSlip({ box, type: newType, text: newText.trim(), enabled: true });
          setNewText('');
        }}
      >
        <select value={newType} onChange={(e) => setNewType(e.target.value as RewardType)} className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm">
          <option value="reward">🎁 thưởng</option>
          <option value="neutral">🍀 trung tính</option>
          <option value="penalty">💪 phạt</option>
        </select>
        <input value={newText} onChange={(e) => setNewText(e.target.value)} placeholder="Nội dung giấy mới…" className="min-w-40 flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-slate-400" />
        <button type="submit" className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white">
          Thêm
        </button>
      </form>
    </section>
  );
}

// ===== Sửa lịch tuần =====
function ScheduleSection() {
  const { scheduleBlocks, deleteScheduleBlock } = useAppStore();
  const [day, setDay] = useState<number>(1);
  const [editing, setEditing] = useState<ScheduleBlock | 'new' | null>(null);

  const blocks = scheduleBlocks
    .filter((b) => b.dayOfWeek === day)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="mb-3 flex items-center gap-1.5 font-extrabold">
        <CalendarBlank size={18} weight="fill" className="text-primary" />
        Lịch tuần
      </h2>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {[1, 2, 3, 4, 5, 6, 0].map((d) => (
          <button key={d} type="button" onClick={() => setDay(d)} className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${day === d ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>
            {DAY_NAMES[d]}
          </button>
        ))}
      </div>
      <ul className="mb-3 flex flex-col gap-1">
        {blocks.map((b) => (
          <li key={b.id} className="flex items-center gap-2 rounded-lg border border-slate-100 px-2 py-1.5 text-sm">
            <span className="font-mono text-xs text-slate-400">
              {b.startTime}–{b.endTime}
            </span>
            <span className="flex-1 truncate">{b.title}</span>
            <span className="text-[10px] text-slate-400">{KIND_LABELS[b.kind]}</span>
            <button type="button" onClick={() => setEditing(b)} className="text-xs text-slate-400 hover:text-slate-600">Sửa</button>
            <button type="button" onClick={() => void deleteScheduleBlock(b.id)} className="text-xs text-slate-400 hover:text-slate-600">Xoá</button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => setEditing('new')} className="rounded-lg bg-slate-100 px-4 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-200">
        + Thêm block cho {DAY_NAMES[day]}
      </button>
      {editing && <BlockEditModal day={day} block={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </section>
  );
}

function BlockEditModal({ day, block, onClose }: { day: number; block: ScheduleBlock | null; onClose: () => void }) {
  const { scheduleBlocks, addScheduleBlock, updateScheduleBlock } = useAppStore();
  const [title, setTitle] = useState(block?.title ?? '');
  const [startTime, setStartTime] = useState(block?.startTime ?? '08:00');
  const [endTime, setEndTime] = useState(block?.endTime ?? '09:00');
  const [subject, setSubject] = useState<Subject | ''>(block?.subject ?? '');
  const [kind, setKind] = useState<BlockKind>(block?.kind ?? 'deep');
  const [pomodoroCount, setPomodoroCount] = useState(block?.pomodoroCount ?? 0);

  // blockDurationMinutes (không phải minutesBetweenTimes) — cho phép block qua
  // nửa đêm (22:00–00:30 hợp lệ), chỉ chặn nhập ngược thật sự (09:00–07:00).
  const valid = title.trim() && blockDurationMinutes(startTime, endTime) > 0;

  // Cảnh báo (không chặn — §1.3) khi chồng giờ với block khác cùng thứ. Không
  // tự so với chính nó khi đang sửa.
  const overlapping = scheduleBlocks.filter(
    (b) =>
      b.dayOfWeek === day &&
      b.kind !== 'rest' &&
      b.id !== block?.id &&
      timeRangesOverlap(startTime, endTime, b.startTime, b.endTime),
  );

  async function handleSave() {
    const data = {
      dayOfWeek: day as ScheduleBlock['dayOfWeek'],
      startTime,
      endTime,
      subject: subject === '' ? null : subject,
      kind,
      title: title.trim(),
      pomodoroCount,
    };
    if (block) {
      await updateScheduleBlock({ ...block, ...data });
    } else {
      await addScheduleBlock(data);
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-3 font-semibold">{block ? 'Sửa block' : `Thêm block — ${DAY_NAMES[day]}`}</h3>
        <div className="flex flex-col gap-2.5 text-sm">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tiêu đề" className="rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-slate-400" />
          <div className="flex items-center gap-2">
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1.5" />
            <span>→</span>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1.5" />
          </div>
          <select value={subject} onChange={(e) => setSubject(e.target.value as Subject | '')} className="rounded-lg border border-slate-200 px-2 py-1.5">
            <option value="">— Không môn (SRS/nghỉ) —</option>
            {(Object.keys(SUBJECT_LABELS) as Subject[]).map((s) => (
              <option key={s} value={s}>{SUBJECT_LABELS[s]}</option>
            ))}
          </select>
          <select value={kind} onChange={(e) => setKind(e.target.value as BlockKind)} className="rounded-lg border border-slate-200 px-2 py-1.5">
            {(Object.keys(KIND_LABELS) as BlockKind[]).map((k) => (
              <option key={k} value={k}>{KIND_LABELS[k]}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-slate-500">
            Số pomodoro dự kiến:
            <input type="number" min={0} max={10} value={pomodoroCount} onChange={(e) => setPomodoroCount(Number(e.target.value))} className="w-16 rounded-lg border border-slate-200 px-2 py-1" />
          </label>
        </div>
        {overlapping.length > 0 && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Chồng giờ với: {overlapping.map((b) => b.title).join(', ')} — phút học có thể bị tính trùng.
          </p>
        )}
        <div className="mt-4 flex gap-2">
          <button type="button" disabled={!valid} onClick={() => void handleSave()} className="flex-1 rounded-xl bg-slate-900 py-2.5 font-semibold text-white disabled:opacity-40">
            Lưu
          </button>
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm text-slate-500">
            Huỷ
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== Export / Import / Xoá =====
function DataSection() {
  const { exportData, importData, deleteAllData, settings } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmText, setConfirmText] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [importError, setImportError] = useState('');

  async function handleExport() {
    const json = await exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `study-app-backup-${getLogicalDate()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(file: File) {
    try {
      setImportError('');
      await importData(await file.text());
    } catch {
      setImportError('File không đúng định dạng backup của app.');
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="mb-3 flex items-center gap-1.5 font-extrabold">
        <FloppyDisk size={18} weight="fill" className="text-primary" />
        Dữ liệu
      </h2>
      <p className="mb-3 text-xs text-slate-500">
        Lần backup gần nhất: {settings.lastBackupDate ?? 'chưa bao giờ'}. Nên export mỗi 30 ngày.
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void handleExport()} className="btn-3d inline-flex items-center gap-1.5 rounded-2xl bg-primary px-4 py-2 text-sm font-extrabold text-white [--edge:#5a41a3]">
          <DownloadSimple size={15} weight="bold" />
          Export JSON
        </button>
        <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-2xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200">
          <UploadSimple size={15} weight="bold" />
          Import JSON
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleImport(f);
            e.target.value = '';
          }}
        />
      </div>
      {importError && <p className="mt-2 text-sm text-amber-600">{importError}</p>}

      <div className="mt-6 border-t border-slate-100 pt-4">
        {!showConfirm ? (
          <button type="button" onClick={() => setShowConfirm(true)} className="text-sm text-slate-400 hover:text-slate-600">
            Xoá toàn bộ dữ liệu…
          </button>
        ) : (
          <div className="text-sm">
            <p className="mb-2 text-slate-600">
              Gõ <span className="font-mono font-bold">XOA HET</span> để xác nhận xoá toàn bộ dữ liệu (nên Export trước):
            </p>
            <div className="flex gap-2">
              <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-1.5 font-mono" />
              <button
                type="button"
                disabled={confirmText !== 'XOA HET'}
                onClick={() => void deleteAllData()}
                className="rounded-lg bg-slate-900 px-4 py-1.5 font-semibold text-white disabled:opacity-30"
              >
                Xoá
              </button>
              <button type="button" onClick={() => { setShowConfirm(false); setConfirmText(''); }} className="px-2 text-slate-400">
                Thôi
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
