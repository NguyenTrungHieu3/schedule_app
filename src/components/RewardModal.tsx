// Modal bốc thưởng — theo §4.6 của spec.
// Bấm bốc → xáo giấy (1.2s hộp nhỏ / 2s hộp lớn) → lật mở kết quả.
// KHÔNG hiện kết quả ngay lập tức — cảm giác chờ đợi chính là phần thưởng.

import { useEffect, useRef, useState } from 'react';
import { ArrowCounterClockwise, Barbell, Clover, Gift, Question } from '@phosphor-icons/react';
import { useAppStore, type RewardDrawRecord } from '../store/appStore';
import { countAvailable, SLIP_ID_REDRAW } from '../logic/reward';
import { playRewardSound } from '../utils/sound';
import Confetti from './Confetti';
import type { RewardBox } from '../types';

const SHUFFLE_MS = { small: 1200, big: 2000 } as const;

const TYPE_DISPLAY = {
  reward: { icon: <Gift size={52} weight="fill" className="text-amber-500" />, label: 'Phần thưởng!', className: 'text-emerald-600' },
  neutral: { icon: <Clover size={52} weight="fill" className="text-emerald-500" />, label: '', className: 'text-slate-600' },
  penalty: { icon: <Barbell size={52} weight="fill" className="text-sky-500" />, label: 'Thử thách nhỏ', className: 'text-sky-600' },
} as const;

export default function RewardModal({ box, onClose }: { box: RewardBox; onClose: () => void }) {
  const { draw, undoDraw, setDrawClaimed, pendingRewards, settings } = useAppStore();
  const [result, setResult] = useState<RewardDrawRecord | null>(null);
  const [revealed, setRevealed] = useState(false);
  const drawStarted = useRef(false);

  // Bốc ngay nhưng GIỮ KÍN kết quả cho đến khi xáo xong.
  function runDraw() {
    setResult(null);
    setRevealed(false);
    void draw(box).then((record) => {
      setTimeout(() => {
        setResult(record);
        setRevealed(true);
        if (settings.soundEnabled && box === 'big') playRewardSound();
      }, SHUFFLE_MS[box]);
    });
  }

  useEffect(() => {
    if (drawStarted.current) return; // chống StrictMode double-effect
    drawStarted.current = true;
    runDraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isBig = box === 'big';
  const canRedrawSame = countAvailable(pendingRewards, box) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4">
      {revealed && isBig && result?.type === 'reward' && <Confetti />}
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
        <p className="mb-4 flex items-center justify-center gap-1.5 text-sm font-extrabold uppercase tracking-widest text-slate-400">
          <Gift size={16} weight="fill" className="text-amber-500" />
          {isBig ? 'Hộp lớn' : 'Hộp nhỏ'}
        </p>

        {!revealed ? (
          <div className="py-8">
            {/* Xáo giấy */}
            <div className="relative mx-auto h-32 w-24">
              <div className="animate-slip-shuffle absolute inset-0 rounded-xl border-2 border-amber-300 bg-amber-100" style={{ animationDelay: '0.1s' }} />
              <div className="animate-slip-shuffle absolute inset-0 rounded-xl border-2 border-amber-400 bg-amber-200" style={{ animationDelay: '0.25s' }} />
              <div className="animate-slip-shuffle absolute inset-0 flex items-center justify-center rounded-xl border-2 border-amber-500 bg-amber-300 text-amber-800">
                <Question size={36} weight="bold" />
              </div>
            </div>
            <p className="mt-6 text-sm font-bold text-slate-500">Đang xáo giấy…</p>
          </div>
        ) : result ? (
          <div className="animate-slip-flip-in py-4">
            <div className="flex justify-center">{TYPE_DISPLAY[result.type].icon}</div>
            {TYPE_DISPLAY[result.type].label && (
              <p className={`mt-2 text-sm font-extrabold ${TYPE_DISPLAY[result.type].className}`}>
                {TYPE_DISPLAY[result.type].label}
              </p>
            )}
            <p className="mt-3 text-balance text-xl font-extrabold leading-snug">{result.slipTextSnapshot}</p>

            <div className="mt-6 flex flex-col gap-2">
              {result.slipId === SLIP_ID_REDRAW && canRedrawSame ? (
                <button
                  type="button"
                  onClick={() => {
                    void setDrawClaimed(result.id, true);
                    runDraw(); // lượt bonus đã được cấp — xáo lại luôn trong modal
                  }}
                  className="btn-3d inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-400 py-3 font-extrabold text-amber-950 [--edge:#b45309]"
                >
                  <ArrowCounterClockwise size={18} weight="bold" />
                  Bốc lại ngay
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  void setDrawClaimed(result.id, true);
                  onClose();
                }}
                className="btn-3d rounded-2xl bg-primary py-3 font-extrabold text-white [--edge:#5a41a3]"
              >
                Nhận
              </button>
              {/* Bốc nhầm → hoàn tác được, đúng nguyên tắc §1.4 */}
              <button
                type="button"
                onClick={() => {
                  void undoDraw(result.id);
                  onClose();
                }}
                className="rounded-xl py-2 text-sm font-bold text-slate-400 transition-colors hover:bg-slate-50"
              >
                Hoàn tác lượt bốc này
              </button>
            </div>
          </div>
        ) : (
          <div className="py-8">
            <p className="font-semibold text-slate-500">Không còn giấy nào trong hộp — kiểm tra Cài đặt.</p>
            <button type="button" onClick={onClose} className="btn-3d mt-4 rounded-2xl bg-primary px-5 py-2 font-extrabold text-white [--edge:#5a41a3]">
              Đóng
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
