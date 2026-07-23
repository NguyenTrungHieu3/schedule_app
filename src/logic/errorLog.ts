// Sổ lỗi TOEIC — theo §4.5 của spec. Hàm thuần, không dính React.
// Dùng lịch cố định [1, 7, 30] ngày; 3 lần "Đã nhớ" liên tiếp → resolved.

import type { ErrorEntry } from '../types';
import { addDaysToDate } from './date';

export const ERROR_INTERVALS = [1, 7, 30]; // ngày

export const ERROR_REASONS = ['không biết từ', 'bẫy ngữ pháp', 'nghe không kịp', 'đọc không kịp giờ', 'bất cẩn'];

export function createErrorEntry(args: {
  id: string;
  part: ErrorEntry['part'];
  questionText: string;
  myAnswer: string;
  correctAnswer: string;
  reason: string;
  createdOn: string;
}): ErrorEntry {
  return {
    ...args,
    intervalIndex: 0,
    nextReviewDate: addDaysToDate(args.createdOn, ERROR_INTERVALS[0]),
    resolved: false,
  };
}

// remembered = bấm "Đã nhớ". 3 lần liên tiếp (đi hết [1,7,30]) → resolved.
// Chưa nhớ → quay về đầu lịch, ôn lại sau 1 ngày.
export function answerErrorEntry(entry: ErrorEntry, remembered: boolean, today: string): ErrorEntry {
  if (remembered) {
    if (entry.intervalIndex + 1 >= ERROR_INTERVALS.length) {
      return { ...entry, resolved: true };
    }
    const intervalIndex = entry.intervalIndex + 1;
    return { ...entry, intervalIndex, nextReviewDate: addDaysToDate(today, ERROR_INTERVALS[intervalIndex]) };
  }
  return { ...entry, intervalIndex: 0, nextReviewDate: addDaysToDate(today, ERROR_INTERVALS[0]) };
}

export function dueErrorEntries(entries: ErrorEntry[], today: string): ErrorEntry[] {
  return entries
    .filter((e) => !e.resolved && e.nextReviewDate <= today)
    .sort((a, b) => a.nextReviewDate.localeCompare(b.nextReviewDate));
}
