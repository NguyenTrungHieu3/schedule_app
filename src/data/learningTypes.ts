// Kiểu dữ liệu cho khu vực "Học" (flashcard/SRS nội dung Nhật/Anh) — khác
// types.ts (state cá nhân của Chăm, lưu trong bảng kv) ở chỗ đây là dữ liệu
// QUAN HỆ trong Supabase (bảng vocab/kanji/sentences/decks/card_reviews, xem
// supabase/migrations/0002_learning.sql).

import type { CardItemType, CardMastery } from '../logic/cardReview';
import type { DeckSummary } from '../logic/deckSummary';
import type { ReviewResult } from '../types';

export interface VocabRow {
  id: string;
  lang: 'ja' | 'en';
  level: string | null;
  term: string;
  reading: string | null;
  meaning_vi: string;
  pos: string | null;
}

export interface KanjiRow {
  id: string;
  character: string;
  level: string | null;
  meaning_vi: string;
  onyomi: string[];
  kunyomi: string[];
  stroke_count: number | null;
}

export interface SentenceRow {
  id: string;
  lang: 'ja' | 'en';
  level: string | null;
  text_original: string;
  text_vi: string;
}

export interface Deck {
  id: string;
  owner_id: string | null; // null = deck hệ thống
  lang: 'ja' | 'en';
  level: string | null;
  name: string;
  description: string | null;
}

export interface DeckWithSummary extends Deck {
  summary: DeckSummary;
}

// Một item cụ thể trong deck, đã "duỗi phẳng" (join sẵn) để UI không cần biết
// item_type là gì khi hiển thị — chỉ cần front/back.
export interface DeckCard {
  itemType: CardItemType;
  itemId: string;
  front: string; // term / character / text_original
  back: string; // meaning_vi / meaning_vi / text_vi
  reading: string | null; // furigana (vocab) hoặc onyomi+kunyomi gộp (kanji)
}

// Row thô của bảng card_reviews (snake_case khớp cột DB).
export interface CardReviewRow {
  user_id: string;
  item_type: CardItemType;
  item_id: string;
  interval_index: number;
  next_review_date: string;
  mastery: CardMastery;
  history: { date: string; result: ReviewResult }[];
  archived: boolean;
}
