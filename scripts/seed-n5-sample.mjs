#!/usr/bin/env node
// Nạp một bộ N5 mẫu (thật, phổ thông) vào Supabase — chạy MỘT LẦN sau khi đã
// áp dụng supabase/migrations/0002_learning.sql.
//
// Nội dung dưới đây là từ vựng/kanji/câu N5 phổ thông (có trong mọi giáo trình
// nhập môn — Minna no Nihongo, Genki...), KHÔNG copy từ JMdict/Mazii/Study4.
// Đây là bộ khởi động nhỏ (~40 từ, 20 kanji, 15 câu) để mục "Học" chạy được
// ngay; mở rộng lên đầy đủ N5–N1 bằng JMdict (từ điển, CC BY-SA) + KANJIDIC2
// (kanji) + Tatoeba (câu, CC BY) — xem docs/hoc-tap/nguon-du-lieu.md.
//
// Chạy: node scripts/seed-n5-sample.mjs
// Cần 2 biến môi trường (KHÔNG dùng anon key — cần service role để ghi được
// bảng nội dung hệ thống, bảng này không có policy insert cho user thường):
//   SUPABASE_URL=https://xxxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY=...   (Project Settings → API → service_role secret)

import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    'Thiếu SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.\n' +
      'Chạy: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-n5-sample.mjs\n' +
      '(Lấy service role key ở Supabase Dashboard → Project Settings → API — KHÔNG phải anon key.)',
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

const DECK_NAME = 'JLPT N5 — Cơ bản';

const VOCAB = [
  ['食べる', 'たべる', 'ăn', 'động từ nhóm 2'],
  ['飲む', 'のむ', 'uống', 'động từ nhóm 1'],
  ['行く', 'いく', 'đi', 'động từ nhóm 1'],
  ['来る', 'くる', 'đến', 'động từ nhóm 3 (bất quy tắc)'],
  ['見る', 'みる', 'nhìn, xem', 'động từ nhóm 2'],
  ['聞く', 'きく', 'nghe, hỏi', 'động từ nhóm 1'],
  ['話す', 'はなす', 'nói, nói chuyện', 'động từ nhóm 1'],
  ['読む', 'よむ', 'đọc', 'động từ nhóm 1'],
  ['書く', 'かく', 'viết', 'động từ nhóm 1'],
  ['買う', 'かう', 'mua', 'động từ nhóm 1'],
  ['学生', 'がくせい', 'học sinh, sinh viên', 'danh từ'],
  ['先生', 'せんせい', 'giáo viên, thầy/cô', 'danh từ'],
  ['学校', 'がっこう', 'trường học', 'danh từ'],
  ['会社', 'かいしゃ', 'công ty', 'danh từ'],
  ['友達', 'ともだち', 'bạn bè', 'danh từ'],
  ['家族', 'かぞく', 'gia đình', 'danh từ'],
  ['時間', 'じかん', 'thời gian', 'danh từ'],
  ['今日', 'きょう', 'hôm nay', 'danh từ'],
  ['明日', 'あした', 'ngày mai', 'danh từ'],
  ['昨日', 'きのう', 'hôm qua', 'danh từ'],
  ['毎日', 'まいにち', 'mỗi ngày', 'danh từ'],
  ['水', 'みず', 'nước', 'danh từ'],
  ['本', 'ほん', 'sách', 'danh từ'],
  ['車', 'くるま', 'xe hơi', 'danh từ'],
  ['電車', 'でんしゃ', 'tàu điện', 'danh từ'],
  ['大きい', 'おおきい', 'to, lớn', 'tính từ đuôi い'],
  ['小さい', 'ちいさい', 'nhỏ', 'tính từ đuôi い'],
  ['新しい', 'あたらしい', 'mới', 'tính từ đuôi い'],
  ['古い', 'ふるい', 'cũ', 'tính từ đuôi い'],
  ['高い', 'たかい', 'cao, đắt', 'tính từ đuôi い'],
  ['安い', 'やすい', 'rẻ', 'tính từ đuôi い'],
  ['好き', 'すき', 'thích', 'tính từ đuôi な'],
  ['元気', 'げんき', 'khoẻ mạnh', 'tính từ đuôi な'],
  ['静か', 'しずか', 'yên tĩnh', 'tính từ đuôi な'],
  ['綺麗', 'きれい', 'đẹp, sạch', 'tính từ đuôi な'],
  ['私', 'わたし', 'tôi', 'đại từ'],
  ['誰', 'だれ', 'ai', 'đại từ nghi vấn'],
  ['何', 'なに', 'cái gì', 'đại từ nghi vấn'],
  ['今', 'いま', 'bây giờ', 'danh từ'],
  ['一', 'いち', 'một (số)', 'số từ'],
].map(([term, reading, meaning_vi, pos]) => ({ lang: 'ja', level: 'N5', term, reading, meaning_vi, pos }));

const KANJI = [
  ['日', 'mặt trời, ngày', ['ニチ', 'ジツ'], ['ひ', 'か'], 4],
  ['月', 'mặt trăng, tháng', ['ゲツ', 'ガツ'], ['つき'], 4],
  ['火', 'lửa', ['カ'], ['ひ'], 4],
  ['水', 'nước', ['スイ'], ['みず'], 4],
  ['木', 'cây', ['モク', 'ボク'], ['き'], 4],
  ['金', 'vàng, kim loại, tiền', ['キン'], ['かね'], 8],
  ['土', 'đất', ['ド', 'ト'], ['つち'], 3],
  ['人', 'người', ['ジン', 'ニン'], ['ひと'], 2],
  ['大', 'lớn', ['ダイ', 'タイ'], ['おお'], 3],
  ['小', 'nhỏ', ['ショウ'], ['ちい', 'こ'], 3],
  ['学', 'học', ['ガク'], ['まな'], 8],
  ['生', 'sống, sinh', ['セイ', 'ショウ'], ['い', 'う'], 5],
  ['先', 'trước', ['セン'], ['さき'], 6],
  ['校', 'trường học', ['コウ'], [], 10],
  ['会', 'gặp, hội', ['カイ'], ['あ'], 6],
  ['社', 'công ty, xã hội', ['シャ'], ['やしろ'], 7],
  ['食', 'ăn', ['ショク'], ['た', 'く'], 9],
  ['飲', 'uống', ['イン'], ['の'], 12],
  ['見', 'nhìn', ['ケン'], ['み'], 7],
  ['行', 'đi', ['コウ', 'ギョウ'], ['い', 'おこな'], 6],
].map(([character, meaning_vi, onyomi, kunyomi, stroke_count]) => ({
  character,
  level: 'N5',
  meaning_vi,
  onyomi,
  kunyomi,
  stroke_count,
}));

const SENTENCES = [
  ['私は学生です。', 'Tôi là học sinh.'],
  ['今日は天気がいいです。', 'Hôm nay thời tiết đẹp.'],
  ['毎日日本語を勉強します。', 'Tôi học tiếng Nhật mỗi ngày.'],
  ['これは私の本です。', 'Đây là sách của tôi.'],
  ['学校まで電車で行きます。', 'Tôi đi tàu điện đến trường.'],
  ['友達と話します。', 'Tôi nói chuyện với bạn.'],
  ['水を飲みます。', 'Tôi uống nước.'],
  ['先生は元気です。', 'Thầy giáo khoẻ mạnh.'],
  ['明日友達に会います。', 'Ngày mai tôi sẽ gặp bạn.'],
  ['この部屋は静かです。', 'Căn phòng này yên tĩnh.'],
  ['新しい車を買いました。', 'Tôi đã mua xe mới.'],
  ['今何時ですか。', 'Bây giờ là mấy giờ?'],
  ['誰が来ますか。', 'Ai sẽ đến?'],
  ['私の家族は元気です。', 'Gia đình tôi khoẻ mạnh.'],
  ['昨日本を読みました。', 'Hôm qua tôi đã đọc sách.'],
].map(([text_original, text_vi]) => ({ lang: 'ja', level: 'N5', text_original, text_vi }));

async function main() {
  const { data: existingDeck, error: findErr } = await supabase
    .from('decks')
    .select('id')
    .is('owner_id', null)
    .eq('name', DECK_NAME)
    .maybeSingle();
  if (findErr) throw findErr;
  if (existingDeck) {
    console.log(`Deck "${DECK_NAME}" đã tồn tại (id=${existingDeck.id}) — script chỉ chạy 1 lần, dừng.`);
    return;
  }

  console.log('Chèn vocab...');
  const { data: vocabRows, error: vocabErr } = await supabase.from('vocab').insert(VOCAB).select('id');
  if (vocabErr) throw vocabErr;

  console.log('Chèn kanji...');
  const { data: kanjiRows, error: kanjiErr } = await supabase.from('kanji').insert(KANJI).select('id');
  if (kanjiErr) throw kanjiErr;

  console.log('Chèn câu ví dụ...');
  const { data: sentenceRows, error: sentenceErr } = await supabase.from('sentences').insert(SENTENCES).select('id');
  if (sentenceErr) throw sentenceErr;

  console.log('Tạo deck hệ thống...');
  const { data: deck, error: deckErr } = await supabase
    .from('decks')
    .insert({ owner_id: null, lang: 'ja', level: 'N5', name: DECK_NAME, description: 'Từ vựng, kanji và câu ví dụ N5 cơ bản.' })
    .select('id')
    .single();
  if (deckErr) throw deckErr;

  const deckItems = [
    ...vocabRows.map((r, i) => ({ deck_id: deck.id, item_type: 'vocab', item_id: r.id, position: i })),
    ...kanjiRows.map((r, i) => ({ deck_id: deck.id, item_type: 'kanji', item_id: r.id, position: i })),
    ...sentenceRows.map((r, i) => ({ deck_id: deck.id, item_type: 'sentence', item_id: r.id, position: i })),
  ];
  console.log('Gắn item vào deck...');
  const { error: itemsErr } = await supabase.from('deck_items').insert(deckItems);
  if (itemsErr) throw itemsErr;

  console.log(
    `Xong. Deck "${DECK_NAME}" (id=${deck.id}): ${vocabRows.length} từ, ${kanjiRows.length} kanji, ${sentenceRows.length} câu.`,
  );
}

main().catch((err) => {
  console.error('Seed thất bại:', err);
  process.exit(1);
});
