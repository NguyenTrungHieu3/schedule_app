// Spaced repetition — theo §4.4 của spec. Hàm thuần, không dính React.

import type { ReviewItem, ReviewResult } from '../types';
import { addDaysToDate } from './date';

export const INTERVALS = [1, 3, 7, 16, 35]; // ngày

// Giới hạn chống ngợp: hàng đợi chỉ hiện tối đa 40 item một ngày.
export const QUEUE_DAILY_CAP = 40;

export function createReviewItem(args: {
  id: string;
  subject: ReviewItem['subject'];
  title: string;
  learnedOn: string;
}): ReviewItem {
  return {
    id: args.id,
    subject: args.subject,
    title: args.title,
    learnedOn: args.learnedOn,
    intervalIndex: 0,
    nextReviewDate: addDaysToDate(args.learnedOn, INTERVALS[0]),
    history: [],
    archived: false,
  };
}

// Xử lý kết quả một lần ôn:
//   good  → tăng intervalIndex; vượt cuối mảng → archived
//   hard  → giữ nguyên intervalIndex → ôn lại sau đúng khoảng đó
//   again → về 0 → ôn lại sau 1 ngày
export function answerReviewItem(item: ReviewItem, result: ReviewResult, today: string): ReviewItem {
  let intervalIndex = item.intervalIndex;
  let archived = item.archived;

  if (result === 'good') {
    if (intervalIndex + 1 >= INTERVALS.length) {
      archived = true;
    } else {
      intervalIndex += 1;
    }
  } else if (result === 'again') {
    intervalIndex = 0;
  }
  // 'hard' → giữ nguyên

  return {
    ...item,
    intervalIndex,
    archived,
    nextReviewDate: addDaysToDate(today, INTERVALS[intervalIndex]),
    history: [...item.history, { date: today, result }],
  };
}

export interface ReviewQueue {
  overdue: ReviewItem[]; // quá hạn — cũ nhất trước
  dueToday: ReviewItem[];
  upcoming: ReviewItem[]; // 7 ngày tới
  visible: ReviewItem[]; // tối đa 40 item ưu tiên cao nhất để ôn hôm nay
  hiddenCount: number; // số item bị dời sang mai — KHÔNG hiện to vào mặt người dùng
}

export function buildReviewQueue(items: ReviewItem[], today: string): ReviewQueue {
  const active = items.filter((i) => !i.archived);

  const overdue = active
    .filter((i) => i.nextReviewDate < today)
    .sort((a, b) => a.nextReviewDate.localeCompare(b.nextReviewDate));
  const dueToday = active.filter((i) => i.nextReviewDate === today);
  const upcoming = active
    .filter((i) => i.nextReviewDate > today && i.nextReviewDate <= addDaysToDate(today, 7))
    .sort((a, b) => a.nextReviewDate.localeCompare(b.nextReviewDate));

  // Ưu tiên: quá hạn lâu nhất trước, rồi đến hạn hôm nay.
  const all = [...overdue, ...dueToday];
  const visible = all.slice(0, QUEUE_DAILY_CAP);

  return { overdue, dueToday, upcoming, visible, hiddenCount: Math.max(0, all.length - QUEUE_DAILY_CAP) };
}
