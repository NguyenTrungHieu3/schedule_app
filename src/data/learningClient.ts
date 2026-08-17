// Lớp truy vấn Supabase cho khu vực "Học" — tách khỏi storage/supabaseRepository.ts
// (kv, state cá nhân của Chăm) vì đây là bảng QUAN HỆ, không phải key-value.
// Chỉ file này (+ learningStore.ts) được đụng trực tiếp vào các bảng
// vocab/kanji/sentences/decks/deck_items/card_reviews.

import { supabase } from '../storage/supabaseClient';
import type { CardItemType, CardReview } from '../logic/cardReview';
import { createCardReview } from '../logic/cardReview';
import { summarizeDeckReviews } from '../logic/deckSummary';
import type { CardReviewRow, Deck, DeckCard, DeckWithSummary, KanjiRow, SentenceRow, VocabRow } from './learningTypes';

export async function fetchDecks(lang: 'ja' | 'en'): Promise<Deck[]> {
  const { data, error } = await supabase.from('decks').select('*').eq('lang', lang).order('level');
  if (error) throw error;
  return data as Deck[];
}

interface DeckItemRow {
  item_type: CardItemType;
  item_id: string;
  position: number;
}

// Join thủ công deck_items → DeckCard (item_type/item_id là khoá đa hình —
// Supabase/PostgREST không join xuyên bảng khác tên kiểu này). Dùng chung cho
// cả "thẻ của 1 deck" lẫn "thẻ gộp của nhiều deck" (xem fetchCardsForDecks).
async function resolveDeckItemsToCards(rows: DeckItemRow[]): Promise<DeckCard[]> {
  const vocabIds = rows.filter((r) => r.item_type === 'vocab').map((r) => r.item_id);
  const kanjiIds = rows.filter((r) => r.item_type === 'kanji').map((r) => r.item_id);
  const sentenceIds = rows.filter((r) => r.item_type === 'sentence').map((r) => r.item_id);

  const [vocabRes, kanjiRes, sentenceRes] = await Promise.all([
    vocabIds.length ? supabase.from('vocab').select('*').in('id', vocabIds) : Promise.resolve({ data: [], error: null }),
    kanjiIds.length ? supabase.from('kanji').select('*').in('id', kanjiIds) : Promise.resolve({ data: [], error: null }),
    sentenceIds.length
      ? supabase.from('sentences').select('*').in('id', sentenceIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (vocabRes.error) throw vocabRes.error;
  if (kanjiRes.error) throw kanjiRes.error;
  if (sentenceRes.error) throw sentenceRes.error;

  const vocabById = new Map((vocabRes.data as VocabRow[]).map((v) => [v.id, v]));
  const kanjiById = new Map((kanjiRes.data as KanjiRow[]).map((k) => [k.id, k]));
  const sentenceById = new Map((sentenceRes.data as SentenceRow[]).map((s) => [s.id, s]));

  const cards: DeckCard[] = [];
  for (const row of rows) {
    if (row.item_type === 'vocab') {
      const v = vocabById.get(row.item_id);
      if (v) cards.push({ itemType: 'vocab', itemId: v.id, front: v.term, back: v.meaning_vi, reading: v.reading });
    } else if (row.item_type === 'kanji') {
      const k = kanjiById.get(row.item_id);
      if (k) {
        const reading = [...k.onyomi, ...k.kunyomi].join('、') || null;
        cards.push({ itemType: 'kanji', itemId: k.id, front: k.character, back: k.meaning_vi, reading });
      }
    } else {
      const s = sentenceById.get(row.item_id);
      if (s) cards.push({ itemType: 'sentence', itemId: s.id, front: s.text_original, back: s.text_vi, reading: null });
    }
  }
  return cards;
}

export async function fetchDeckCards(deckId: string): Promise<DeckCard[]> {
  const { data, error } = await supabase
    .from('deck_items')
    .select('item_type,item_id,position')
    .eq('deck_id', deckId)
    .order('position');
  if (error) throw error;
  return resolveDeckItemsToCards(data as DeckItemRow[]);
}

// Thẻ gộp của NHIỀU deck (cho "Ôn ngay" toàn cục ở trang Học) — khử trùng
// lặp theo item_type+item_id vì một thẻ có thể nằm trong nhiều deck.
export async function fetchCardsForDecks(deckIds: string[]): Promise<DeckCard[]> {
  if (deckIds.length === 0) return [];
  const { data, error } = await supabase
    .from('deck_items')
    .select('item_type,item_id,position')
    .in('deck_id', deckIds)
    .order('position');
  if (error) throw error;
  const seen = new Set<string>();
  const rows = (data as DeckItemRow[]).filter((r) => {
    const key = `${r.item_type}:${r.item_id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return resolveDeckItemsToCards(rows);
}

function rowToCardReview(row: CardReviewRow): CardReview {
  return {
    itemType: row.item_type,
    itemId: row.item_id,
    intervalIndex: row.interval_index,
    nextReviewDate: row.next_review_date,
    mastery: row.mastery,
    history: row.history,
    archived: row.archived,
  };
}

// Trạng thái ôn (SRS) của user cho đúng tập item. Nhận `{itemType,itemId}[]`
// (không phải DeckCard[] đầy đủ) để dùng chung được cho cả tra cứu theo 1
// deck lẫn tra cứu gộp nhiều deck (fetchDeckSummaries) — DeckCard vẫn khớp
// kiểu này (structural typing), chỗ gọi cũ không cần đổi.
export async function fetchCardReviews(
  userId: string,
  items: { itemType: CardItemType; itemId: string }[],
): Promise<Map<string, CardReview>> {
  if (items.length === 0) return new Map();
  const byType = { vocab: [] as string[], kanji: [] as string[], sentence: [] as string[] };
  for (const c of items) byType[c.itemType].push(c.itemId);

  const results = new Map<string, CardReview>();
  for (const itemType of ['vocab', 'kanji', 'sentence'] as const) {
    const ids = byType[itemType];
    if (ids.length === 0) continue;
    const { data, error } = await supabase
      .from('card_reviews')
      .select('*')
      .eq('user_id', userId)
      .eq('item_type', itemType)
      .in('item_id', ids);
    if (error) throw error;
    for (const row of data as CardReviewRow[]) {
      results.set(`${row.item_type}:${row.item_id}`, rowToCardReview(row));
    }
  }
  return results;
}

export async function upsertCardReview(userId: string, review: CardReview): Promise<void> {
  const { error } = await supabase.from('card_reviews').upsert(
    {
      user_id: userId,
      item_type: review.itemType,
      item_id: review.itemId,
      interval_index: review.intervalIndex,
      next_review_date: review.nextReviewDate,
      mastery: review.mastery,
      history: review.history,
      archived: review.archived,
    },
    { onConflict: 'user_id,item_type,item_id' },
  );
  if (error) throw error;
}

// Tóm tắt tiến độ MỌI deck của 1 ngôn ngữ — cho lưới thẻ deck ở trang Học.
// `today` (ngày logic) do caller truyền vào — data layer chỉ làm I/O, không tự
// quyết định "hôm nay là gì" (xem logic/date.ts).
export async function fetchDeckSummaries(userId: string, lang: 'ja' | 'en', today: string): Promise<DeckWithSummary[]> {
  const decks = await fetchDecks(lang);
  if (decks.length === 0) return [];

  const { data, error } = await supabase
    .from('deck_items')
    .select('deck_id,item_type,item_id')
    .in(
      'deck_id',
      decks.map((d) => d.id),
    );
  if (error) throw error;
  const itemRows = data as { deck_id: string; item_type: CardItemType; item_id: string }[];

  const reviewsByKey = await fetchCardReviews(
    userId,
    itemRows.map((r) => ({ itemType: r.item_type, itemId: r.item_id })),
  );

  return decks.map((deck) => {
    const reviews = itemRows
      .filter((r) => r.deck_id === deck.id)
      .map((r) => reviewsByKey.get(`${r.item_type}:${r.item_id}`) ?? createCardReview(r.item_type, r.item_id, today));
    return { ...deck, summary: summarizeDeckReviews(reviews, today) };
  });
}
