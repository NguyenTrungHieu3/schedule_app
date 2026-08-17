// Store cho khu vực "Học" (flashcard/SRS) — song song với appStore.ts (Chăm),
// KHÔNG gộp chung vì đây là dữ liệu quan hệ (Supabase bảng vocab/kanji/...),
// không đi qua repository (kv). Tích hợp ngược vào Chăm ở cuối phiên ôn: xem
// finishSessionIfDue() — tick block lịch tuần kind 'srs' (nếu có đặt cho hôm
// nay) + cấp 1 lượt bốc hộp nhỏ, tái dùng đúng cơ chế appStore đã có.

import { create } from 'zustand';
import { supabase } from '../storage/supabaseClient';
import {
  fetchCardReviews,
  fetchCardsForDecks,
  fetchDeckCards,
  fetchDeckSummaries,
  fetchDecks,
  upsertCardReview,
} from '../data/learningClient';
import type { Deck, DeckCard, DeckWithSummary } from '../data/learningTypes';
import { answerCardReview, buildCardQueue, createCardReview, type CardReview, type MasterySkill } from '../logic/cardReview';
import { getDayOfWeek, getLogicalDate } from '../logic/date';
import { useAppStore } from './appStore';
import type { ReviewResult } from '../types';

function reviewKey(itemType: string, itemId: string): string {
  return `${itemType}:${itemId}`;
}

interface LearningState {
  loading: boolean;
  decks: Deck[];
  summaries: DeckWithSummary[];
  currentDeckId: string | null; // null khi đang ôn gộp toàn bộ (xem loadAllDue)
  cards: DeckCard[];
  reviews: Map<string, CardReview>;

  loadDecks(lang?: 'ja' | 'en'): Promise<void>;
  // Tóm tắt (số thẻ đến hạn + % đã thuộc) của MỌI deck — cho lưới thẻ ở trang Học.
  loadSummaries(lang?: 'ja' | 'en'): Promise<void>;
  loadDeck(deckId: string): Promise<void>;
  // "Ôn ngay" toàn cục (nút hero trang Học) — gộp thẻ đến hạn của MỌI deck.
  loadAllDue(lang?: 'ja' | 'en'): Promise<void>;
  answerCard(card: DeckCard, result: ReviewResult, skill: MasterySkill): Promise<void>;
}

// Sau khi hết thẻ đến hạn hôm nay: nếu lịch tuần có block kind 'srs' chưa tick
// hôm nay, tick nó (ăn vào tier/streak Chăm y hệt các block khác); luôn cấp 1
// lượt bốc hộp nhỏ (namespace riêng — không đụng key `small:bonus:srs:` mà
// trang Ôn tập đã dùng).
async function creditChamOnSessionFinish(): Promise<void> {
  const today = getLogicalDate();
  const app = useAppStore.getState();
  const todaySrsBlock = app.scheduleBlocks.find(
    (b) => b.dayOfWeek === getDayOfWeek(today) && b.kind === 'srs' && !(app.dayLogs[today]?.completedBlockIds ?? []).includes(b.id),
  );
  if (todaySrsBlock) await app.toggleBlock(todaySrsBlock.id);
  await app.grantBonusSmall(`small:bonus:hoc:${today}`);
}

export const useLearningStore = create<LearningState>((set, get) => ({
  loading: false,
  decks: [],
  summaries: [],
  currentDeckId: null,
  cards: [],
  reviews: new Map(),

  async loadDecks(lang = 'ja') {
    set({ loading: true });
    const decks = await fetchDecks(lang);
    set({ decks, loading: false });
  },

  async loadSummaries(lang = 'ja') {
    set({ loading: true });
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Chưa đăng nhập.');
    const summaries = await fetchDeckSummaries(user.id, lang, getLogicalDate());
    set({ summaries, loading: false });
  },

  async loadAllDue(lang = 'ja') {
    set({ loading: true });
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Chưa đăng nhập.');

    const decks = await fetchDecks(lang);
    const cards = await fetchCardsForDecks(decks.map((d) => d.id));
    const existingReviews = await fetchCardReviews(user.id, cards);

    const today = getLogicalDate();
    const reviews = new Map(existingReviews);
    for (const card of cards) {
      const key = reviewKey(card.itemType, card.itemId);
      if (!reviews.has(key)) reviews.set(key, createCardReview(card.itemType, card.itemId, today));
    }

    set({ currentDeckId: null, cards, reviews, loading: false });
  },

  async loadDeck(deckId) {
    set({ loading: true });
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Chưa đăng nhập.');

    const cards = await fetchDeckCards(deckId);
    const existingReviews = await fetchCardReviews(user.id, cards);

    const today = getLogicalDate();
    const reviews = new Map(existingReviews);
    for (const card of cards) {
      const key = reviewKey(card.itemType, card.itemId);
      if (!reviews.has(key)) reviews.set(key, createCardReview(card.itemType, card.itemId, today));
    }

    set({ currentDeckId: deckId, cards, reviews, loading: false });
  },

  async answerCard(card, result, skill) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Chưa đăng nhập.');

    const today = getLogicalDate();
    const key = reviewKey(card.itemType, card.itemId);
    const current = get().reviews.get(key) ?? createCardReview(card.itemType, card.itemId, today);
    const updated = answerCardReview(current, result, skill, today);

    const reviews = new Map(get().reviews);
    reviews.set(key, updated);
    set({ reviews });
    await upsertCardReview(user.id, updated);

    // Vừa xong hết thẻ đến hạn hôm nay của deck này → ghi nhận vào Chăm.
    const queue = buildCardQueue([...reviews.values()], today);
    if (queue.visible.length === 0) await creditChamOnSessionFinish();
  },
}));
