# 🔥 Chăm — học đều mỗi ngày

App cá nhân (single user, đăng nhập bằng magic link email) hỗ trợ học đồng thời
**Lập trình / Tiếng Nhật / TOEIC** với 5 cơ chế: lịch cố định theo thứ, spaced
repetition, Pomodoro, hộp phần thưởng ngẫu nhiên, và chuỗi 3 mức. Dữ liệu lưu
trên Supabase (cloud-only) để đồng bộ giữa nhiều máy; cài được như app điện
thoại (PWA).

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
│   ├── appStore.ts     # Zustand store trung tâm — mọi ghi dữ liệu đi qua đây
│   ├── timerStore.ts   # Pomodoro (endTimestamp, LUÔN local — xem TRANSIENT_KEYS)
│   └── clockStore.ts   # đồng hồ ngày logic — app tự sang ngày mới lúc 04:00
│
├── data/seed.ts        # lịch tuần mặc định + 45 tờ giấy thưởng + câu lừa não (§5)
├── components/         # AuthGate (đăng nhập magic link), ErrorBoundary, Layout,
│                       # TimerOverlay, RewardModal, Confetti
├── pages/              # 7 màn hình (Today/Week/Review/ErrorLog/Stats/Sunday/Settings)
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
   (xem `.env.example`).
4. Authentication → URL Configuration → thêm `http://localhost:5173` và domain
   Vercel của bạn vào **Redirect URLs** (để magic link mở đúng app).
5. Đăng nhập lần đầu bằng email bất kỳ → app tự seed dữ liệu mặc định vào cloud.

## Cài như app điện thoại (PWA)

Build (`npm run build`) sinh service worker qua `vite-plugin-pwa` — mở app trên
điện thoại rồi "Thêm vào Màn hình chính" (Android: menu trình duyệt → Add to Home
Screen; iOS Safari: nút Share → Add to Home Screen). App cloud-only nên **vẫn
cần mạng** để thấy dữ liệu — service worker chỉ cache khung giao diện, không cache
dữ liệu học.

## TODO gợi ý cho chủ app (tự làm dần)

- [ ] Migrate schema khi đổi cấu trúc: xem TODO trong `storage/repository.ts` và `storage/init.ts`.
- [ ] Local-first (đọc/ghi offline rồi đồng bộ nền) nếu muốn dùng được khi mất mạng.
