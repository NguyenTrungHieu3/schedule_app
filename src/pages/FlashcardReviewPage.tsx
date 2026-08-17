// /hoc/bo-the/:deckId (1 deck) hoặc /hoc/on-tap (gộp mọi deck, không có
// deckId) — Ôn thẻ (flashcard SRS). M1 của nền tảng "Học". Cùng khuôn tương
// tác với /on-tap của Chăm (ReviewPage): tổng quan hàng đợi → "Ôn ngay" →
// phiên toàn màn hình lật thẻ → màn hoàn thành. Khác ở chỗ phiên này còn tick
// block lịch 'srs' hôm nay + cấp thưởng Chăm khi ôn hết (xem learningStore.ts
// → creditChamOnSessionFinish).

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CaretLeft, Cards, Confetti as ConfettiIcon, CursorClick, X } from '@phosphor-icons/react';
import { useLearningStore } from '../store/learningStore';
import { buildCardQueue } from '../logic/cardReview';
import { getLogicalDate } from '../logic/date';
import type { DeckCard } from '../data/learningTypes';
import type { ReviewResult } from '../types';
import Mascot from '../ui/Mascot';

const ITEM_TYPE_LABELS: Record<DeckCard['itemType'], string> = {
  vocab: 'Từ vựng',
  kanji: 'Kanji',
  sentence: 'Câu',
};

export default function FlashcardReviewPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const { cards, reviews, loading, loadDeck, loadAllDue, answerCard } = useLearningStore();
  const [reviewing, setReviewing] = useState(false);
  const [sessionKeys, setSessionKeys] = useState<string[]>([]);
  const [sessionIndex, setSessionIndex] = useState(0);
  const [showCongrats, setShowCongrats] = useState(false);

  useEffect(() => {
    if (deckId) void loadDeck(deckId);
    else void loadAllDue('ja');
  }, [deckId, loadDeck, loadAllDue]);

  const today = getLogicalDate();
  const queue = useMemo(() => buildCardQueue([...reviews.values()], today), [reviews, today]);
  const cardByKey = useMemo(() => new Map(cards.map((c) => [`${c.itemType}:${c.itemId}`, c])), [cards]);

  function startSession() {
    setSessionKeys(queue.visible.map((r) => `${r.itemType}:${r.itemId}`));
    setSessionIndex(0);
    setReviewing(true);
  }

  async function handleAnswer(result: ReviewResult) {
    const card = cardByKey.get(sessionKeys[sessionIndex]);
    if (!card) return;
    await answerCard(card, result, 'recognition');
    if (sessionIndex + 1 >= sessionKeys.length) {
      setReviewing(false);
      setShowCongrats(true);
    } else {
      setSessionIndex(sessionIndex + 1);
    }
  }

  if (loading) return <p className="py-8 text-center font-semibold text-slate-400">Đang tải…</p>;

  if (reviewing) {
    const card = cardByKey.get(sessionKeys[sessionIndex]);
    if (!card) return null;
    return (
      <FlashcardSession
        card={card}
        index={sessionIndex}
        total={sessionKeys.length}
        onAnswer={(r) => void handleAnswer(r)}
        onExit={() => setReviewing(false)}
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      {showCongrats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" onClick={() => setShowCongrats(false)}>
          <div className="animate-pop-in rounded-3xl bg-white p-8 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <Mascot size={88} celebrate className="mx-auto" />
            <p className="mt-3 text-2xl font-extrabold">Ôn xong hết rồi!</p>
            <p className="mt-2 font-semibold text-slate-500">Đã tính vào chuỗi ngày của Chăm.</p>
            <button
              type="button"
              onClick={() => setShowCongrats(false)}
              className="btn-3d mt-5 rounded-2xl bg-primary px-8 py-3 font-extrabold text-white [--edge:#5a41a3]"
            >
              Tuyệt!
            </button>
          </div>
        </div>
      )}

      <a href="#/hoc" className="mb-4 inline-flex items-center gap-1 text-sm font-bold text-slate-400 hover:text-slate-600">
        <CaretLeft size={14} weight="bold" /> Quay lại danh sách
      </a>

      <h1 className="mb-6 flex items-center gap-2 text-2xl font-extrabold tracking-tight text-slate-900">
        <Cards size={26} weight="fill" className="text-primary" />
        Ôn thẻ
      </h1>

      {queue.visible.length > 0 ? (
        <div className="card mb-6 flex items-center justify-between gap-3 p-5">
          <div>
            <p className="font-semibold">Có {queue.visible.length} thẻ cần ôn</p>
            {queue.hiddenCount > 0 && (
              <p className="mt-1 text-sm text-slate-500">Còn {queue.hiddenCount} thẻ nữa — làm hết đợt này đã, phần còn lại tự dời sang mai.</p>
            )}
          </div>
          <button type="button" onClick={startSession} className="btn-3d rounded-2xl bg-primary px-5 py-2.5 font-extrabold text-white [--edge:#5a41a3]">
            Ôn ngay
          </button>
        </div>
      ) : (
        <div className="card mb-6 border-emerald-200 bg-emerald-50 p-8 text-center">
          <ConfettiIcon size={40} weight="fill" className="mx-auto text-emerald-500" />
          <p className="mt-2 text-lg font-extrabold text-emerald-700">Hết thẻ cần ôn hôm nay</p>
          <p className="mt-1 text-sm font-semibold text-emerald-600">Quay lại vào ngày mai nhé.</p>
        </div>
      )}

      {queue.upcoming.length > 0 && (
        <p className="text-sm font-semibold text-slate-400">{queue.upcoming.length} thẻ sắp đến hạn trong 7 ngày tới.</p>
      )}
    </div>
  );
}

function FlashcardSession({
  card,
  index,
  total,
  onAnswer,
  onExit,
}: {
  card: DeckCard;
  index: number;
  total: number;
  onAnswer: (result: ReviewResult) => void;
  onExit: () => void;
}) {
  const [flipped, setFlipped] = useState(false);

  function answer(result: ReviewResult) {
    setFlipped(false);
    onAnswer(result);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900 px-6 py-6 text-white">
      {/* Thanh trên: thoát (trái) + badge loại thẻ, tiến độ phiên (phải) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onExit}
            aria-label="Tạm dừng phiên ôn"
            className="flex size-9 items-center justify-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-white/20"
          >
            <X size={16} weight="bold" />
          </button>
          <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary-dark">
            {ITEM_TYPE_LABELS[card.itemType]}
          </span>
        </div>
        <div className="w-32 text-right">
          <p className="mb-1 text-xs font-bold text-slate-400 tabular-nums">
            {index + 1} / {total}
          </p>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${((index + 1) / total) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Thẻ — bóng 3D để có cảm giác "nổi" đúng phong cách Chăm */}
      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-slate-800 px-8 py-14 text-center shadow-2xl">
          <p className="text-center text-4xl font-bold leading-snug">{card.front}</p>

          {flipped ? (
            <div className="mt-6 text-center">
              {card.reading && <p className="text-lg text-slate-300">{card.reading}</p>}
              <p className="mt-2 text-2xl font-semibold text-emerald-300">{card.back}</p>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setFlipped(true)}
              className="mt-8 inline-flex items-center gap-1.5 rounded-2xl bg-white/10 px-6 py-3 font-bold text-white transition-colors hover:bg-white/20"
            >
              <CursorClick size={16} weight="bold" />
              Chạm để lật
            </button>
          )}
        </div>
      </div>

      {flipped && (
        <div className="flex flex-wrap justify-center gap-3 pb-4">
          <button type="button" onClick={() => answer('good')} className="btn-3d rounded-2xl bg-emerald-500 px-6 py-3 font-extrabold [--edge:#047857]">
            Nhớ rõ
          </button>
          <button type="button" onClick={() => answer('hard')} className="btn-3d rounded-2xl bg-amber-400 px-6 py-3 font-extrabold text-amber-950 [--edge:#b45309]">
            Hơi quên
          </button>
          <button type="button" onClick={() => answer('again')} className="btn-3d rounded-2xl bg-slate-600 px-6 py-3 font-extrabold [--edge:#241c3a]">
            Quên hẳn
          </button>
        </div>
      )}
    </div>
  );
}
