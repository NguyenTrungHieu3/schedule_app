// Các kiểu dữ liệu dùng chung trong toàn app — theo §3.2 của spec.

export type Subject = 'programming' | 'japanese' | 'toeic';

export type BlockKind =
  | 'class' // học ở trung tâm — không tick pomodoro, chỉ đánh dấu có đi hay không
  | 'deep' // Pomodoro 50/10
  | 'light' // Pomodoro 25/5
  | 'srs' // phiên ôn tập
  | 'review' // active recall sau lớp
  | 'rest'; // nghỉ — hiện mờ, không tính giờ

// Một block trong template lịch tuần (dữ liệu tĩnh, người dùng sửa được trong Cài đặt)
export interface ScheduleBlock {
  id: string;
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Chủ nhật
  startTime: string; // "07:00"
  endTime: string; // "09:00"
  subject: Subject | null; // null cho block nghỉ / block chung
  kind: BlockKind;
  title: string;
  pomodoroCount: number; // số pomodoro dự kiến, 0 nếu không áp dụng
  grantsBigBox?: boolean; // cờ đặc biệt: hoàn thành block này cấp 1 lượt bốc hộp lớn (mock test T7)
  isTrueRest?: boolean; // block "🌴 NGHỈ THẬT" CN — rest nhưng tick được, tick thì khen
}

export type DayTier = 'gold' | 'silver' | 'minimum' | 'broken' | 'frozen' | 'pending';

// Bản ghi thực tế của một ngày
export interface DayLog {
  date: string; // "2026-07-18" (ISO, theo ngày logic giờ VN)
  completedBlockIds: string[];
  minutesBySubject: Record<Subject, number>;
  pomodorosCompleted: number;
  // Số pomodoro đã chạy THEO TỪNG BLOCK (blockId → số lần) — để hiện tiến độ
  // "🍅 2/3" trong block. Optional: log cũ không có field này vẫn đọc được.
  pomodorosByBlock?: Record<string, number>;
  tier: DayTier;
  note?: string;
}

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastCountedDate: string | null;
  freezeTokensRemaining: number; // reset về 2 mỗi đầu tháng, không cộng dồn
  freezeTokensMonth: string; // "2026-07" — để biết khi nào cần reset
}

// Hộp phần thưởng
export type RewardType = 'reward' | 'neutral' | 'penalty';
export type RewardBox = 'small' | 'big';

export interface RewardSlip {
  id: string;
  box: RewardBox;
  type: RewardType;
  text: string;
  enabled: boolean;
}

export interface RewardDraw {
  id: string;
  slipId: string;
  slipTextSnapshot: string; // lưu bản sao phòng khi slip bị xoá sau này
  box: RewardBox;
  type: RewardType;
  drawnAt: string; // ISO datetime
  claimed: boolean; // đã thực hiện/nhận thưởng chưa
}

// Spaced repetition
export type ReviewResult = 'good' | 'hard' | 'again';

export interface ReviewItem {
  id: string;
  subject: Subject;
  title: string;
  learnedOn: string; // "2026-07-18"
  intervalIndex: number; // trỏ vào INTERVALS
  nextReviewDate: string;
  history: { date: string; result: ReviewResult }[];
  archived: boolean;
}

// Sổ lỗi TOEIC
export type ToeicPart = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface ErrorEntry {
  id: string;
  part: ToeicPart;
  questionText: string;
  myAnswer: string;
  correctAnswer: string;
  reason: string; // "không biết từ" / "bẫy ngữ pháp" / "nghe không kịp"
  createdOn: string;
  nextReviewDate: string;
  intervalIndex: number; // dùng lịch cố định [1, 7, 30] ngày
  resolved: boolean; // đã ôn 3 lần đúng → true
}

export interface WeeklyReview {
  weekStartDate: string; // thứ Hai của tuần đó
  skippedBlocks: string;
  avoidedSubject: string;
  rewardBoxStillFun: boolean;
  nightsSlept7h: number; // 0-7
  createdAt: string;
}

export interface AppSettings {
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  lastBackupDate: string | null; // để nhắc backup mỗi 30 ngày
}
