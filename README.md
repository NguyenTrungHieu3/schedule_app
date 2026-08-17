# 🔥 Chăm — học đều mỗi ngày

App cá nhân (single user, đăng nhập bằng magic link email) hỗ trợ học đồng thời
**Lập trình / Tiếng Nhật / TOEIC** với 5 cơ chế: lịch cố định theo thứ, spaced
repetition, Pomodoro, hộp phần thưởng ngẫu nhiên, và chuỗi 3 mức. Dữ liệu lưu
trên Supabase (cloud-only) để đồng bộ giữa nhiều máy; cài được như app điện
thoại (PWA).

Ngoài phần "kế hoạch học" gốc, app đang mở rộng thành một **nền tảng học**
tiếng Nhật/Anh (flashcard/SRS, quiz, đọc, nói, gia sư AI...) — xem mục
[Học — flashcard/SRS](#học--flashcardsrs) và
[docs/hoc-tap/](./docs/hoc-tap/) để biết lộ trình đầy đủ.

> 📖 **Muốn biết cách dùng app?** Đọc [HUONG-DAN-SU-DUNG.md](./HUONG-DAN-SU-DUNG.md).
> File README này dành cho người sửa code.

Spec đầy đủ: [spec-website-hoc-tap.md](./spec-website-hoc-tap.md)

## Chạy app

```bash
npm install
cp .env.example .env.local   # điền VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm run dev        # mở http://localhost:5173
npm test           # chạy unit test (streak / tier / SRS / bốc thưởng)
npm run build      # build tĩnh vào dist/ — deploy Vercel/Netlify/GitHub Pages đều được
```

Cần tạo project Supabase trước (xem [Đồng bộ dữ liệu (Supabase)](#đồng-bộ-dữ-liệu-supabase)).

## Cấu trúc thư mục

```
src/
├── main.tsx                    # khởi động: import động AuthGate/App, bắt lỗi startup
├── App.tsx                     # router 7 màn hình (HashRouter)
├── types.ts                    # toàn bộ kiểu dữ liệu (§3.2 spec)
│
├── storage/
│   ├── repository.ts           # Repository interface + LocalStorageRepository
│   │                           # (chỉ dùng cho timerState + migrate 1 lần, xem dưới)
│   ├── supabaseClient.ts       # createClient() — chỗ duy nhất gọi createClient
│   ├── supabaseRepository.ts   # REPOSITORY CHÍNH — implements Repository, lưu
│   │                           # vào bảng `kv` Supabase. Muốn đổi backend khác:
│   │                           # viết class mới implement Repository, export
│   │                           # lại `repository` từ đây.
│   └── init.ts                 # seed data lần đầu (gọi khi cloud rỗng, xem AuthGate)
│
├── logic/              # LOGIC NGHIỆP VỤ — hàm thuần, không dính React, có test
│   ├── date.ts         # getLogicalDate() 04:00 VN + blockDurationMinutes/timeRangesOverlap (§4.1)
│   ├── tier.ts         # tính hạng ngày gold/silver/minimum… (§4.2)
│   ├── streak.ts       # chuỗi + reconcile + freeze token (§4.3)
│   ├── srs.ts          # spaced repetition [1,3,7,16,35] (§4.4)
│   ├── errorLog.ts     # sổ lỗi TOEIC [1,7,30] (§4.5)
│   ├── reward.ts       # bốc thưởng + quản lý lượt bốc (§4.6)
│   └── *.test.ts       # unit test — chạy bằng `npm test`
│
├── store/
│   ├── appStore.ts       # Zustand store trung tâm (Chăm) — mọi ghi dữ liệu đi qua đây
│   ├── timerStore.ts     # Pomodoro (endTimestamp, LUÔN local — xem TRANSIENT_KEYS)
│   ├── clockStore.ts     # đồng hồ ngày logic — app tự sang ngày mới lúc 04:00
│   └── learningStore.ts  # store cho khu "Học" (flashcard/SRS) — xem mục Học bên dưới
│
├── data/
│   ├── seed.ts            # lịch tuần mặc định + 45 tờ giấy thưởng + câu lừa não (§5)
│   ├── learningTypes.ts   # kiểu dữ liệu bảng quan hệ (vocab/kanji/sentences/decks)
│   └── learningClient.ts  # truy vấn Supabase cho khu "Học" (tách khỏi kv)
│
├── components/         # AuthGate (đăng nhập magic link), ErrorBoundary, Layout,
│                       # TimerOverlay, RewardModal, Confetti
├── pages/              # 7 màn Chăm (Today/Week/Review/ErrorLog/Stats/Sunday/Settings)
│                       # + Học (HocPage, FlashcardReviewPage)
└── ui/labels.ts        # nhãn + màu môn/tier dùng chung
```

## Những quy tắc PHẢI giữ khi sửa code

1. **Không gọi `localStorage`/Supabase trực tiếp ngoài `storage/`.** Mọi đọc/ghi
   đi qua `repository` (từ `supabaseRepository.ts`) hoặc store.
2. **Không tự tính "hôm nay".** Luôn dùng `getLogicalDate()` — ngày logic bắt
   đầu lúc 04:00 giờ VN, để học khuya sau nửa đêm không bị đứt chuỗi oan.
3. **Không thêm pity system vào bốc thưởng.** Tỉ lệ nằm ở thành phần pool,
   logic bốc phải đều tuyệt đối (xem `logic/reward.ts`).
4. **Không dùng màu đỏ / chữ trách móc** cho ngày học ít — đây là yêu cầu sản
   phẩm (§1.3).
5. **Đếm giờ bằng `endTimestamp`**, không cộng dồn bằng `setInterval` — tab
   nền bị throttle sẽ làm sai đồng hồ.
6. Sửa logic streak/tier/SRS thì chạy `npm test` trước khi tin là đúng.

## Hệ thống design

- **Font:** Nunito Variable (self-host qua `@fontsource-variable/nunito`) — hỗ trợ tiếng Việt đầy đủ.
- **Icon:** Phosphor (`@phosphor-icons/react`) — active dùng weight `fill`, thường dùng `regular`.
- **Màu:** token trong `src/index.css` `@theme`. Thang `slate` được ĐÈ bằng xám ngả tím —
  đổi tông cả app chỉ cần sửa ở đó. Accent duy nhất: `--color-primary` (tím). Nền trang: `--color-surface` (tím nhạt).
- **Nút 3D:** class `.btn-3d` + đặt màu mép qua `[--edge:#...]`. Thẻ nội dung: class `.card`.

## Dữ liệu

- Lưu trên Supabase (bảng `kv`, key-value theo `user_id`), có `schemaVersion` để
  migrate sau này. Ngoại lệ: `timerState` (Pomodoro đang chạy) luôn ở
  `localStorage` của máy — không đồng bộ, xem `TRANSIENT_KEYS` trong `repository.ts`.
- Export/Import JSON trong trang **Cài đặt** — nên backup mỗi 30 ngày (app tự nhắc).
- Xoá toàn bộ dữ liệu: Cài đặt → gõ `XOA HET`.

## Đồng bộ dữ liệu (Supabase)

1. Tạo project tại [supabase.com](https://supabase.com).
2. SQL Editor → chạy [`supabase/migrations/0001_kv.sql`](./supabase/migrations/0001_kv.sql)
   (tạo bảng `kv` + bật Row Level Security — bắt buộc vì anon key nằm công khai
   trong frontend).
3. Project Settings → API → copy **Project URL** + **anon public key** vào `.env.local`
   (xem `.env.example`) để chạy local trước.
4. Authentication → URL Configuration → thêm `http://localhost:5173` vào
   **Redirect URLs** ngay (domain Vercel thêm sau, xem [Deploy lên Vercel](#deploy-lên-vercel)
   — không cần chờ deploy xong mới làm bước này).
5. Đăng nhập lần đầu bằng email bất kỳ → app tự seed dữ liệu mặc định vào cloud.

## Deploy lên Vercel

Thứ tự đúng (Vercel gán domain NGAY khi tạo project, không cần chờ build
thành công — nên không bị "con gà quả trứng" với bước Supabase):

1. Push code lên GitHub: `git remote add origin <url> && git push -u origin master`.
2. Vercel → **New Project** → import repo GitHub. Domain dạng
   `ten-project.vercel.app` xuất hiện ngay trên dashboard, kể cả khi build đầu
   tiên fail vì thiếu env var.
3. Copy domain đó → quay lại Supabase → Auth → URL Configuration → thêm
   `https://ten-project.vercel.app` vào **Redirect URLs** (giữ nguyên
   `http://localhost:5173` đã thêm ở bước trên).
   - Nếu Vercel tạo Preview deploy cho mỗi PR (domain có hậu tố ngẫu nhiên khác),
     thêm thêm dòng wildcard `https://ten-project-*.vercel.app/**` để magic link
     hoạt động cả trên preview.
4. Vercel → Project Settings → Environment Variables → thêm
   `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` → Redeploy.
5. Từ đây mỗi lần `git push` Vercel tự build + deploy lại (CI/CD mặc định, không
   cần cấu hình thêm).

## Cài như app điện thoại (PWA)

Build (`npm run build`) sinh service worker qua `vite-plugin-pwa` — mở app trên
điện thoại rồi "Thêm vào Màn hình chính" (Android: menu trình duyệt → Add to Home
Screen; iOS Safari: nút Share → Add to Home Screen). App cloud-only nên **vẫn
cần mạng** để thấy dữ liệu — service worker chỉ cache khung giao diện, không cache
dữ liệu học.

## Học — flashcard/SRS

Khu vực `/hoc` mở rộng Chăm thành nền tảng học tiếng Nhật (rồi tiếng Anh) —
xem kế hoạch đầy đủ (7 module, lộ trình M0–M6) trong lịch sử trò chuyện đã lưu
plan, hoặc tóm tắt dưới đây.

- **Dữ liệu:** bảng quan hệ riêng (`vocab`, `kanji`, `sentences`, `decks`,
  `deck_items`, `card_reviews`) trong CÙNG project Supabase với `kv` — xem
  [`supabase/migrations/0002_learning.sql`](./supabase/migrations/0002_learning.sql).
  Nội dung hệ thống (vocab/kanji/sentences/deck curated) đọc công khai cho mọi
  user đã đăng nhập; `card_reviews` (tiến độ SRS cá nhân) khoá theo `auth.uid()`
  giống `kv`.
- **SRS thẻ học:** `src/logic/cardReview.ts` — tái dùng `INTERVALS`/`QUEUE_DAILY_CAP`
  từ `logic/srs.ts` (Ôn tập của Chăm) làm nguồn chân lý duy nhất cho lịch ôn.
- **Tích hợp ngược vào Chăm:** ôn xong hết thẻ đến hạn trong ngày → tự tick
  block lịch tuần `kind: 'srs'` của hôm nay (nếu có đặt) + cấp 1 lượt bốc hộp
  nhỏ (`small:bonus:hoc:<date>`) — xem `creditChamOnSessionFinish()` trong
  `store/learningStore.ts`.
- **Nạp dữ liệu N5 mẫu:** `npm run seed:learning` (cần `SUPABASE_URL` +
  `SUPABASE_SERVICE_ROLE_KEY` — service role, KHÔNG phải anon key). Script tự
  bỏ qua nếu deck đã tồn tại (an toàn chạy lại). Mở rộng lên đầy đủ N5–N1 và
  giấy phép nội dung: xem [`docs/hoc-tap/nguon-du-lieu.md`](./docs/hoc-tap/nguon-du-lieu.md).
- **Thiết kế màn mới bằng Stitch:** prompt sẵn cho từng màn (M1–M6) trong
  [`docs/hoc-tap/stitch-prompts.md`](./docs/hoc-tap/stitch-prompts.md) — dán
  đúng bối cảnh design token để giao diện mới khớp phong cách Chăm.

## TODO gợi ý cho chủ app (tự làm dần)

- [ ] Migrate schema khi đổi cấu trúc: xem TODO trong `storage/repository.ts` và `storage/init.ts`.
- [ ] Local-first (đọc/ghi offline rồi đồng bộ nền) nếu muốn dùng được khi mất mạng.
- [ ] M2 — Quiz + luyện đề JLPT-style (ngân hàng câu hỏi, chấm điểm, thống kê điểm yếu).
- [ ] M3 — Luyện đọc + ngữ pháp theo lộ trình cấp độ, tra từ inline.
- [ ] M4 — Luyện nói/phát âm (Azure Pronunciation Assessment, chấm theo âm vị).
- [ ] M5 — Gia sư AI hội thoại + luyện viết (chấm & sửa lỗi).
- [ ] M6 — Sổ tay cá nhân + tự tạo bộ thẻ.
- [ ] Nhân bản engine Học sang tiếng Anh sau khi các module tiếng Nhật ổn định.
