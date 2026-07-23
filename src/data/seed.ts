// Seed data nạp sẵn khi mở app lần đầu — theo §5 của spec.
// Người dùng sửa được toàn bộ trong trang Cài đặt sau này.

import type { RewardSlip, ScheduleBlock, Subject } from '../types';

// Helper dựng block cho gọn — id đặt theo thứ + giờ để đọc log dễ hiểu.
let seedCounter = 0;
function block(
  dayOfWeek: ScheduleBlock['dayOfWeek'],
  startTime: string,
  endTime: string,
  subject: Subject | null,
  kind: ScheduleBlock['kind'],
  title: string,
  pomodoroCount: number,
  extra?: Partial<ScheduleBlock>,
): ScheduleBlock {
  seedCounter += 1;
  return {
    id: `seed-${dayOfWeek}-${startTime.replace(':', '')}-${seedCounter}`,
    dayOfWeek,
    startTime,
    endTime,
    subject,
    kind,
    title,
    pomodoroCount,
    ...extra,
  };
}

// Thứ 2 / 4 / 6 — cùng một khung, chỉ khác dayOfWeek.
function weekdayWithProgrammingClass(day: 1 | 3 | 5): ScheduleBlock[] {
  return [
    block(day, '06:30', '07:00', null, 'srs', 'Anki sáng (Nhật + TOEIC)', 1),
    block(day, '07:00', '09:00', 'toeic', 'deep', 'TOEIC Reading — Part 5/6/7', 2),
    block(day, '09:15', '11:15', 'japanese', 'deep', 'Tiếng Nhật — ngữ pháp + Kanji mới', 2),
    block(day, '11:15', '13:30', null, 'rest', 'Ăn trưa + ngủ trưa 20 phút', 0),
    block(day, '13:30', '15:30', 'programming', 'deep', 'Lập trình — code project', 2),
    block(day, '15:45', '17:00', 'toeic', 'light', 'TOEIC Listening — Part 1–4', 3),
    block(day, '17:00', '18:15', null, 'rest', 'Nghỉ, ăn, di chuyển', 0),
    block(day, '18:30', '21:30', 'programming', 'class', '🏫 Lớp lập trình', 0),
    block(day, '21:45', '22:15', 'programming', 'review', 'Active recall — viết lại 5 ý chính buổi học', 1),
  ];
}

// Thứ 3 — giống thứ 2 nhưng chiều TOEIC Reading, tối lớp tiếng Nhật.
const tuesday: ScheduleBlock[] = [
  block(2, '06:30', '07:00', null, 'srs', 'Anki sáng (Nhật + TOEIC)', 1),
  block(2, '07:00', '09:00', 'toeic', 'deep', 'TOEIC Reading — Part 5/6/7', 2),
  block(2, '09:15', '11:15', 'japanese', 'deep', 'Tiếng Nhật — ngữ pháp + Kanji mới', 2),
  block(2, '11:15', '13:30', null, 'rest', 'Ăn trưa + ngủ trưa 20 phút', 0),
  block(2, '13:30', '15:30', 'programming', 'deep', 'Lập trình — code project', 2),
  block(2, '15:45', '17:00', 'toeic', 'light', 'TOEIC Reading', 3),
  block(2, '17:00', '19:00', null, 'rest', 'Nghỉ, ăn, di chuyển', 0),
  block(2, '19:00', '21:30', 'japanese', 'class', '🏫 Lớp tiếng Nhật', 0),
  block(2, '21:45', '22:15', 'japanese', 'review', 'Viết lại mẫu câu + kanji buổi học từ trí nhớ', 1),
];

// Thứ 5 — không có lớp.
const thursday: ScheduleBlock[] = [
  block(4, '06:30', '07:00', null, 'srs', 'Anki sáng', 1),
  block(4, '07:00', '09:00', 'toeic', 'deep', 'TOEIC Reading', 2),
  block(4, '09:15', '11:15', 'programming', 'deep', 'Lập trình — tính năng khó nhất tuần', 2),
  block(4, '11:15', '13:30', null, 'rest', 'Nghỉ trưa', 0),
  block(4, '13:30', '15:30', 'japanese', 'deep', 'Tiếng Nhật — nghe + shadowing + ngữ pháp', 2),
  block(4, '15:45', '17:15', 'programming', 'deep', 'Lập trình — debug / đọc code người khác', 1),
  block(4, '17:15', '19:00', null, 'rest', 'Nghỉ tối', 0),
  block(4, '19:00', '21:00', 'toeic', 'light', 'TOEIC Listening + từ vựng', 4),
  block(4, '21:15', '21:45', null, 'srs', 'Anki tối', 1),
];

// Thứ 7 — NGÀY BOSS FIGHT.
const saturday: ScheduleBlock[] = [
  block(6, '07:30', '09:30', 'toeic', 'deep', '⚔️ Full TOEIC mock test (bấm giờ thật)', 0, { grantsBigBox: true }),
  block(6, '09:45', '11:15', 'toeic', 'light', 'Chữa đề — ghi mọi câu sai vào Sổ Lỗi', 3),
  block(6, '11:15', '13:30', null, 'rest', 'Nghỉ trưa', 0),
  block(6, '13:30', '16:00', 'programming', 'deep', '⚔️ Build ngày — ghép bài cả tuần thành sản phẩm chạy được', 2),
  block(6, '16:15', '17:30', 'japanese', 'light', 'Mini test tự chấm (kanji + ngữ pháp tuần)', 3),
  block(6, '17:30', '19:00', null, 'rest', 'Nghỉ tối', 0),
  block(6, '19:00', '20:30', null, 'srs', 'Ôn Sổ Lỗi tuần trước + tuần này', 3),
  block(6, '20:30', '21:00', null, 'review', '🎁 Bốc hộp lớn + tổng kết tuần', 0),
];

// Chủ nhật — NGÀY NHẸ. Block "🌴 NGHỈ THẬT" là thành tựu, tick được và được khen.
const sunday: ScheduleBlock[] = [
  block(0, '08:00', '10:30', 'japanese', 'class', '🏫 Lớp tiếng Nhật', 0),
  block(0, '11:00', '11:30', 'japanese', 'review', 'Viết lại bài lớp từ trí nhớ', 1),
  block(0, '14:00', '15:30', null, 'srs', 'Ôn tổng SRS — dọn hết thẻ tồn, ôn code cũ', 3),
  block(0, '15:30', '16:30', null, 'review', 'Rà soát tuần + nạp giấy mới vào hộp thưởng', 0),
  block(0, '16:30', '23:00', null, 'rest', '🌴 NGHỈ THẬT. Không học.', 0, { isTrueRest: true }),
];

export const SEED_SCHEDULE_BLOCKS: ScheduleBlock[] = [
  ...weekdayWithProgrammingClass(1),
  ...tuesday,
  ...weekdayWithProgrammingClass(3),
  ...thursday,
  ...weekdayWithProgrammingClass(5),
  ...saturday,
  ...sunday,
];

// ===== Giấy hộp thưởng =====
// Tỉ lệ 70/20/10 được đảm bảo bằng THÀNH PHẦN pool (số tờ mỗi loại),
// không phải bằng logic bốc — xem §4.6.

let slipCounter = 0;
function slip(box: RewardSlip['box'], type: RewardSlip['type'], text: string): RewardSlip {
  slipCounter += 1;
  // Giấy đặc biệt có id cố định để logic bốc nhận diện được (xem logic/reward.ts).
  const SPECIAL_IDS: Record<string, string> = {
    'Bốc lại ngay': 'slip-redraw',
    'Để dành — block sau bốc 2 tờ': 'slip-double-next',
    'Bốc thêm 1 tờ hộp nhỏ': 'slip-big-draw-small',
  };
  return { id: SPECIAL_IDS[text] ?? `seed-slip-${slipCounter}`, box, type, text, enabled: true };
}

const SMALL_REWARDS = [
  'Nghe 2 bài nhạc yêu thích',
  '1 que kem',
  '1 gói snack',
  'Lướt điện thoại tự do 10 phút',
  'Xem 1 video YouTube bất kỳ',
  'Nằm dài 15 phút không làm gì',
  'Nhắn tin tán gẫu với bạn 10 phút',
  '1 ly cà phê',
  'Xem 1 clip hài',
  'Ra ngoài đi bộ 15 phút',
  'Chơi game 15 phút',
  'Ăn 1 món vặt tuỳ chọn',
  'Nghe 1 podcast 15 phút',
  'Vẽ nguệch ngoạc 10 phút',
  'Gọi điện cho người thân',
  'Tắm nước nóng thư giãn',
  'Đọc 10 trang truyện',
  'Ngủ trưa thêm 15 phút',
  'Xem 1 video về chủ đề mình thích',
  'Uống 1 ly nước ép',
  'Nghỉ dài 20 phút thay vì 10',
];

const SMALL_NEUTRALS = [
  'Không có gì. Vào việc tiếp.',
  'Để dành — block sau bốc 2 tờ',
  'Bốc lại ngay',
  'Tự chọn phần thưởng nhỏ bất kỳ',
  'Uống 1 cốc nước lọc',
  'Hôm nay may mắn để dành cho lần sau',
];

const SMALL_PENALTIES = ['💪 Hít đất 10 cái', '💪 Plank 45 giây', '💪 Squat 20 cái'];

const BIG_REWARDS = [
  '1 ly trà sữa full topping',
  '1 bữa ăn ngoài tự chọn',
  'Xem 1 tập phim',
  'Xem 1 bộ phim',
  'Chơi game 1 tiếng',
  'Mua 1 món dưới 200k',
  'Ngủ nướng thêm 1 tiếng sáng mai',
  'Đi cà phê với bạn',
  'Một buổi tối hoàn toàn tự do',
  'Mua 1 món đồ ăn yêu thích',
  'Đi chơi nửa ngày cuối tuần',
];

const BIG_NEUTRALS = [
  'Tự chọn phần thưởng bất kỳ',
  'Để dành cộng dồn vào lần bốc hộp lớn sau',
  'Bốc thêm 1 tờ hộp nhỏ',
];

const BIG_PENALTIES = ['💪 Chạy bộ 20 phút'];

export const SEED_REWARD_SLIPS: RewardSlip[] = [
  ...SMALL_REWARDS.map((text) => slip('small', 'reward', text)),
  ...SMALL_NEUTRALS.map((text) => slip('small', 'neutral', text)),
  ...SMALL_PENALTIES.map((text) => slip('small', 'penalty', text)),
  ...BIG_REWARDS.map((text) => slip('big', 'reward', text)),
  ...BIG_NEUTRALS.map((text) => slip('big', 'neutral', text)),
  ...BIG_PENALTIES.map((text) => slip('big', 'penalty', text)),
];

// ===== Câu "lừa não" theo môn — §5.4 =====
export const TWO_MINUTE_PROMPTS: Record<Subject, string[]> = {
  programming: ['Chỉ mở editor và gõ 1 dòng thôi.', 'Chỉ đọc lại code hôm qua thôi.'],
  japanese: ['Chỉ viết 1 chữ kanji.', 'Chỉ lật 3 thẻ Anki.'],
  toeic: ['Chỉ đọc đúng 1 câu Part 5.', 'Chỉ nghe 1 file audio 30 giây.'],
};
