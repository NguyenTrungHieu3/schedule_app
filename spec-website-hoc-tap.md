# SPEC XÂY DỰNG WEBSITE QUẢN LÝ HỌC TẬP
### Tài liệu dành cho Claude Code — đọc hết trước khi viết dòng code đầu tiên

---

## 0. TÓM TẮT

Xây một web app cá nhân (single user, không đăng nhập) giúp một người học đồng thời **Lập trình / Tiếng Nhật / TOEIC** với cường độ 10–12h/ngày, dựa trên 5 cơ chế: lịch cố định theo thứ, spaced repetition, Pomodoro, hộp phần thưởng ngẫu nhiên, và hệ thống chuỗi 3 mức.

**Quyết định kỹ thuật đã chốt:**

| Hạng mục | Lựa chọn |
|---|---|
| Kiểu app | SPA, client-only, **không backend** |
| Lưu trữ | `localStorage` — nhưng **bắt buộc** đi qua một lớp trừu tượng (xem §3.1) |
| Thiết bị chính | **Desktop** (responsive xuống mobile ở mức dùng tạm được) |
| Đăng nhập | Không có |
| Múi giờ | `Asia/Ho_Chi_Minh`, hardcode |
| Ngôn ngữ UI | Tiếng Việt |

**Tech stack khuyến nghị:**

```
React 18 + TypeScript + Vite
Tailwind CSS
Zustand (state) — hoặc Context + useReducer nếu muốn ít dependency
React Router
Recharts (biểu đồ)
date-fns (xử lý ngày)
```

> **Lý do chọn stack này:** chủ sở hữu app đang học lập trình và sẽ tự sửa/mở rộng app sau. Ưu tiên code dễ đọc hơn code ngắn. Không dùng abstraction thông minh. Đặt tên biến đầy đủ. Comment ở chỗ logic khó (SRS, streak).

---

## 1. NGUYÊN TẮC THIẾT KẾ — đọc kỹ, phần này quyết định app hữu ích hay bị bỏ

1. **Màn hình chính chỉ hiện việc của HÔM NAY.** Cả kế hoạch dài 12 mục nhưng người dùng mở app ra chỉ được thấy đúng việc tiếp theo cần làm. Mọi thứ khác nằm sau một cú click.

2. **Không bao giờ để người dùng phải nhập lại thứ app tự suy ra được.** Lịch hôm nay tự sinh từ thứ trong tuần. Ngày ôn tập tự tính. Streak tự cập nhật.

3. **App không được trách móc.** Không dùng màu đỏ, dấu chấm than, hay chữ "Bạn đã thất bại" cho ngày học ít. Ngày Tối thiểu hiển thị là **thành công màu xanh**, không phải màu vàng cảnh báo. Đây là yêu cầu sản phẩm, không phải thẩm mỹ — app trách móc sẽ bị đóng và không mở lại.

4. **Mọi hành động phải hoàn tác được.** Tick nhầm task, bốc nhầm thưởng → undo được. Không có dialog "Bạn có chắc không?" cho hành động thường ngày.

5. **Không mất dữ liệu.** Có nút Export/Import JSON. Tự động nhắc backup mỗi 30 ngày.

---

## 2. CÁC MÀN HÌNH

```
/               → Hôm nay (mặc định)
/tuan           → Lịch tuần
/on-tap         → Hàng đợi ôn tập (SRS)
/so-loi         → Sổ lỗi TOEIC
/thong-ke       → Biểu đồ thống kê
/ra-soat        → Rà soát chủ nhật
/cai-dat        → Cài đặt + hộp thưởng + export/import
```

Layout: sidebar trái cố định (desktop), thu thành bottom nav trên mobile.

---

## 3. MÔ HÌNH DỮ LIỆU

### 3.1 Lớp lưu trữ — BẮT BUỘC làm đúng cách này

Không được gọi `localStorage` rải rác khắp components. Tạo đúng một module:

```ts
// src/storage/repository.ts

export interface Repository {
  get<T>(key: StorageKey): Promise<T | null>;
  set<T>(key: StorageKey, value: T): Promise<void>;
  remove(key: StorageKey): Promise<void>;
  exportAll(): Promise<string>;        // JSON string
  importAll(json: string): Promise<void>;
}

export class LocalStorageRepository implements Repository { /* ... */ }
```

Mọi hàm đều `async` **kể cả khi localStorage là đồng bộ**. Lý do: sau này thay bằng backend thì không phải sửa một dòng nào ở tầng UI.

Prefix mọi key bằng `study_app:` và lưu kèm `schemaVersion` để sau này migrate được.

### 3.2 Các kiểu dữ liệu

```ts
type Subject = 'programming' | 'japanese' | 'toeic';

type BlockKind =
  | 'class'        // học ở trung tâm — không tick được, chỉ đánh dấu có đi hay không
  | 'deep'         // Pomodoro 50/10
  | 'light'        // Pomodoro 25/5
  | 'srs'          // phiên ôn tập
  | 'review'       // active recall sau lớp
  | 'rest';        // nghỉ — hiện mờ, không tính giờ

// Một block trong template lịch tuần (dữ liệu tĩnh, người dùng sửa được trong Cài đặt)
interface ScheduleBlock {
  id: string;
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;   // 0 = Chủ nhật
  startTime: string;      // "07:00"
  endTime: string;        // "09:00"
  subject: Subject | null; // null cho block nghỉ
  kind: BlockKind;
  title: string;          // "TOEIC Reading — Part 5/6/7"
  pomodoroCount: number;  // số pomodoro dự kiến, 0 nếu không áp dụng
}

// Bản ghi thực tế của một ngày
interface DayLog {
  date: string;              // "2026-07-18" (ISO, theo giờ VN)
  completedBlockIds: string[];
  minutesBySubject: Record<Subject, number>;
  pomodorosCompleted: number;
  tier: 'gold' | 'silver' | 'minimum' | 'broken' | 'frozen' | 'pending';
  note?: string;
}

interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastCountedDate: string | null;
  freezeTokensRemaining: number;    // reset về 2 mỗi đầu tháng
  freezeTokensMonth: string;        // "2026-07" — để biết khi nào cần reset
}

// Hộp phần thưởng
type RewardType = 'reward' | 'neutral' | 'penalty';
type RewardBox  = 'small' | 'big';

interface RewardSlip {
  id: string;
  box: RewardBox;
  type: RewardType;
  text: string;          // "1 ly trà sữa full topping"
  enabled: boolean;
}

interface RewardDraw {
  id: string;
  slipId: string;
  slipTextSnapshot: string;   // lưu bản sao phòng khi slip bị xoá sau này
  box: RewardBox;
  type: RewardType;
  drawnAt: string;            // ISO datetime
  claimed: boolean;           // đã thực hiện/nhận thưởng chưa
}

// Spaced repetition
interface ReviewItem {
  id: string;
  subject: Subject;
  title: string;              // "Kanji bài 12" / "React useEffect" / "Part 5 — mệnh đề quan hệ"
  learnedOn: string;          // "2026-07-18"
  intervalIndex: number;      // trỏ vào INTERVALS
  nextReviewDate: string;
  history: { date: string; result: 'good' | 'hard' | 'again' }[];
  archived: boolean;
}

// Sổ lỗi TOEIC
interface ErrorEntry {
  id: string;
  part: 1|2|3|4|5|6|7;
  questionText: string;
  myAnswer: string;
  correctAnswer: string;
  reason: string;             // "không biết từ" / "bẫy ngữ pháp" / "nghe không kịp"
  createdOn: string;
  nextReviewDate: string;
  intervalIndex: number;      // dùng chung INTERVALS nhưng chỉ lấy [0], [2], [4]
  resolved: boolean;          // đã ôn 3 lần đúng → true
}

interface WeeklyReview {
  weekStartDate: string;      // thứ Hai của tuần đó
  skippedBlocks: string;
  avoidedSubject: string;
  rewardBoxStillFun: boolean;
  nightsSlept7h: number;      // 0-7
  createdAt: string;
}
```

---

## 4. LOGIC NGHIỆP VỤ — phần khó, làm chính xác

### 4.1 Ranh giới ngày — KHÔNG dùng nửa đêm

Người dùng học đến 22–23h và đôi khi muộn hơn. Nếu ngày reset lúc 00:00 thì việc tick task lúc 00:15 sẽ tính sang ngày hôm sau và **làm đứt chuỗi oan**.

> **Ngày logic bắt đầu lúc 04:00 giờ Việt Nam.**

```ts
function getLogicalDate(now: Date = new Date()): string {
  const vn = toZonedTime(now, 'Asia/Ho_Chi_Minh');
  const shifted = subHours(vn, 4);
  return format(shifted, 'yyyy-MM-dd');
}
```

Dùng hàm này **ở mọi nơi**. Không được gọi `new Date().toISOString().slice(0,10)` ở bất kỳ đâu trong codebase.

### 4.2 Tính hạng ngày (tier)

Chạy khi: người dùng tick/bỏ tick block, và khi app khởi động.

```
totalPlannedMinutes  = tổng phút của mọi block hôm nay có kind ≠ 'rest'
totalCompletedMinutes = tổng phút của các block đã tick
completionRate = totalCompletedMinutes / totalPlannedMinutes

minutesPerSubject[s] = tổng phút đã tick của môn s

tier =
  nếu đã dùng freeze token cho ngày này        → 'frozen'
  ngược lại nếu completionRate >= 0.90         → 'gold'
  ngược lại nếu completionRate >= 0.60         → 'silver'
  ngược lại nếu (mọi môn trong 3 môn đều có minutesPerSubject >= 30)
                                                → 'minimum'
  ngược lại nếu ngày chưa kết thúc (hôm nay)   → 'pending'
  ngược lại                                     → 'broken'
```

**Chú ý bẫy:** ngày hôm nay chưa xong thì tier là `'pending'`, **không phải** `'broken'`. Chỉ chốt `'broken'` khi ngày đó đã trôi qua (logical date < hôm nay). Hiển thị `'pending'` bằng màu xám trung tính, tuyệt đối không màu đỏ.

**Chú ý bẫy 2:** điều kiện `'minimum'` là **≥30 phút MỖI môn trong cả 3 môn**, không phải tổng 90 phút. Học 90 phút toàn TOEIC không đạt Ngày Tối thiểu.

**Chú ý bẫy 3:** Chủ nhật có tổng thời lượng nhỏ hơn hẳn (~5h). `completionRate` là tỉ lệ nên vẫn đúng — không được hardcode ngưỡng theo số phút tuyệt đối.

### 4.3 Cập nhật chuỗi

```
Chuỗi +1 nếu tier ∈ {gold, silver, minimum}
Chuỗi giữ nguyên nếu tier = frozen
Chuỗi về 0 nếu tier = broken
```

Khi app khởi động, phải **truy hồi mọi ngày còn dở** giữa `lastCountedDate` và hôm nay:

```ts
function reconcileStreak(state, dayLogs) {
  // Với mỗi ngày từ lastCountedDate+1 đến hôm qua:
  //   - nếu không có DayLog  → tier = 'broken' → streak = 0
  //   - nếu có               → áp dụng bảng trên
  // KHÔNG xử lý ngày hôm nay ở đây — hôm nay còn đang diễn ra
}
```

Đây là chỗ dễ sai nhất. **Bắt buộc viết unit test** cho các trường hợp: nghỉ 1 ngày, nghỉ 5 ngày, dùng freeze, dùng freeze rồi lại nghỉ tiếp, mở app sau 2 tháng không dùng.

**Freeze token:** 2 cái mỗi tháng, reset khi tháng thay đổi, **không cộng dồn**. Chỉ dùng được cho ngày trong quá khứ ≤7 ngày, và ngày đó phải đang ở tier `broken`.

**Mốc thưởng chuỗi:** khi `currentStreak` chạm 7, 14, 30, 60, 100 → tự động cấp 1 lượt bốc **hộp lớn** (2 lượt ở mốc 14). Hiện confetti animation.

### 4.4 Spaced repetition

```ts
const INTERVALS = [1, 3, 7, 16, 35]; // ngày
```

Khi người dùng ôn xong một `ReviewItem`, họ chọn 1 trong 3:

| Nút | Xử lý |
|---|---|
| **Nhớ rõ** (good) | `intervalIndex += 1`; nếu vượt cuối mảng → `archived = true` |
| **Hơi quên** (hard) | `intervalIndex` giữ nguyên → ôn lại sau đúng khoảng đó |
| **Quên hẳn** (again) | `intervalIndex = 0` → ôn lại sau 1 ngày |

```
nextReviewDate = logicalDate hôm nay + INTERVALS[intervalIndex] ngày
```

**Thẻ quá hạn:** nếu `nextReviewDate < hôm nay` thì vẫn hiện trong hàng đợi, nhóm riêng "Quá hạn", sắp xếp cũ nhất lên trước. **Không phạt, không đổi màu đỏ.**

**Giới hạn chống ngợp:** nếu hàng đợi hôm nay >40 item, chỉ hiện 40 item ưu tiên cao nhất (quá hạn lâu nhất trước) kèm dòng chữ: *"Còn N item nữa — làm hết 40 cái này đã, phần còn lại tự dời sang mai."* Không hiện con số 200 vào mặt người dùng, đó là cách khiến người ta bỏ Anki.

### 4.5 Sổ lỗi TOEIC

Dùng lịch cố định `[1, 7, 30]` ngày. Sau 3 lần ôn liên tiếp mà người dùng bấm "Đã nhớ" → `resolved = true`, ẩn khỏi hàng đợi nhưng vẫn tra cứu được.

Có bộ lọc theo `part` và theo `reason`, và một biểu đồ nhỏ: **"Bạn sai nhiều nhất ở Part mấy / vì lý do gì"** — đây là thông tin có giá trị nhất trong cả trang này, đặt nổi bật lên đầu.

### 4.6 Hộp phần thưởng — logic ngẫu nhiên

**Điều kiện được bốc hộp nhỏ:** hoàn thành một block có `kind ∈ {deep, light}`. Mỗi block chỉ cho đúng 1 lượt bốc. Bỏ tick block → thu hồi lượt bốc chưa dùng.

**Điều kiện được bốc hộp lớn:** đạt Ngày Vàng · hoàn thành block mock test T7 · chạm mốc chuỗi.

**Thuật toán bốc:**

```ts
function drawSlip(box: RewardBox, slips: RewardSlip[]): RewardSlip {
  const pool = slips.filter(s => s.box === box && s.enabled);
  // Bốc ĐỀU trên toàn bộ pool. Không cân bằng theo type ở bước bốc.
  return pool[Math.floor(Math.random() * pool.length)];
}
```

Tỉ lệ 70/20/10 được đảm bảo bằng **thành phần của pool** (số lượng giấy mỗi loại), không phải bằng logic bốc. Điều này giữ cho tính ngẫu nhiên thật sự — nếu code "ép" tỉ lệ theo phiên thì người dùng sẽ đoán được và mất hết cảm giác hồi hộp.

> **KHÔNG được cài bất kỳ cơ chế pity/streak-protection nào vào việc bốc.** Không "đã 3 lần liên tiếp trúng phạt nên lần này chắc chắn trúng thưởng". Tính bất định là toàn bộ giá trị của cơ chế này.

**Cảnh báo tỉ lệ trong trang Cài đặt:** khi người dùng sửa danh sách giấy, hiện thanh tỉ lệ trực quan. Nếu `penalty > 15%` thì hiện gợi ý (không chặn): *"Tỉ lệ phạt cao có thể khiến bạn né việc bốc hộp — cân nhắc giữ dưới 15%."*

**Animation bốc:** phải có. Nút bốc → hiệu ứng xáo giấy 1.2 giây → lật mở kết quả. Cảm giác chờ đợi chính là phần thưởng. Không được hiện kết quả ngay lập tức.

**Hộp lớn phải cảm giác khác hộp nhỏ:** animation dài hơn, có âm thanh (tuỳ chọn tắt được), confetti.

### 4.7 Pomodoro

Đếm ngược, hai chế độ theo `BlockKind`:
- `deep` → 50 phút làm / 10 phút nghỉ
- `light` → 25 phút làm / 5 phút nghỉ

Sau 4 chu kỳ liên tiếp → gợi ý nghỉ dài 30 phút.

**Yêu cầu kỹ thuật quan trọng:** không dùng `setInterval` để đếm. Tab chạy nền sẽ bị throttle và đồng hồ chạy sai. Lưu `endTimestamp` rồi tính chênh lệch mỗi lần tick:

```ts
const remaining = Math.max(0, endTimestamp - Date.now());
```

Đồng hồ phải sống sót qua reload trang — lưu trạng thái timer vào storage.

Khi hết giờ: âm thanh + `Notification` API (xin quyền lần đầu) + đổi title tab thành `⏰ Hết giờ!`.

**Màn hình nghỉ giải lao:** hiện dòng chữ lớn *"Đứng dậy. Uống nước. Nhìn ra xa. Đừng mở điện thoại."* — đây là nội dung có chủ đích, giữ nguyên.

### 4.8 Lừa não khởi động (Two-Minute Rule)

Mỗi block chưa bắt đầu có nút phụ **"Chỉ làm 1 chút thôi"**. Bấm vào:
- Hiện câu tương ứng theo môn (bảng ở §5, seed data)
- Chạy timer 2 phút
- Hết 2 phút hiện đúng hai lựa chọn, **cân bằng nhau về mặt thị giác**:
  - `[ Học tiếp ]`  → chuyển sang Pomodoro đầy đủ
  - `[ Dừng ở đây ]` → đóng, **không phạt, không hỏi lại, không mặt buồn**

Nút "Dừng ở đây" phải thật sự dừng được. Nếu app gây áp lực ở bước này thì lần sau mẹo tâm lý này mất tác dụng — người dùng biết mình đang tự lừa nên phải giữ lời hứa.

---

## 5. SEED DATA — nạp sẵn khi mở app lần đầu

### 5.1 Lịch tuần

**Cố định ở trung tâm (kind: `class`):**

| Thứ | Giờ | Môn | Tiêu đề |
|---|---|---|---|
| 2, 4, 6 | 18:30–21:30 | programming | 🏫 Lớp lập trình |
| 3 | 19:00–21:30 | japanese | 🏫 Lớp tiếng Nhật |
| CN | 08:00–10:30 | japanese | 🏫 Lớp tiếng Nhật |

**Thứ 2 / 4 / 6:**

| Giờ | Môn | Kind | Tiêu đề | Pomo |
|---|---|---|---|---|
| 06:30–07:00 | — | srs | Anki sáng (Nhật + TOEIC) | 1 |
| 07:00–09:00 | toeic | deep | TOEIC Reading — Part 5/6/7 | 2 |
| 09:15–11:15 | japanese | deep | Tiếng Nhật — ngữ pháp + Kanji mới | 2 |
| 11:15–13:30 | — | rest | Ăn trưa + ngủ trưa 20 phút | 0 |
| 13:30–15:30 | programming | deep | Lập trình — code project | 2 |
| 15:45–17:00 | toeic | light | TOEIC Listening — Part 1–4 | 3 |
| 17:00–18:15 | — | rest | Nghỉ, ăn, di chuyển | 0 |
| 18:30–21:30 | programming | class | 🏫 Lớp lập trình | 0 |
| 21:45–22:15 | programming | review | Active recall — viết lại 5 ý chính buổi học | 1 |

**Thứ 3:**

Giống trên, khác ở:

| Giờ | Môn | Kind | Tiêu đề | Pomo |
|---|---|---|---|---|
| 13:30–15:30 | programming | deep | Lập trình — code project | 2 |
| 15:45–17:00 | toeic | light | TOEIC Reading | 3 |
| 19:00–21:30 | japanese | class | 🏫 Lớp tiếng Nhật | 0 |
| 21:45–22:15 | japanese | review | Viết lại mẫu câu + kanji buổi học từ trí nhớ | 1 |

**Thứ 5 (không lớp):**

| Giờ | Môn | Kind | Tiêu đề | Pomo |
|---|---|---|---|---|
| 06:30–07:00 | — | srs | Anki sáng | 1 |
| 07:00–09:00 | toeic | deep | TOEIC Reading | 2 |
| 09:15–11:15 | programming | deep | Lập trình — tính năng khó nhất tuần | 2 |
| 11:15–13:30 | — | rest | Nghỉ trưa | 0 |
| 13:30–15:30 | japanese | deep | Tiếng Nhật — nghe + shadowing + ngữ pháp | 2 |
| 15:45–17:15 | programming | deep | Lập trình — debug / đọc code người khác | 1 |
| 17:15–19:00 | — | rest | Nghỉ tối | 0 |
| 19:00–21:00 | toeic | light | TOEIC Listening + từ vựng | 4 |
| 21:15–21:45 | — | srs | Anki tối | 1 |

**Thứ 7 — NGÀY BOSS FIGHT:**

| Giờ | Môn | Kind | Tiêu đề | Pomo |
|---|---|---|---|---|
| 07:30–09:30 | toeic | deep | ⚔️ Full TOEIC mock test (bấm giờ thật) | 0 |
| 09:45–11:15 | toeic | light | Chữa đề — ghi mọi câu sai vào Sổ Lỗi | 3 |
| 11:15–13:30 | — | rest | Nghỉ trưa | 0 |
| 13:30–16:00 | programming | deep | ⚔️ Build ngày — ghép bài cả tuần thành sản phẩm chạy được | 2 |
| 16:15–17:30 | japanese | light | Mini test tự chấm (kanji + ngữ pháp tuần) | 3 |
| 17:30–19:00 | — | rest | Nghỉ tối | 0 |
| 19:00–20:30 | — | srs | Ôn Sổ Lỗi tuần trước + tuần này | 3 |
| 20:30–21:00 | — | review | 🎁 Bốc hộp lớn + tổng kết tuần | 0 |

Block `⚔️ Full TOEIC mock test` phải có cờ đặc biệt → hoàn thành nó cấp 1 lượt bốc hộp lớn.

**Chủ nhật — NGÀY NHẸ:**

| Giờ | Môn | Kind | Tiêu đề | Pomo |
|---|---|---|---|---|
| 08:00–10:30 | japanese | class | 🏫 Lớp tiếng Nhật | 0 |
| 11:00–11:30 | japanese | review | Viết lại bài lớp từ trí nhớ | 1 |
| 14:00–15:30 | — | srs | Ôn tổng SRS — dọn hết thẻ tồn, ôn code cũ | 3 |
| 15:30–16:30 | — | review | Rà soát tuần + nạp giấy mới vào hộp thưởng | 0 |
| 16:30–23:00 | — | rest | 🌴 NGHỈ THẬT. Không học. | 0 |

> Block `🌴 NGHỈ THẬT` hiển thị như một **thành tựu**, có thể tick được và khi tick thì khen. Nghỉ là một phần của kế hoạch chứ không phải sự vắng mặt của kế hoạch.

### 5.2 Giấy hộp nhỏ (~30 tờ, tỉ lệ 70/20/10)

**reward (21 tờ):** Nghe 2 bài nhạc yêu thích · 1 que kem · 1 gói snack · Lướt điện thoại tự do 10 phút · Xem 1 video YouTube bất kỳ · Nằm dài 15 phút không làm gì · Nhắn tin tán gẫu với bạn 10 phút · 1 ly cà phê · Xem 1 clip hài · Ra ngoài đi bộ 15 phút · Chơi game 15 phút · Ăn 1 món vặt tuỳ chọn · Nghe 1 podcast 15 phút · Vẽ nguệch ngoạc 10 phút · Gọi điện cho người thân · Tắm nước nóng thư giãn · Đọc 10 trang truyện · Ngủ trưa thêm 15 phút · Xem 1 video về chủ đề mình thích · Uống 1 ly nước ép · Nghỉ dài 20 phút thay vì 10

**neutral (6 tờ):** Không có gì. Vào việc tiếp. · Để dành — block sau bốc 2 tờ · Bốc lại ngay · Tự chọn phần thưởng nhỏ bất kỳ · Uống 1 cốc nước lọc · Hôm nay may mắn để dành cho lần sau

**penalty (3 tờ):** 💪 Hít đất 10 cái · 💪 Plank 45 giây · 💪 Squat 20 cái

> Giấy `Bốc lại ngay` và `Để dành — block sau bốc 2 tờ` cần logic riêng, không chỉ là text.

### 5.3 Giấy hộp lớn (~15 tờ)

**reward (11 tờ):** 1 ly trà sữa full topping · 1 bữa ăn ngoài tự chọn · Xem 1 tập phim · Xem 1 bộ phim · Chơi game 1 tiếng · Mua 1 món dưới 200k · Ngủ nướng thêm 1 tiếng sáng mai · Đi cà phê với bạn · Một buổi tối hoàn toàn tự do · Mua 1 món đồ ăn yêu thích · Đi chơi nửa ngày cuối tuần

**neutral (3 tờ):** Tự chọn phần thưởng bất kỳ · Để dành cộng dồn vào lần bốc hộp lớn sau · Bốc thêm 1 tờ hộp nhỏ

**penalty (1 tờ):** 💪 Chạy bộ 20 phút

> **Ràng buộc cứng:** app phải chặn người dùng thêm giấy có nội dung nghỉ nguyên ngày hoặc bỏ buổi học trung tâm? — Không, không chặn (không thể phát hiện bằng text matching một cách đáng tin cậy). Thay vào đó, hiện ghi chú cố định ở trang Cài đặt: *"Đừng bỏ vào hộp: nghỉ nguyên 1 ngày · bỏ buổi trung tâm · phần thưởng trên 500k."*

### 5.4 Câu "lừa não" theo môn

```ts
const TWO_MINUTE_PROMPTS: Record<Subject, string[]> = {
  programming: ['Chỉ mở editor và gõ 1 dòng thôi.', 'Chỉ đọc lại code hôm qua thôi.'],
  japanese:    ['Chỉ viết 1 chữ kanji.', 'Chỉ lật 3 thẻ Anki.'],
  toeic:       ['Chỉ đọc đúng 1 câu Part 5.', 'Chỉ nghe 1 file audio 30 giây.'],
};
```

---

## 6. CHI TIẾT TỪNG MÀN HÌNH

### 6.1 `/` — HÔM NAY (màn hình quan trọng nhất)

Từ trên xuống:

**a. Thanh trạng thái** — một dòng, gọn
`🔥 12 ngày · 🥇 Ngày Vàng · 6h20/11h · ❄️ 2 thẻ freeze`

**b. Thẻ "Việc tiếp theo"** — nổi bật nhất trang, chiếm nhiều diện tích
- Tên block, khung giờ, môn (có màu riêng)
- Nút chính lớn: **[ Bắt đầu Pomodoro ]**
- Nút phụ nhỏ hơn: **[ Chỉ làm 1 chút thôi ]**
- Nếu đang trong giờ block đó → hiện badge "Đang tới giờ"
- Nếu đã trễ giờ → **không trách móc**, chỉ ghi "Bắt đầu bây giờ cũng được"

**c. Timeline hôm nay** — danh sách dọc tất cả block
- Checkbox tick hoàn thành
- Block `rest` hiển thị mờ, không tick, không tính vào tỉ lệ
- Block `class` có icon 🏫, tick = "đã đi học"
- Block đã qua giờ mà chưa tick → màu xám nhạt, **không đỏ**
- Tick xong block `deep`/`light` → **hiện ngay nút 🎁 Bốc hộp nhỏ**

**d. Hộp SRS đến hạn** — thẻ nhỏ
`📚 Hôm nay có 14 item cần ôn → [Ôn ngay]`

**e. Thanh tiến độ 3 môn** — 3 thanh ngang, mỗi thanh có vạch đánh dấu mốc 30 phút (ngưỡng Ngày Tối thiểu). Đây là thứ giúp người dùng biết cần học gì để cứu chuỗi khi mệt.

### 6.2 `/tuan` — LỊCH TUẦN

Lưới 7 cột × các khung giờ. Ô màu theo môn. Ngày hôm nay có viền nổi bật.
Bên dưới: dải 7 ô vuông thể hiện tier từng ngày trong tuần.
Cho phép click vào một ngày quá khứ để xem/sửa `DayLog` (và dùng freeze token).

### 6.3 `/on-tap` — HÀNG ĐỢI ÔN TẬP

- Nút **[+ Thêm bài đã học]** — form: môn, tiêu đề, ngày học (mặc định hôm nay)
- Ba nhóm: **Quá hạn** / **Hôm nay** / **Sắp tới (7 ngày)**
- Chế độ ôn: hiện 1 item toàn màn hình, 3 nút `Nhớ rõ` / `Hơi quên` / `Quên hẳn`
- Với môn `programming`, item hiện kèm nhắc: *"Mở file trống. Viết lại không nhìn tài liệu."*
- Sau khi ôn xong hết → màn hình chúc mừng + cấp 1 lượt bốc hộp nhỏ

### 6.4 `/so-loi` — SỔ LỖI TOEIC

- Đầu trang: **biểu đồ Part sai nhiều nhất** + **biểu đồ lý do sai** (bar chart)
- Nút **[+ Thêm câu sai]** — form theo `ErrorEntry`
- Danh sách, lọc theo part / reason / đã resolved
- Mục "Đến hạn ôn hôm nay" nằm trên cùng

### 6.5 `/thong-ke`

- **Lịch chuỗi dạng ô vuông kiểu GitHub** — 1 năm, màu theo tier (vàng / bạc / xanh / xám-freeze / trống). Đây là hình ảnh tạo cảm giác "không muốn làm đứt", đặt ở vị trí đầu tiên.
- Biểu đồ cột: giờ học theo môn, theo tuần
- Biểu đồ đường: tổng giờ/ngày trong 30 ngày qua
- Số liệu tổng: tổng giờ mỗi môn từ đầu · chuỗi dài nhất · số Ngày Vàng · tổng pomodoro
- Lịch sử bốc thưởng: thống kê đã trúng gì bao nhiêu lần

### 6.6 `/ra-soat` — RÀ SOÁT CHỦ NHẬT

Tự động nhắc vào CN. Form 4 câu (§12 của kế hoạch gốc), kèm số liệu tuần vừa rồi hiển thị sẵn bên cạnh để trả lời có căn cứ. Lưu lại và xem được các bản rà soát cũ.

### 6.7 `/cai-dat`

- Sửa lịch tuần (thêm/xoá/sửa block)
- Quản lý giấy hộp thưởng + thanh hiển thị tỉ lệ 70/20/10
- Bật/tắt âm thanh, thông báo
- **Export JSON / Import JSON**
- Xoá toàn bộ dữ liệu (có xác nhận gõ chữ)

---

## 7. THỨ TỰ XÂY DỰNG

Làm theo đúng thứ tự này. Mỗi giai đoạn phải chạy được mới sang giai đoạn sau.

| GĐ | Nội dung | Kết quả phải đạt |
|---|---|---|
| **1** | Setup dự án, `Repository`, types, seed data, `getLogicalDate` | Mở app thấy dữ liệu seed trong console |
| **2** | Màn hình Hôm nay + timeline + tick block + tính tier | Tick được task, thấy tier đổi |
| **3** | Streak + reconcile + freeze token + **unit test** | Test pass hết các case ở §4.3 |
| **4** | Pomodoro (bền với reload + tab nền) + màn hình nghỉ | Đóng tab mở lại, timer vẫn đúng |
| **5** | Hộp phần thưởng + animation bốc | Bốc được, có cảm giác hồi hộp |
| **6** | SRS + trang ôn tập | Thêm bài → đúng ngày nó hiện lên |
| **7** | Sổ lỗi TOEIC | Nhập câu sai, biểu đồ chạy |
| **8** | Thống kê + lịch ô vuông | Nhìn phát thấy được cả năm |
| **9** | Lịch tuần + rà soát CN + cài đặt + export/import | Đủ tính năng |
| **10** | Đánh bóng: animation, âm thanh, responsive, empty state | Dùng thấy sướng |

> Nếu hết thời gian, **giai đoạn 1–5 là bản dùng được**. 6–10 thêm dần cũng không sao.

---

## 8. TIÊU CHÍ NGHIỆM THU

Bản build được coi là xong khi vượt qua hết:

- [ ] Tick task lúc 00:30 → vẫn tính vào ngày hôm trước
- [ ] Học 90 phút toàn TOEIC → **không** đạt Ngày Tối thiểu
- [ ] Học 30 phút mỗi môn × 3 môn → đạt Ngày Tối thiểu, chuỗi +1
- [ ] Không mở app 3 ngày rồi mở lại → chuỗi về 0, không crash, không mất dữ liệu cũ
- [ ] Dùng freeze cho 1 ngày bị đứt → chuỗi được nối lại đúng
- [ ] Đầu tháng mới → freeze token về 2, không cộng dồn
- [ ] Pomodoro chạy khi tab ở nền 50 phút → sai số dưới 2 giây
- [ ] Reload giữa lúc Pomodoro chạy → timer tiếp tục đúng
- [ ] Bốc 100 lần → tỉ lệ xấp xỉ đúng thành phần pool (không có pity system)
- [ ] Item SRS bấm "Quên hẳn" → xuất hiện lại đúng ngày mai
- [ ] Hàng đợi 200 item → chỉ hiện 40, không hiện số 200 ở vị trí gây áp lực
- [ ] Export JSON → xoá hết dữ liệu → Import lại → khôi phục nguyên vẹn
- [ ] Không có màu đỏ hay chữ tiêu cực ở bất kỳ đâu cho việc học ít
- [ ] Nút "Dừng ở đây" sau 2 phút → dừng thật, không hỏi lại
- [ ] Toàn bộ codebase không có chỗ nào gọi `localStorage` trực tiếp ngoài `repository.ts`
- [ ] Toàn bộ codebase không có chỗ nào tính ngày mà không qua `getLogicalDate()`

---

## 9. GHI CHÚ CHO NGƯỜI VIẾT CODE

**Chủ sở hữu app đang học lập trình và sẽ tự đọc, tự sửa code này.** Vì vậy:

- Ưu tiên rõ ràng hơn ngắn gọn. Không dùng mẹo cú pháp thông minh.
- Tách logic nghiệp vụ (streak, SRS, tier) ra file riêng thuần hàm, không dính React. Dễ test, dễ đọc, dễ sửa.
- Comment tiếng Việt ở các hàm ở §4 — giải thích **tại sao**, không phải **làm gì**.
- Viết `README.md` giải thích cấu trúc thư mục và cách chạy.
- Trong code, để lại `// TODO:` ở những chỗ hợp lý để chủ sở hữu tự làm sau (ví dụ: thêm backend, thêm biểu đồ mới).

**Deploy:** build tĩnh, đẩy lên Vercel/Netlify/GitHub Pages đều được. Không cần biến môi trường.
