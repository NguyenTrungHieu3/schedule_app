// "Sổ từ sai" cho trang kiểm tra từ vựng — luôn lưu máy (localStorageRepository),
// KHÔNG qua Supabase, vì tính năng này chạy được kể cả khi chưa đăng nhập.

import type { VocabWord } from '../data/n5Vocab';
import { localStorageRepository } from '../storage/repository';

export async function getWrongWords(): Promise<VocabWord[]> {
  return (await localStorageRepository.get<VocabWord[]>('vocabWrongWords')) ?? [];
}

// Gộp thêm từ sai mới, không trùng lặp (theo term).
export async function addWrongWords(words: VocabWord[]): Promise<VocabWord[]> {
  const current = await getWrongWords();
  const byTerm = new Map(current.map((w) => [w.term, w]));
  for (const w of words) byTerm.set(w.term, w);
  const next = [...byTerm.values()];
  await localStorageRepository.set('vocabWrongWords', next);
  return next;
}

export async function removeWrongWord(term: string): Promise<VocabWord[]> {
  const next = (await getWrongWords()).filter((w) => w.term !== term);
  await localStorageRepository.set('vocabWrongWords', next);
  return next;
}

export async function clearWrongWords(): Promise<void> {
  await localStorageRepository.remove('vocabWrongWords');
}
