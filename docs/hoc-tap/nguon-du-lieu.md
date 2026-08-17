# Nguồn dữ liệu — khu vực "Học"

Ghi rõ nguồn gốc/giấy phép cho mọi nội dung học hiển thị trong app (bắt buộc
với JMdict theo điều khoản CC BY-SA — "share-alike" nghĩa là nếu bạn phát hành
lại dữ liệu đã sửa, bản phát hành đó cũng phải mở dưới giấy phép tương thích).

## Bộ N5 mẫu hiện có (`scripts/seed-n5-sample.mjs`)

~40 từ vựng + 20 kanji + 15 câu N5 phổ thông, **tự biên soạn** (không copy
JMdict/Mazii/Study4) — dùng để mục "Học" chạy được ngay trong lúc chờ nạp bộ
đầy đủ. Nghĩa tiếng Việt do Claude Code viết, không phải bản dịch từ nguồn nào.

## Nguồn mở hợp pháp để mở rộng lên N5–N1 đầy đủ

| Nội dung | Nguồn | Giấy phép | Việc cần làm |
|---|---|---|---|
| Từ điển (từ vựng, nghĩa, từ loại) | [JMdict](https://www.edrdg.org/jmdict/j_jmdict.html) (EDRDG) | CC BY-SA 3.0 | Tải file XML `JMdict_e`, viết script parse → lọc theo `<misc>` chứa `jlpt-N5`.. (JMdict không tự gắn cấp JLPT — cần chéo với danh sách Tanos bên dưới), chèn vào bảng `vocab` |
| Kanji (âm on/kun, nét, ý nghĩa) | [KANJIDIC2](https://www.edrdg.org/wiki/index.php/KANJIDIC_Project) (EDRDG) | CC BY-SA 3.0/4.0 | Tải `kanjidic2.xml`, parse → chèn `kanji` |
| Câu ví dụ song ngữ | [Tatoeba](https://tatoeba.org/en/downloads) | CC BY 2.0 (một số câu CC0) | Tải export theo cặp ngôn ngữ (jpn-vie hoặc jpn-eng), lọc câu ngắn/đơn giản cho N5 |
| Danh sách từ vựng/kanji theo cấp JLPT | [Tanos (Jonathan Waller)](http://www.tanos.co.uk/jlpt/) | CC BY | Dùng để GẮN LEVEL cho từ/kanji lấy từ JMdict/KANJIDIC2 (2 nguồn trên không có sẵn field cấp độ chuẩn) |

## KHÔNG được dùng

- Đề thi JLPT thật, đề TOEIC thật — có bản quyền của tổ chức ra đề.
- Nội dung/câu hỏi copy trực tiếp từ Mazii.net, Study4, Zenlish — sản phẩm
  thương mại của bên khác.
- **Thay vào đó:** luyện đề (M2) = tự soạn câu hỏi theo ĐÚNG ĐỊNH DẠNG đề thi
  (định dạng không có bản quyền) hoặc dùng LLM sinh câu hỏi mới bám sát format.

## Việc mở rộng (khi cần, ngoài phạm vi M0/M1 hiện tại)

Viết script tương tự `scripts/seed-n5-sample.mjs` nhưng đọc file JMdict/KANJIDIC2
đã tải về máy (không hardcode URL tải trong code — các file này ~50MB, tải 1
lần thủ công), lọc theo level rồi insert theo lô. Có thể dùng MCP Supabase
(`apply_migration`/`execute_sql`) để chạy insert trực tiếp thay vì cần
service role key cục bộ, như đã làm cho bộ N5 mẫu.
