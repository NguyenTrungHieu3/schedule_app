// Sinh câu hỏi trắc nghiệm từ vựng cho trang /hoc/kiem-tra. Thuần, không
// dính React/localStorage — nhận vào danh sách từ (từ các bài đã chọn, hoặc
// từ "sổ từ sai"), trả ra danh sách câu hỏi đã xáo trộn.

import type { VocabWord } from '../data/n5Vocab';

export type QuizDirection = 'jp-vi' | 'vi-jp';

export interface QuizQuestion {
  direction: QuizDirection;
  prompt: string; // term (jp-vi) hoặc meaning (vi-jp)
  correctAnswer: string;
  choices: string[]; // đã xáo trộn, chứa correctAnswer
}

const CHOICE_COUNT = 4;

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Chọn 3 đáp án nhiễu có giá trị hiển thị (answerOf) khác đáp án đúng và
// khác nhau — tránh 2 lựa chọn trùng chữ (một số từ trong danh sách N5 dùng
// chung nghĩa/cách viết, ví dụ こちら／そちら／あちら／どちら).
function pickDistractors(pool: VocabWord[], correct: VocabWord, answerOf: (w: VocabWord) => string): string[] {
  const correctAnswer = answerOf(correct);
  const seen = new Set([correctAnswer]);
  const candidates = shuffle(pool.filter((w) => w.term !== correct.term));
  const distractors: string[] = [];
  for (const w of candidates) {
    const answer = answerOf(w);
    if (seen.has(answer)) continue;
    seen.add(answer);
    distractors.push(answer);
    if (distractors.length === CHOICE_COUNT - 1) break;
  }
  return distractors;
}

function buildQuestion(word: VocabWord, pool: VocabWord[], direction: QuizDirection): QuizQuestion | null {
  const answerOf = direction === 'jp-vi' ? (w: VocabWord) => w.meaning : (w: VocabWord) => w.term;
  const promptOf = direction === 'jp-vi' ? (w: VocabWord) => w.term : (w: VocabWord) => w.meaning;
  const correctAnswer = answerOf(word);
  const distractors = pickDistractors(pool, word, answerOf);
  // Không đủ 3 đáp án nhiễu khác biệt (bộ từ chọn quá nhỏ/trùng nhiều) → bỏ câu này.
  if (distractors.length < CHOICE_COUNT - 1) return null;
  return {
    direction,
    prompt: promptOf(word),
    correctAnswer,
    choices: shuffle([correctAnswer, ...distractors]),
  };
}

// pool: từ dùng làm nguồn nhiễu cho đáp án — mặc định là chính words, nhưng
// khi words quá ít (vd luyện lại vài từ sai) truyền thêm allWords để đủ 4 lựa chọn.
// directions: chiều câu hỏi cần sinh — mặc định cả 2 (giữ hành vi cũ).
export function buildQuizQuestions(
  words: VocabWord[],
  allWords: VocabWord[] = words,
  directions: QuizDirection[] = ['jp-vi', 'vi-jp'],
): QuizQuestion[] {
  const pool = allWords.length >= CHOICE_COUNT ? allWords : words;
  const questions: QuizQuestion[] = [];
  for (const word of words) {
    for (const direction of directions) {
      const q = buildQuestion(word, pool, direction);
      if (q) questions.push(q);
    }
  }
  return shuffle(questions);
}
