// /hoc/kiem-tra — Kiểm tra trắc nghiệm từ vựng N5 (25 bài), độc lập với
// flashcard SRS/Supabase: chọn bài → làm trắc nghiệm (mỗi từ 2 câu, 2 chiều
// Nhật↔Việt) → xem điểm + từ sai (tự lưu vào sổ từ sai, xem WrongWordsPage).
// Có thể vào thẳng bước "quiz" để luyện lại 1 danh sách từ có sẵn (từ sổ từ
// sai) qua location.state.practiceWords — xem WrongWordsPage.

import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CaretLeft, CheckCircle, ClipboardText, NotePencil, XCircle } from '@phosphor-icons/react';
import { n5Lessons, type VocabWord } from '../data/n5Vocab';
import { buildQuizQuestions, type QuizQuestion } from '../logic/vocabQuiz';
import { addWrongWords } from '../logic/wrongWords';

const ALL_WORDS: VocabWord[] = n5Lessons.flatMap((l) => l.words);

function questionToVocabWord(q: QuizQuestion): VocabWord {
  return q.direction === 'jp-vi' ? { term: q.prompt, meaning: q.correctAnswer } : { term: q.correctAnswer, meaning: q.prompt };
}

type Step = 'pick' | 'quiz' | 'result';

export default function VocabQuizPage() {
  const location = useLocation();
  const practiceWords = (location.state as { practiceWords?: VocabWord[] } | null)?.practiceWords;

  const [step, setStep] = useState<Step>(practiceWords ? 'quiz' : 'pick');
  const [selectedLessonIds, setSelectedLessonIds] = useState<Set<number>>(new Set());
  const [questions, setQuestions] = useState<QuizQuestion[]>(() => (practiceWords ? buildQuizQuestions(practiceWords, ALL_WORDS) : []));
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [wrong, setWrong] = useState<QuizQuestion[]>([]);

  const selectedWordCount = useMemo(
    () => n5Lessons.filter((l) => selectedLessonIds.has(l.id)).reduce((n, l) => n + l.words.length, 0),
    [selectedLessonIds],
  );

  function toggleLesson(id: number) {
    setSelectedLessonIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelectedLessonIds((prev) => (prev.size === n5Lessons.length ? new Set() : new Set(n5Lessons.map((l) => l.id))));
  }

  function startFromSelection() {
    const words = n5Lessons.filter((l) => selectedLessonIds.has(l.id)).flatMap((l) => l.words);
    setQuestions(buildQuizQuestions(words));
    setIndex(0);
    setChosen(null);
    setWrong([]);
    setStep('quiz');
  }

  async function finishQuiz(finalWrong: QuizQuestion[]) {
    if (finalWrong.length > 0) await addWrongWords(finalWrong.map(questionToVocabWord));
    setStep('result');
  }

  function answer(choice: string) {
    if (chosen) return;
    setChosen(choice);
    if (choice !== questions[index].correctAnswer) setWrong((prev) => [...prev, questions[index]]);
  }

  function next() {
    if (index + 1 >= questions.length) {
      void finishQuiz(wrong);
      return;
    }
    setIndex(index + 1);
    setChosen(null);
  }

  function restart() {
    setStep('pick');
    setSelectedLessonIds(new Set());
    setQuestions([]);
    setWrong([]);
  }

  if (step === 'pick') {
    return (
      <div className="mx-auto max-w-3xl">
        <a href="#/hoc" className="mb-4 inline-flex items-center gap-1 text-sm font-bold text-slate-400 hover:text-slate-600">
          <CaretLeft size={14} weight="bold" /> Quay lại danh sách
        </a>
        <h1 className="mb-1 flex items-center gap-2 text-2xl font-extrabold tracking-tight text-slate-900">
          <ClipboardText size={26} weight="fill" className="text-primary" />
          Kiểm tra từ vựng
        </h1>
        <p className="mb-6 font-semibold text-slate-500">Chọn các bài cần ôn, sau đó làm trắc nghiệm 2 chiều Nhật ↔ Việt.</p>

        <div className="mb-4 flex items-center justify-between">
          <button type="button" onClick={toggleAll} className="text-sm font-bold text-primary hover:underline">
            {selectedLessonIds.size === n5Lessons.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
          </button>
          <a href="#/hoc/kiem-tra/tu-sai" className="inline-flex items-center gap-1 text-sm font-bold text-slate-400 hover:text-slate-600">
            <NotePencil size={14} weight="bold" /> Sổ từ sai
          </a>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {n5Lessons.map((l) => (
            <label
              key={l.id}
              className={`card flex cursor-pointer items-center gap-3 p-3.5 transition-colors ${
                selectedLessonIds.has(l.id) ? 'border-primary bg-primary-soft' : ''
              }`}
            >
              <input type="checkbox" checked={selectedLessonIds.has(l.id)} onChange={() => toggleLesson(l.id)} className="size-4 accent-primary" />
              <span className="font-bold text-slate-800">
                Bài {l.id} — {l.title}
              </span>
              <span className="ml-auto text-xs font-semibold text-slate-400">{l.words.length} từ</span>
            </label>
          ))}
        </div>

        <div className="card sticky bottom-4 mt-6 flex items-center justify-between gap-3 p-4">
          <p className="font-semibold text-slate-600">
            Đã chọn <span className="font-extrabold text-primary">{selectedWordCount}</span> từ ({selectedWordCount * 2} câu hỏi)
          </p>
          <button
            type="button"
            disabled={selectedWordCount === 0}
            onClick={startFromSelection}
            className="btn-3d rounded-2xl bg-primary px-5 py-2.5 font-extrabold text-white [--edge:#5a41a3] disabled:opacity-40"
          >
            Bắt đầu
          </button>
        </div>
      </div>
    );
  }

  if (step === 'quiz') {
    const q = questions[index];
    if (!q) return null;
    const isCorrect = (choice: string) => choice === q.correctAnswer;
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-slate-900 px-6 py-6 text-white">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep(practiceWords ? 'result' : 'pick')}
            aria-label="Thoát bài kiểm tra"
            className="flex size-9 items-center justify-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-white/20"
          >
            <CaretLeft size={16} weight="bold" />
          </button>
          <div className="w-40 text-right">
            <p className="mb-1 text-xs font-bold text-slate-400 tabular-nums">
              {index + 1} / {questions.length}
            </p>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${((index + 1) / questions.length) * 100}%` }} />
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-8">
          <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary-dark">
            {q.direction === 'jp-vi' ? 'Nhật → Việt' : 'Việt → Nhật'}
          </span>
          <p className="max-w-xl text-center text-4xl font-bold leading-snug">{q.prompt}</p>

          <div className="grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
            {q.choices.map((choice) => {
              const picked = chosen === choice;
              const revealCorrect = chosen !== null && isCorrect(choice);
              const revealWrong = picked && !isCorrect(choice);
              return (
                <button
                  key={choice}
                  type="button"
                  disabled={chosen !== null}
                  onClick={() => answer(choice)}
                  className={`flex items-center justify-between gap-2 rounded-2xl border-2 px-5 py-3.5 text-left font-bold transition-colors ${
                    revealCorrect
                      ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                      : revealWrong
                        ? 'border-red-400 bg-red-500/20 text-red-200'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  {choice}
                  {revealCorrect && <CheckCircle size={20} weight="fill" />}
                  {revealWrong && <XCircle size={20} weight="fill" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-center pb-4">
          <button
            type="button"
            disabled={chosen === null}
            onClick={next}
            className="btn-3d rounded-2xl bg-primary px-8 py-3 font-extrabold text-white [--edge:#5a41a3] disabled:opacity-40"
          >
            {index + 1 >= questions.length ? 'Xem kết quả' : 'Câu tiếp'}
          </button>
        </div>
      </div>
    );
  }

  // step === 'result'
  const correctCount = questions.length - wrong.length;
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 flex items-center gap-2 text-2xl font-extrabold tracking-tight text-slate-900">
        <ClipboardText size={26} weight="fill" className="text-primary" />
        Kết quả
      </h1>

      <div className="card mb-6 p-8 text-center">
        <p className="text-4xl font-extrabold text-primary">
          {correctCount} / {questions.length}
        </p>
        <p className="mt-1 font-semibold text-slate-500">câu trả lời đúng</p>
      </div>

      {wrong.length > 0 && (
        <>
          <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wider text-slate-400">Các câu sai ({wrong.length})</h2>
          <div className="mb-6 flex flex-col gap-2">
            {wrong.map((q, i) => (
              <div key={i} className="card p-4">
                <p className="font-bold text-slate-800">{q.prompt}</p>
                <p className="mt-1 text-sm font-semibold text-emerald-600">Đáp án đúng: {q.correctAnswer}</p>
              </div>
            ))}
          </div>
          <p className="mb-4 text-sm font-semibold text-slate-500">
            Các từ sai đã được lưu vào <a href="#/hoc/kiem-tra/tu-sai" className="font-bold text-primary hover:underline">sổ từ sai</a> để luyện lại sau.
          </p>
        </>
      )}

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={restart} className="btn-3d rounded-2xl bg-primary px-6 py-3 font-extrabold text-white [--edge:#5a41a3]">
          Làm bài khác
        </button>
        <a href="#/hoc" className="btn-3d rounded-2xl bg-slate-200 px-6 py-3 font-extrabold text-slate-700 [--edge:#94a3b8]">
          Về trang Học
        </a>
      </div>
    </div>
  );
}
