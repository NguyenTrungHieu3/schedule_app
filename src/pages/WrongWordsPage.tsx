// /hoc/kiem-tra/tu-sai — Sổ từ sai: các từ đã trả lời sai trong bất kỳ bài
// kiểm tra nào (xem VocabQuizPage), lưu máy qua wrongWords.ts. Cho xem/xoá
// và "Luyện lại" — quay về VocabQuizPage ở thẳng bước quiz với đúng các từ này.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CaretLeft, Lightning, NotePencil, Trash } from '@phosphor-icons/react';
import type { VocabWord } from '../data/n5Vocab';
import { clearWrongWords, getWrongWords, removeWrongWord } from '../logic/wrongWords';

export default function WrongWordsPage() {
  const navigate = useNavigate();
  const [words, setWords] = useState<VocabWord[] | null>(null);

  useEffect(() => {
    void getWrongWords().then(setWords);
  }, []);

  async function handleRemove(term: string) {
    setWords(await removeWrongWord(term));
  }

  async function handleClear() {
    await clearWrongWords();
    setWords([]);
  }

  function practiceAgain() {
    if (!words || words.length === 0) return;
    navigate('/hoc/kiem-tra', { state: { practiceWords: words } });
  }

  return (
    <div className="mx-auto max-w-2xl">
      <a href="#/hoc/kiem-tra" className="mb-4 inline-flex items-center gap-1 text-sm font-bold text-slate-400 hover:text-slate-600">
        <CaretLeft size={14} weight="bold" /> Quay lại kiểm tra từ vựng
      </a>
      <h1 className="mb-6 flex items-center gap-2 text-2xl font-extrabold tracking-tight text-slate-900">
        <NotePencil size={26} weight="fill" className="text-primary" />
        Sổ từ sai
      </h1>

      {words === null && <p className="py-8 text-center font-semibold text-slate-400">Đang tải…</p>}

      {words !== null && words.length === 0 && (
        <div className="card p-8 text-center">
          <p className="font-semibold text-slate-500">Chưa có từ nào — làm vài bài kiểm tra, từ trả lời sai sẽ tự xuất hiện ở đây.</p>
        </div>
      )}

      {words !== null && words.length > 0 && (
        <>
          <div className="mb-4 flex items-center justify-between">
            <button type="button" onClick={practiceAgain} className="btn-3d inline-flex items-center gap-1.5 rounded-2xl bg-primary px-5 py-2.5 font-extrabold text-white [--edge:#5a41a3]">
              <Lightning size={16} weight="fill" />
              Luyện lại {words.length} từ này
            </button>
            <button type="button" onClick={() => void handleClear()} className="text-sm font-bold text-slate-400 hover:text-red-500">
              Xoá hết
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {words.map((w) => (
              <div key={w.term} className="card flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-bold text-slate-800">{w.term}</p>
                  <p className="text-sm font-semibold text-slate-500">{w.meaning}</p>
                </div>
                <button
                  type="button"
                  aria-label={`Xoá ${w.term}`}
                  onClick={() => void handleRemove(w.term)}
                  className="flex size-8 shrink-0 items-center justify-center rounded-full text-slate-300 hover:bg-red-50 hover:text-red-500"
                >
                  <Trash size={16} weight="bold" />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
