# Prompt pack cho Stitch — khu vực "Học"

Dùng khi thiết kế lại/giao diện đẹp hơn cho các màn "Học" bằng
[Stitch](https://stitch.withgoogle.com). Stitch xuất React + Tailwind hoặc
Figma — sau khi có component, đưa lại cho Claude Code để nối vào
`useLearningStore` (xem `src/store/learningStore.ts`) thay cho UI tạm hiện có
(`src/pages/HocPage.tsx`, `src/pages/FlashcardReviewPage.tsx`).

## 1. Dán trước tiên — bối cảnh thiết kế chung (paste vào mọi phiên Stitch)

```
Đây là app học tập tên "Chăm" — phong cách thân thiện, tròn trịa, KHÔNG dùng
màu đỏ hay ngôn ngữ trách móc (kể cả khi người dùng làm sai/bỏ lỡ).

Design tokens bắt buộc theo:
- Font: Nunito (rounded, weight 500-800), hỗ trợ tiếng Việt có dấu đầy đủ.
- Accent duy nhất: tím violet #7c5cd6 (primary), tím đậm #6247b0 (primary-dark),
  tím rất nhạt #ece5fb (primary-soft). Nền trang: #f3effc.
- Thang xám: xám ngả tím (không xám thuần) — từ #faf8fe (rất nhạt) đến
  #241c3a (rất đậm).
- Bo góc lớn (rounded-2xl/3xl), thẻ nội dung nền trắng viền mỏng xám nhạt.
- Nút chính: hiệu ứng "3D" — có viền mép màu đậm hơn phía dưới tạo cảm giác
  nút nổi, bấm xuống khi click.
- Icon: bộ Phosphor Icons, weight "fill" khi active/nổi bật, "regular" khi
  thường.
- Ngôn ngữ giao diện: tiếng Việt.
- Toàn app đã có sẵn: sidebar trái (desktop) / bottom nav (mobile) với các
  mục Hôm nay, Tuần, Ôn tập, Học, Sổ lỗi, Thống kê, Rà soát, Cài đặt — màn
  bạn thiết kế nằm bên trong layout đó (không tự vẽ lại sidebar).
```

## 2. M1 — Trang "Học" (danh sách bộ thẻ)

```
Thiết kế trang danh sách bộ thẻ (deck) học từ vựng/kanji tiếng Nhật, phong
cách lai giữa Quizlet (thẻ deck rõ ràng, có ảnh/icon đại diện) và Duolingo
(cảm giác lộ trình, có tiến độ trực quan).

Mỗi deck hiện: tên, mô tả ngắn, cấp độ (badge "N5"), SỐ THẺ ĐẾN HẠN hôm nay
(số lớn, nổi bật, màu accent — đây là động lực chính để bấm vào), và một
thanh tiến độ nhỏ (bao nhiêu % thẻ trong deck đã "thành thạo").

Trên cùng: 1 thẻ tổng quan lớn "Hôm nay bạn có N thẻ cần ôn" gộp từ TẤT CẢ
deck, với nút CTA to "Ôn ngay" — đây là hành động chính người dùng làm mỗi
ngày, phải là hình ảnh nổi bật nhất trên trang.

Trạng thái rỗng (chưa có deck nào): hình minh hoạ nhẹ nhàng + text hướng dẫn
thân thiện, không có cảm giác lỗi/trống trải tiêu cực.
```

## 3. M1 — Màn ôn thẻ (flashcard session)

```
Thiết kế màn ôn 1 thẻ flashcard, toàn màn hình, nền tối (dark, tương phản
cao) — đây là màn "tập trung sâu", khác các trang khác của app (nền sáng).

Trên cùng: thanh tiến độ phiên (ví dụ "3 / 20") + badge loại thẻ (Từ vựng /
Kanji / Câu).

Giữa màn: mặt trước thẻ (chữ Nhật, rất lớn, dễ đọc). Có nút "Lật thẻ" — khi
bấm, thẻ lật (hiệu ứng flip 3D mượt) hiện: cách đọc (furigana, cỡ vừa) +
nghĩa tiếng Việt (nổi bật, màu xanh lá nhạt để phân biệt với chữ Nhật).

Sau khi lật: 3 nút đánh giá xếp ngang, dùng ĐÚNG 3 nhãn này (không đổi khác):
"Nhớ rõ" (xanh lá), "Hơi quên" (vàng/cam), "Quên hẳn" (xám tối) — style nút
3D nổi giống các nút hành động khác trong app.

Góc dưới: link nhỏ "Tạm dừng phiên ôn" để thoát phiên bất cứ lúc nào không
mất tiến độ.

Optional (nếu có thời gian): hiệu ứng confetti nhẹ khi trả lời "Nhớ rõ" liên
tiếp nhiều lần (streak trong phiên), animation lật thẻ dùng CSS 3D transform.
```

## 4. M2 — Quiz / luyện đề (thiết kế sau, khi bắt đầu milestone)

```
Thiết kế màn làm bài quiz trắc nghiệm kiểu luyện thi JLPT (tham khảo Zenlish/
Study4 nhưng KHÔNG copy nội dung câu hỏi của họ). Mỗi câu: đề bài rõ ràng, 4
đáp án dạng nút bấm lớn (dễ bấm trên mobile), chọn xong hiện ngay đúng/sai +
giải thích ngắn (không phán xét khi sai — dùng màu trung tính, không đỏ gắt).

Cuối bài: màn kết quả tổng — điểm số, thời gian làm, VÀ danh sách "điểm yếu"
(nhóm câu sai theo chủ đề ngữ pháp/từ vựng) để định hướng ôn tiếp — đây là
tính năng khác biệt so với quiz thường, hiện rõ ràng.
```

## 5. M3 — Luyện đọc + ngữ pháp (thiết kế sau)

```
Thiết kế màn đọc bài văn ngắn tiếng Nhật chia theo cấp độ. Văn bản bên trái/
giữa (font đọc thoải mái, giãn dòng rộng), có thể BẤM VÀO TỪNG TỪ để tra
nghĩa nhanh (popover nhỏ hiện cách đọc + nghĩa, không rời trang). Bên phải
(desktop) hoặc dưới bài (mobile): danh sách điểm ngữ pháp xuất hiện trong bài,
mỗi điểm có thể bấm mở rộng xem giải thích + ví dụ.
```

## 6. M4 — Luyện nói / phát âm (thiết kế sau)

```
Thiết kế màn luyện phát âm 1 câu/từ tiếng Nhật, phong cách như Elsa Speak.
Hiện câu cần đọc to, nút mic tròn lớn ở giữa (trạng thái: sẵn sàng / đang ghi
âm có animation sóng âm / đang chấm điểm). Sau khi chấm: điểm tổng (số lớn,
màu theo mức điểm nhưng KHÔNG dùng đỏ cho điểm thấp — dùng cam/vàng), và câu
được TÔ MÀU TỪNG ÂM TIẾT theo độ chính xác (xanh lá = tốt, vàng = cần cải
thiện) — đây là phần trực quan quan trọng nhất của màn này.
```

## 7. M5 — Gia sư AI hội thoại + Luyện viết (thiết kế sau)

```
(a) Màn chat với gia sư AI: giao diện chat quen thuộc (bong bóng chat trái/
phải), có nút mic để nói thay vì gõ. Gợi ý câu hỏi nhanh ("Giải thích ngữ
pháp này", "Sửa câu giúp tôi") dưới dạng chip bấm nhanh phía trên ô nhập.

(b) Màn luyện viết: đề bài viết ở trên, khung nhập văn bản lớn ở giữa, nút
"Chấm bài" — kết quả hiện bài viết với các lỗi được GẠCH CHÂN MÀU (không phải
đỏ gắt — dùng cam), bấm vào chỗ gạch chân hiện gợi ý sửa.
```

## 8. M6 — Sổ tay cá nhân + tự tạo thẻ (thiết kế sau)

```
Thiết kế màn sổ tay: danh sách từ/câu người dùng đã lưu khi học (kiểu ghi
chú nhanh), mỗi mục có nút "Thêm vào bộ thẻ ôn tập" để đẩy vào SRS. Có màn
tạo bộ thẻ riêng (kiểu Quizlet "Create set"): nhập cặp mặt trước/sau, thêm
dòng, sắp xếp lại bằng kéo-thả.
```
