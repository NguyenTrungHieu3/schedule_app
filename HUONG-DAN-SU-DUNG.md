# 🔥 Chăm — Hướng dẫn sử dụng

Tài liệu này dành cho **người dùng app**. Nếu bạn muốn sửa code, đọc [README.md](./README.md).

---

## Chăm là gì

Một app cá nhân giúp bạn học đồng thời **Lập trình / Tiếng Nhật / TOEIC** với cường
độ cao mà không bỏ cuộc giữa chừng. App chạy hoàn toàn trên máy bạn, không cần đăng
nhập, không cần mạng, không có ai theo dõi.

Triết lý của app gói trong một câu: **app không bao giờ trách móc bạn.** Học ít thì
app ghi nhận là ít, không có màu đỏ, không có chữ "thất bại", không có mặt buồn.
Vì một app làm bạn thấy tệ về bản thân là app bạn sẽ đóng và không mở lại.

---

## Mở app lần đầu

```bash
npm install     # chỉ chạy 1 lần
npm run dev     # mở http://localhost:5173
```

Lần đầu mở, app tự nạp sẵn lịch học cả tuần và 45 tờ giấy phần thưởng. Bạn dùng
được ngay, không phải nhập gì. Mọi thứ đều sửa được sau trong **Cài đặt**.

> **Mẹo:** ghim tab này lại (chuột phải vào tab → Ghim/Pin). App sẽ luôn ở đó mỗi
> lần bạn mở trình duyệt.

---

## 7 màn hình

| Màn hình | Dùng để làm gì |
|---|---|
| **Hôm nay** | Màn hình chính. Xem việc tiếp theo, tick việc đã xong, bấm giờ Pomodoro. |
| **Tuần** | Xem cả tuần, xem lại/sửa ngày cũ, dùng thẻ freeze cứu chuỗi. |
| **Ôn tập** | Hàng đợi ôn tập ngắt quãng (thay Anki). |
| **Sổ lỗi** | Ghi câu TOEIC làm sai, app tự nhắc ôn lại. |
| **Thống kê** | Lịch cả năm, biểu đồ giờ học, tổng kết. |
| **Rà soát** | Form 5 phút nhìn lại tuần, làm vào Chủ nhật. |
| **Cài đặt** | Sửa lịch, sửa giấy thưởng, sao lưu dữ liệu. |

Trên máy tính, menu nằm ở cột trái. Trên điện thoại, menu nằm ở thanh dưới cùng.

---

## Dùng hằng ngày: 3 việc

### 1. Tick việc đã làm xong

Ở màn hình **Hôm nay**, mỗi việc trong ngày là một dòng có ô vuông bên trái. Làm
xong thì bấm vào ô vuông.

- Tick **nhầm thì bấm lại** để bỏ tick. Không có hộp thoại "Bạn có chắc không?" —
  mọi thao tác đều hoàn tác được.
- Việc **nghỉ** hiện mờ và không tick được (trừ block `🌴 NGHỈ THẬT` chiều Chủ
  nhật — cái đó tick được và app sẽ khen bạn, vì nghỉ là một phần của kế hoạch).
- Việc **ở trung tâm** (🏫) tick nghĩa là "đã đi học".
- Việc **quá giờ chưa tick** chỉ mờ đi một chút, không đổi đỏ, không nhắc nhở.

### 2. Bấm giờ Pomodoro

Thẻ lớn trên cùng là **việc tiếp theo cần làm**. Có 2 nút:

**▶ Bắt đầu Pomodoro** — vào chế độ toàn màn hình, đếm ngược:
- Việc *deep* (tập trung sâu): **50 phút làm / 10 phút nghỉ**
- Việc *light*, *ôn tập*, *viết lại bài*: **25 phút làm / 5 phút nghỉ**

Hết giờ, app sẽ:
1. **Reo chuông** (3 tiếng "ting")
2. **Hiện thông báo** trên màn hình — kể cả khi bạn đang ở tab khác
3. **Đổi tên tab** thành `⏰ Hết giờ!`

Sau 4 chu kỳ liên tiếp, app hỏi bạn có muốn **nghỉ dài 30 phút** không.

> Đồng hồ **không sợ reload**. Bạn lỡ tắt tab, đóng trình duyệt, hay máy sập — mở
> lại vẫn đếm đúng giây. Nếu hết giờ trong lúc app đóng, pomodoro đó vẫn được tính.

**Chỉ làm 1 chút thôi** — dùng khi bạn thấy ngại, không muốn bắt đầu:
- App hiện một câu kiểu *"Chỉ mở editor và gõ 1 dòng thôi."*
- Chạy đồng hồ **2 phút**
- Hết 2 phút, app hỏi đúng 2 lựa chọn: **[Học tiếp]** và **[Dừng ở đây]**

Nút **Dừng ở đây** dừng thật. Không hỏi lại, không phạt, không mặt buồn. Đây là
lời hứa app phải giữ — nếu app gây áp lực ở bước này thì lần sau mẹo tâm lý này
mất tác dụng, vì bạn biết mình đang tự lừa mình.

### 3. Ôn bài đến hạn

Nếu hôm nay có thẻ cần ôn, màn hình Hôm nay sẽ hiện thẻ *"Hôm nay có N item cần
ôn"*. Bấm **Ôn ngay**. Chi tiết ở phần [Ôn tập](#ôn-tập-thay-anki) bên dưới.

---

## Hạng ngày và chuỗi

### Ngày của bạn được xếp hạng thế nào

Cuối mỗi ngày, app tính bạn hoàn thành bao nhiêu phần trăm số phút đã lên kế hoạch:

| Hạng | Điều kiện |
|---|---|
| 🥇 **Ngày Vàng** | Hoàn thành từ **90%** trở lên |
| ✨ **Ngày Bạc** | Hoàn thành từ **60%** trở lên |
| 🌱 **Ngày Tối thiểu** | Học **ít nhất 30 phút MỖI môn**, đủ cả 3 môn |
| ⏳ **Đang diễn ra** | Hôm nay chưa kết thúc — chưa kết luận gì cả |
| ❄️ **Đóng băng** | Bạn đã dùng thẻ freeze cho ngày này |
| **Ngày trống** | Ngày đã qua và không đạt mức nào ở trên |

**Cả 3 hạng đầu đều là THÀNH CÔNG** và đều giữ được chuỗi. Ngày Tối thiểu hiện
màu xanh lá — đó là thành công, không phải cảnh báo. Những hôm bạn kiệt sức, chỉ
cần **30 phút mỗi môn** là cứu được chuỗi.

> ⚠️ **Lưu ý quan trọng:** Ngày Tối thiểu đòi **đủ cả 3 môn**. Học 90 phút toàn
> TOEIC thì **không** đạt — vì mục tiêu của cơ chế này là giữ cả 3 môn không bị bỏ rơi.

Thanh **Tiến độ 3 môn** ở cuối màn hình Hôm nay có một vạch trắng nhỏ trên mỗi
thanh — đó chính là mốc 30 phút. Hôm nào mệt, nhìn vào đó là biết cần học thêm gì.

### Ngày mới bắt đầu lúc 4 giờ sáng

Không phải nửa đêm. Bạn học đến 11 giờ đêm, tick việc lúc 0h30 — app vẫn tính vào
ngày hôm trước. Sẽ không có chuyện chuỗi bị đứt oan chỉ vì bạn học khuya.

### Chuỗi ngày 🔥

- Đạt Vàng / Bạc / Tối thiểu → chuỗi **+1**
- Ngày trống → chuỗi về **0**
- Dùng freeze → chuỗi **giữ nguyên**

Chạm mốc **7, 14, 30, 60, 100 ngày** → được thưởng 1 lượt bốc **hộp lớn** (riêng
mốc 14 được 2 lượt), kèm pháo giấy.

### Thẻ freeze ❄️ — cứu chuỗi khi lỡ đứt

Mỗi tháng bạn có **2 thẻ**. Đầu tháng reset về 2, **không cộng dồn** (tháng trước
không dùng thì mất, không để dành được).

Cách dùng: vào **Tuần** → bấm vào ô ngày bị trống → bấm **❄️ Dùng 1 thẻ freeze**.

Điều kiện:
- Ngày đó phải **trong quá khứ**, cách hôm nay **không quá 7 ngày**
- Ngày đó phải đang là **Ngày trống**
- Bạn còn thẻ

Dùng xong, ngày đó thành "Đóng băng" và chuỗi được nối lại như chưa hề đứt.

---

## Hộp phần thưởng 🎁

### Cách kiếm lượt bốc

**Hộp nhỏ** (30 tờ) — mỗi lượt một tờ:
- Tick xong một block học *deep* hoặc *light* → 1 lượt
- Ôn hết hàng đợi ôn tập trong ngày → 1 lượt

**Hộp lớn** (15 tờ) — phần thưởng xịn hơn:
- Đạt **Ngày Vàng**
- Hoàn thành block **⚔️ Full TOEIC mock test** (sáng thứ 7)
- Chạm **mốc chuỗi** 7/14/30/60/100

Bỏ tick một việc thì lượt bốc chưa dùng của việc đó cũng bị thu lại — công bằng.

### Bốc như thế nào

Bấm nút bốc → giấy xáo trong **1,2 giây** (hộp lớn: **2 giây** + pháo giấy + nhạc)
→ lật mở kết quả. App cố tình **không** hiện kết quả ngay: cảm giác hồi hộp chờ đợi
chính là một phần của phần thưởng.

Trong hộp có 3 loại giấy, tỉ lệ khoảng **70% thưởng / 20% trung tính / 10% vận động nhẹ**:
- 🎁 **Thưởng** — "1 que kem", "chơi game 15 phút", "1 ly trà sữa full topping"…
- 🍀 **Trung tính** — "Không có gì, vào việc tiếp", "Bốc lại ngay", "Để dành bốc 2 tờ"…
- 💪 **Vận động** — "Hít đất 10 cái", "Plank 45 giây"…

**Bốc nhầm thì bấm "Hoàn tác lượt bốc này"** — lượt được trả lại nguyên vẹn.

> **Không có cơ chế "thương hại".** App không bao giờ ép kết quả kiểu "trúng phạt
> 3 lần rồi nên lần này chắc chắn trúng thưởng". Mọi lần bốc đều ngẫu nhiên thật
> 100%. Tính bất định chính là toàn bộ giá trị của cơ chế này — nếu đoán được thì
> hết vui.

Muốn đổi tỉ lệ? Vào **Cài đặt → Giấy hộp thưởng**, thêm/xoá/tắt từng tờ. Thanh màu
phía trên cho bạn thấy tỉ lệ hiện tại ngay lập tức.

---

## Ôn tập (thay Anki)

Vào **Ôn tập** → **+ Thêm bài đã học** → chọn môn, gõ tên bài (ví dụ *"Kanji bài 12"*,
*"React useEffect"*, *"Part 5 — mệnh đề quan hệ"*).

App sẽ tự nhắc bạn ôn lại theo lịch **1 → 3 → 7 → 16 → 35 ngày**. Ôn đủ 5 lần là
bài đó coi như thuộc, tự động rời khỏi hàng đợi.

Khi ôn, mỗi thẻ có 3 nút:

| Nút | Nghĩa là | Kết quả |
|---|---|---|
| **Nhớ rõ** | Nhớ ngay, không phải nghĩ | Giãn ra khoảng cách xa hơn |
| **Hơi quên** | Có nhớ nhưng phải cố | Giữ nguyên khoảng cách, ôn lại sau đúng chừng đó |
| **Quên hẳn** | Không nhớ gì | Quay về đầu — mai ôn lại |

Vài điểm dễ chịu:
- Thẻ **quá hạn không bị phạt**, không đổi màu đỏ, chỉ xếp riêng một nhóm.
- Nếu hàng đợi dồn quá nhiều, app **chỉ hiện tối đa 40 thẻ** một ngày và nói rõ
  *"phần còn lại tự dời sang mai"*. Bạn sẽ không bao giờ mở app ra và thấy con số
  200 đập vào mặt — đó là cách người ta bỏ Anki.
- Với môn **Lập trình**, app nhắc thêm: *"Mở file trống. Viết lại không nhìn tài liệu."*
  Đọc lại code cũ không phải là ôn tập.

---

## Sổ lỗi TOEIC

Sau mỗi lần chữa đề, vào **Sổ lỗi** → **+ Thêm câu sai**, ghi lại: Part mấy, câu hỏi,
mình chọn gì, đáp án đúng, và **lý do sai** (không biết từ / bẫy ngữ pháp / nghe không
kịp / …).

App nhắc ôn lại theo lịch **1 → 7 → 30 ngày**. Bấm "Đã nhớ" đủ 3 lần thì câu đó
được đánh dấu đã thuộc (vẫn tra cứu lại được).

Hai biểu đồ ở đầu trang là thứ giá trị nhất: **bạn sai nhiều nhất ở Part mấy, và
vì lý do gì.** Sau vài tuần, đó là bản đồ chỉ thẳng vào chỗ cần luyện — quý hơn
việc làm thêm 10 đề.

---

## Rà soát Chủ nhật

Mỗi Chủ nhật, màn hình Hôm nay sẽ nhắc bạn vào **Rà soát**. Form chỉ có 4 câu, mất
5 phút:

1. Tuần này hay bỏ block nào? Vì sao?
2. Môn nào đang né?
3. Hộp phần thưởng còn vui không?
4. Mấy đêm ngủ đủ 7 tiếng?

Bên cạnh form có sẵn số liệu tuần vừa rồi (hạng từng ngày, số giờ mỗi môn) để bạn
trả lời có căn cứ chứ không phải đoán. Câu 2 đặc biệt hữu ích: nhìn cột giờ, môn
nào thấp bất thường là môn bạn đang trốn.

---

## Sao lưu dữ liệu ⚠️

Dữ liệu nằm **trong trình duyệt trên máy bạn**. Nghĩa là:

✅ Tắt app, tắt máy, mất mạng → **không sao cả**, dữ liệu còn nguyên.

❌ Nhưng sẽ **mất** nếu:
- Bạn xoá dữ liệu duyệt web (Clear browsing data / cookies & site data)
- Bạn mở app bằng **trình duyệt khác** hoặc **máy khác** (mỗi trình duyệt là một kho riêng)
- Bạn dùng **chế độ ẩn danh**

**Cách phòng:** vào **Cài đặt → Export JSON**, lưu file đó lại (Google Drive, USB,
đâu cũng được). App tự nhắc bạn mỗi 30 ngày.

**Chuyển sang máy mới:** Export ở máy cũ → mở app ở máy mới → **Import JSON**.

**Xoá sạch làm lại:** Cài đặt → cuối trang → gõ `XOA HET`.

---

## Sửa lịch học cho hợp với bạn

Lịch mặc định là gợi ý, không phải luật. Vào **Cài đặt → Lịch tuần**, chọn thứ, rồi
thêm/sửa/xoá từng block. Mỗi block cần: tiêu đề, giờ bắt đầu–kết thúc, môn, và loại:

| Loại | Ý nghĩa |
|---|---|
| **Deep** | Tập trung sâu — Pomodoro 50/10 |
| **Light** | Nhẹ hơn — Pomodoro 25/5 |
| **🏫 Lớp học** | Học ở trung tâm — chỉ tick "đã đi", không bấm giờ |
| **Ôn tập SRS** | Phiên ôn thẻ |
| **Active recall** | Viết lại bài từ trí nhớ |
| **Nghỉ** | Hiện mờ, không tính vào tỉ lệ hoàn thành |

Đổi lịch không làm hỏng dữ liệu cũ — các ngày đã qua vẫn giữ nguyên kết quả.

---

## Câu hỏi thường gặp

**Học đến 1 giờ sáng rồi mới tick, có bị tính sang ngày mai không?**
Không. Ngày mới bắt đầu lúc 4 giờ sáng.

**Lỡ tick nhầm thì sao?**
Bấm lại để bỏ tick. Hạng ngày và lượt bốc thưởng tự tính lại ngay.

**Quên mở app cả tuần, mở lại có bị lỗi không?**
Không. App tự tính lại chuỗi cho những ngày vắng mặt, dữ liệu cũ nguyên vẹn.
Chuỗi sẽ về 0 nhưng **chuỗi dài nhất** của bạn vẫn được ghi nhớ trong Thống kê.

**Đang chạy Pomodoro mà lỡ tắt tab?**
Mở lại, đồng hồ chạy tiếp đúng chỗ đang dở.

**Không nghe thấy chuông?**
Kiểm tra **Cài đặt → Chung → Âm thanh**. Trình duyệt cũng chặn âm thanh nếu bạn
chưa từng bấm gì trên trang — nhưng bạn đã bấm "Bắt đầu Pomodoro" nên thường không sao.

**Muốn dùng trên điện thoại?**
Giao diện có sẵn bản mobile. Nhưng nhớ là **dữ liệu không tự đồng bộ** giữa máy tính
và điện thoại — mỗi thiết bị một kho riêng. Muốn đồng bộ thật thì phải thêm backend
(xem TODO trong README).

**Bốc trúng "Bốc lại ngay" thì sao?**
Bấm nút màu cam hiện ra, giấy xáo lại luôn trong cùng cửa sổ đó.

---

## Vài lời cuối

App này được thiết kế quanh một sự thật: **thứ quyết định kết quả không phải ngày
bạn học 12 tiếng, mà là bạn có mở app lại vào ngày thứ 40 hay không.**

Nên nếu hôm nào mệt: mở app, bấm *"Chỉ làm 1 chút thôi"*, học 30 phút mỗi môn, giữ
được chuỗi, rồi đi ngủ. Ngày Tối thiểu màu xanh cũng là thành công như Ngày Vàng.

Chúc bạn học đều 💪
