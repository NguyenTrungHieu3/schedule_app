import { describe, expect, it } from 'vitest';
import type { VocabWord } from '../data/n5Vocab';
import { buildQuizQuestions } from './vocabQuiz';

const WORDS: VocabWord[] = [
  { term: 'わたし', meaning: 'Tôi' },
  { term: 'あなた', meaning: 'Bạn' },
  { term: 'せんせい', meaning: 'Giáo viên' },
  { term: 'がくせい', meaning: 'Học sinh' },
  { term: 'ともだち', meaning: 'Bạn bè' },
];

describe('buildQuizQuestions', () => {
  it('sinh 2 câu/từ (2 chiều), mỗi câu 4 lựa chọn chứa đáp án đúng', () => {
    const questions = buildQuizQuestions(WORDS);
    expect(questions).toHaveLength(WORDS.length * 2);
    for (const q of questions) {
      expect(q.choices).toHaveLength(4);
      expect(q.choices).toContain(q.correctAnswer);
      expect(new Set(q.choices).size).toBe(4); // không có lựa chọn trùng nhau
    }
    const directions = new Set(questions.map((q) => q.direction));
    expect(directions).toEqual(new Set(['jp-vi', 'vi-jp']));
  });

  it('câu jp-vi hỏi bằng term, đáp án đúng là meaning (và ngược lại cho vi-jp)', () => {
    const questions = buildQuizQuestions(WORDS);
    const jpToVi = questions.find((q) => q.direction === 'jp-vi' && q.prompt === 'わたし');
    expect(jpToVi?.correctAnswer).toBe('Tôi');
    const viToJp = questions.find((q) => q.direction === 'vi-jp' && q.prompt === 'Tôi');
    expect(viToJp?.correctAnswer).toBe('わたし');
  });

  it('bộ từ quá nhỏ (không đủ nhiễu) → bỏ câu đó thay vì trùng lựa chọn', () => {
    const tiny: VocabWord[] = [
      { term: 'A', meaning: 'a' },
      { term: 'B', meaning: 'b' },
    ];
    const questions = buildQuizQuestions(tiny);
    expect(questions).toHaveLength(0);
  });

  it('luyện từ sai (words nhỏ) vẫn đủ 4 lựa chọn nếu có allWords làm nguồn nhiễu', () => {
    const missed = [WORDS[0]];
    const questions = buildQuizQuestions(missed, WORDS);
    expect(questions).toHaveLength(2);
    expect(questions[0].choices).toHaveLength(4);
  });

  it('xáo trộn thứ tự câu hỏi (không luôn theo đúng thứ tự sinh ra)', () => {
    const results = Array.from({ length: 20 }, () => buildQuizQuestions(WORDS).map((q) => q.prompt + q.direction).join(','));
    expect(new Set(results).size).toBeGreaterThan(1);
  });

  it('chỉ chọn 1 chiều (jp-vi) → chỉ sinh câu chiều đó, đúng số lượng bằng số từ', () => {
    const questions = buildQuizQuestions(WORDS, WORDS, ['jp-vi']);
    expect(questions).toHaveLength(WORDS.length);
    expect(questions.every((q) => q.direction === 'jp-vi')).toBe(true);
  });

  it('chỉ chọn 1 chiều (vi-jp) → chỉ sinh câu chiều đó', () => {
    const questions = buildQuizQuestions(WORDS, WORDS, ['vi-jp']);
    expect(questions).toHaveLength(WORDS.length);
    expect(questions.every((q) => q.direction === 'vi-jp')).toBe(true);
  });
});
