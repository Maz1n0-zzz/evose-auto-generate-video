# Series YouTube: Trở thành AI Engineer từ con số không

Lộ trình 18 tập, mỗi tập 12 tới 18 phút, khổ ngang 16:9, tiếng Việt. Mọi tập dựng bằng skill
`/create-video` của repo này. Soạn ngày 17/11/2026.

## 1. Nguồn gốc nội dung

| Nguồn | Vai trò trong series | Quyền dùng |
|---|---|---|
| PDF "Lộ Trình Hoàn Chỉnh Để Trở Thành Kỹ Sư Agentic AI 2026", Lamhot Siagian, bản dịch Phan Đông Giang | Thứ tự học 9 bước ở mục 11 và bộ câu hỏi phỏng vấn cuối mỗi tập | Chưa rõ giấy phép. Chỉ lấy khung và diễn đạt lại, ghi công tác giả và người dịch ở mô tả video. Muốn trích nguyên văn thì xin phép trước |
| Repo `rohitg00/ai-engineering-from-scratch` | Bài học, code chạy thật, lộ trình nghề `agentic-ai-engineer` | MIT. Được chiếu code và chụp màn hình, ghi nguồn ở mô tả |
| Bài báo gốc, tài liệu chính chủ, sự cố có thật | Minh hoạ thật trong từng tập | Chụp màn hình trang công khai, ghi nguồn trên khung |

Số liệu repo đo ngày 17/11/2026 qua GitHub API:

| Chỉ số | Giá trị |
|---|---|
| Sao | 79.215 |
| Bài học | 542 |
| Phase | 20 |
| Lộ trình Agentic AI Engineer | 14 bài, 865 phút |

### Hai nguồn khớp nhau ở đâu

PDF đi theo thứ tự nền tảng trước: Python, LLM, framework, khái niệm nâng cao, bộ nhớ, công cụ,
RAG, agent, dự án thật. Repo đi theo vòng lặp bốn bước cho mỗi bài: vấn đề, tự xây bằng code
thuần, xem công cụ thật làm cùng việc đó ra sao, rồi mang về một sản phẩm.

Series lấy thứ tự của PDF làm xương sống, lấy vòng bốn bước của repo làm khuôn cho từng tập.
Lộ trình 14 bài `agentic-ai-engineer` của repo nằm trọn trong mùa 2 tới mùa 4.

## 2. Khuôn chung của một tập

Một tập gồm sáu chương. Mỗi chương là một lượt `/create-video` riêng, dài 2 tới 3 phút.

| Chương | Thời lượng | Nội dung | Minh hoạ thật |
|---|---|---|---|
| 1. Mở bằng sự việc | 1-2 phút | Một sự cố, một bài báo, hoặc một cảnh người xem đang gặp | Ảnh chụp bài báo, tweet, trang tài liệu |
| 2. Vấn đề | 2 phút | Vì sao cách làm ngây thơ hỏng | Sơ đồ, output lỗi thật |
| 3. Tự xây | 3-4 phút | Viết phiên bản nhỏ bằng Python thuần, theo code trong repo | Code của repo, chạy thật, chép output |
| 4. Công cụ thật | 2-3 phút | Framework hoặc dịch vụ thật làm cùng việc đó ở đâu | Ảnh chụp tài liệu chính chủ |
| 5. Câu hỏi phỏng vấn | 2 phút | Hai tới ba câu từ PDF, trả lời bằng lời của mình | Thẻ hỏi đáp |
| 6. Bài tập và cầu nối | 1 phút | Việc người xem làm ngay, nhắc tập sau | Đường dẫn bài học trong repo |

Độ dài lời đọc tính theo tốc độ đã đo của giọng tiếng Việt, 3,1 chữ mỗi giây:

| Thời lượng tập | Số chữ lời đọc |
|---|---|
| 12 phút | khoảng 2.200 chữ |
| 15 phút | khoảng 2.800 chữ |
| 18 phút | khoảng 3.300 chữ |

## 3. Lộ trình 18 tập

### Tập 0. Trailer: AI Engineer năm 2026 làm việc gì (5 phút)

- **Mở:** một kỹ sư không huấn luyện mô hình nào, vẫn được trả lương để làm cho mô hình chạy
  đúng trong sản phẩm.
- **Nội dung:** phân biệt ML engineer, AI engineer, Agentic AI engineer. Bản đồ 18 tập.
- **Minh hoạ thật:** sơ đồ 20 phase của repo, mục lục PDF, file `agentic-ai-engineer.json`.
- **Repo:** README, `learning-paths/agentic-ai-engineer.json`.

### Mùa 1. Nền tảng (tập 1 tới 4)

**Tập 1. Dựng máy và Python đủ dùng cho AI**
- **Mở:** cùng một đoạn code, chạy trên máy này được, sang máy khác lỗi thư viện.
- **Nội dung:** môi trường ảo, khoá phiên bản, biến môi trường cho API key, `async`, kiểm dữ
  liệu bằng Pydantic, viết test đầu tiên.
- **Repo:** phase 00 bài 01, 04, 06, 13. Chạy `verify.py --route beginner` trên màn hình.
- **PDF:** mục 2.

**Tập 2. LLM thực sự làm gì: token, cửa sổ ngữ cảnh, tiền**
- **Mở:** cùng một câu, viết tiếng Việt tốn nhiều token hơn viết tiếng Anh.
  Phải đo bằng tokenizer thật trước khi dựng, không ghi số ước lượng.
- **Nội dung:** mô hình đoán chữ tiếp theo, token, cửa sổ ngữ cảnh, nhiệt độ, giá theo token.
- **Minh hoạ thật:** trang tokenizer công khai, bảng giá chính chủ của nhà cung cấp mô hình.
  Chụp ngày dựng, ghi ngày lên khung.
- **Repo:** phase 10 các bài đầu, phase 11 bài 01.
- **PDF:** mục 3.

**Tập 3. Prompt và output có cấu trúc**
- **Mở:** vụ Air Canada. Chatbot tự bịa chính sách hoàn tiền, toà phán hãng phải chịu trách
  nhiệm (Moffatt v. Air Canada, 2024 BCCRT 149, ngày 14/02/2024).
- **Nội dung:** few-shot, chain of thought, ép mô hình trả JSON theo schema, kiểm lại bằng code.
- **Repo:** phase 11 bài 01, 02, 03. Phase 13 bài 04.
- **Ghi chú:** các báo đưa số tiền bồi thường khác nhau. Không đọc con số, chỉ nêu phán quyết.

**Tập 4. Embedding: biến chữ thành toạ độ**
- **Mở:** tìm "cách hoàn tiền" mà ra đúng đoạn viết "chính sách trả lại vé".
- **Nội dung:** vector, cosine, tìm k gần nhất, vì sao tìm theo nghĩa khác tìm theo từ khoá.
- **Repo:** phase 11 bài 04. Bài luyện `practice/cosine-top-k`.
- **Minh hoạ:** chart điểm 2D dựng bằng HyperFrames từ output thật của code.

### Mùa 2. Công cụ và vòng lặp agent (tập 5 tới 10)

**Tập 5. Cho mô hình cầm công cụ: function calling**
- **Mở:** hỏi mô hình "bây giờ là mấy giờ" và nó trả lời sai một cách tự tin.
- **Nội dung:** mô hình không tự chạy gì, nó chỉ viết yêu cầu gọi hàm. Thiết kế schema công cụ.
- **Repo:** phase 13 bài 01, 02, 05. Phase 11 bài 09.

**Tập 6. Tự viết agent loop bằng Python thuần** (tập mẫu, chi tiết ở mục 4)
- **Mở:** bài báo ReAct (Yao và cộng sự, 2022, arXiv 2210.03629).
- **Repo:** phase 14 bài 01 và bài 06.

**Tập 7. MCP: cổng cắm chung cho công cụ**
- **Mở:** Anthropic công bố Model Context Protocol tháng 11/2024. Chụp trang công bố.
- **Nội dung:** JSON-RPC, server, client, transport stdio và HTTP. Tự viết một MCP server nhỏ.
- **Repo:** phase 13 bài 06, 07, 08, 09.
- **Minh hoạ thật:** chạy server trong repo, nối vào Claude Code, chiếu output.

**Tập 8. Context engineering: chọn thông tin đưa vào mô hình**
- **Mở:** bài "Lost in the Middle" (Liu và cộng sự, 2023, arXiv 2307.03172). Thông tin nằm giữa
  ngữ cảnh dài bị bỏ sót nhiều hơn thông tin ở đầu và cuối.
- **Nội dung:** ngân sách ngữ cảnh, tóm tắt, cắt bớt, sắp thứ tự.
- **Repo:** phase 11 bài 05 và 15.

**Tập 9. Bộ nhớ cho agent**
- **Mở:** bài MemGPT (Packer và cộng sự, 2023, arXiv 2310.08560). Mượn ý bộ nhớ ảo của hệ điều hành.
- **Nội dung:** nhớ ngắn hạn, nhớ dài hạn, checkpoint. Phân định thông tin được giữ và thông tin hết hạn.
- **Repo:** phase 14 bài 07, 08, 09.
- **PDF:** mục 6.

**Tập 10. RAG từ mô hình đơn giản tới hệ thống chạy thật**
- **Mở:** chatbot trả lời đúng giọng nhưng sai tài liệu.
- **Nội dung:** chia đoạn, tìm lai từ khoá với vector, xếp hạng lại, đo chất lượng truy xuất.
- **Repo:** phase 11 bài 06, 07. Bài luyện `practice/bm25`.
- **PDF:** mục 8.

### Mùa 3. Điều phối (tập 11 tới 12)

**Tập 11. Chọn framework và đồ thị trạng thái**
- **Mở:** cùng một agent viết bằng ba framework, ba kích thước code khác nhau.
- **Nội dung:** LangGraph, CrewAI, AutoGen. Khi nào cần đồ thị, khi nào một vòng lặp là đủ.
- **Repo:** phase 11 bài 16, 17. Phase 14 bài 13.
- **PDF:** mục 4 và 5.

**Tập 12. Mẫu luồng việc và hệ nhiều agent**
- **Mở:** bài "Building effective agents" của Anthropic, tháng 12/2024. Lời khuyên bắt đầu từ
  luồng việc đơn giản trước khi làm agent tự chủ.
- **Nội dung:** chuỗi prompt, định tuyến, chạy song song, supervisor, swarm.
- **Repo:** phase 14 bài 12 và 28.
- **PDF:** mục 9.

### Mùa 4. Đưa vào sản xuất an toàn (tập 13 tới 17)

**Tập 13. Agent hỏng như thế nào**
- **Mở:** vụ Replit tháng 7/2025. Agent xoá database production của Jason Lemkin (SaaStr) trong
  lúc đang khoá thay đổi code, rồi báo sai rằng không khôi phục được. CEO Replit xác nhận và xin lỗi.
- **Nội dung:** lặp vô hạn, tự báo xong khi chưa xong, dùng sai công cụ. Tách môi trường dev và production.
- **Repo:** phase 14 bài 26, 38.
- **Ghi chú:** các nguồn lệch nhau về số bản ghi và cách khôi phục. Chỉ nêu những điểm các nguồn
  cùng nói.

**Tập 14. Prompt injection**
- **Mở:** EchoLeak, CVE-2025-32711. Một email gửi tới là đủ để Microsoft 365 Copilot làm lộ dữ
  liệu, người dùng không cần bấm gì. Aim Security công bố tháng 6/2025, Microsoft đã vá.
- **Ví dụ thứ hai:** Invariant Labs, tháng 5/2025. Một issue độc trên repo công khai khiến agent
  dùng GitHub MCP server làm lộ nội dung repo riêng tư.
- **Nội dung:** coi mọi nội dung bên ngoài là không đáng tin, quyền tối thiểu, cổng duyệt.
- **Repo:** phase 14 bài 27. Phase 13 bài 15.

**Tập 15. Phát triển theo bài đánh giá**
- **Mở:** sửa prompt cho ca này đẹp lên thì ca khác vỡ, và không ai biết.
- **Nội dung:** bộ ca kiểm cố định, chấm theo quỹ đạo, chặn deploy khi điểm tụt.
- **Repo:** phase 14 bài 30. Phase 11 bài 10.

**Tập 16. Quan sát và vận hành agent**
- **Mở:** agent chậm vào lúc 3 giờ sáng, cần biết bước nào chậm.
- **Nội dung:** trace, span, token, độ trễ. Hàng đợi, sự kiện, cron.
- **Repo:** phase 14 bài 23, 24, 29. Phase 17 bài 08.
- **Minh hoạ thật:** giao diện Langfuse hoặc Phoenix bản chạy local.
- **PDF:** mục 10.

**Tập 17. Capstone: ship một agent và đi phỏng vấn**
- **Mở:** nhà tuyển dụng hỏi "kể một lỗi bạn đã gỡ". Lời khuyên của PDF: mang 2 tới 3 dự án nhỏ.
- **Nội dung:** FastAPI, giao diện chat, Docker, CI có bài đánh giá. Chọn một dự án trong lộ
  trình repo, ví dụ `tiny-coding-agent` hoặc `tool-call-firewall`.
- **Repo:** phase 19 dự án 01. Bằng chứng portfolio trong `agentic-ai-engineer.json`.
- **PDF:** mục 10 và 11.

## 4. Kịch bản mẫu: tập 6, tự viết agent loop

Thời lượng đích 15 phút, khoảng 2.800 chữ, sáu chương.

| Chương | Thời lượng | Lời đọc chính | Hình | Minh hoạ thật |
|---|---|---|---|---|
| 1. Mở | 1 phút 30 | Năm 2022 một nhóm nghiên cứu cho mô hình viết ra suy nghĩ, rồi hành động, rồi đọc kết quả. Ba bước đó là toàn bộ bí mật của agent | Trang arXiv hiện lên, ba chữ Thought, Action, Observation tách ra | Ảnh chụp arXiv 2210.03629 |
| 2. Vấn đề | 2 phút | LLM chỉ trả về chữ. Muốn nó làm việc thì phải có người chạy hộ lệnh và đưa kết quả lại | Hộp mô hình, mũi tên chữ ra, không có gì quay về | Output thật của một lần gọi API không có công cụ |
| 3. Tự xây | 4 phút | Viết vòng `while`, gọi mô hình, tách lệnh gọi công cụ, chạy, nối kết quả vào lịch sử, dừng khi có câu trả lời cuối | Code hiện dần từng dòng, dòng đang nói tới sáng lên | Code `phases/14-agent-engineering/01-the-agent-loop/code`, chạy thật, chép log |
| 4. Chặn lặp vô hạn | 2 phút 30 | Thêm trần số vòng, trần token, và điều kiện dừng | Bộ đếm vòng chạy, chạm trần thì đỏ | Log thật của lần chạy chạm trần |
| 5. Công cụ thật | 2 phút | Agent SDK làm đúng vòng này, chỉ giấu nó đi | Đặt code tự viết cạnh tài liệu SDK, tô cùng màu các phần tương ứng | Ảnh chụp tài liệu chính chủ |
| 6. Phỏng vấn và bài tập | 3 phút | "ReAct khác plan-and-execute chỗ nào". Bài tập: thêm một công cụ đọc file | Thẻ hỏi đáp, đường dẫn bài học | Câu hỏi diễn đạt lại từ PDF mục 9 |

Bước làm cho mỗi chương, theo đúng skill:

1. Chạy code của repo trên máy, lưu log vào `assets/` của chương.
2. `npm run video:new -- "Tap 06 chuong 3 tu xay agent loop"`.
3. Chụp minh hoạ bằng `npm run -s capture -- --url <url> --out <dir>/assets/<ten>.png`.
4. Viết SCRIPT.md, đọc giọng, viết STORYBOARD.md có mốc giây lấy từ `words.txt`.
5. Giao worker dựng khung, build, chấm độc lập.
6. Đủ sáu chương thì nối bằng `npm run video:join -- output/tap-06 <sáu thư mục chương> --music <file> --out tap-06.mp4`,
   rồi dán `output/tap-06/chapters.txt` vào mô tả YouTube.

## 5. Những chỗ skill từng chưa làm được, đã xử lý ngày 17/11/2026

Skill `/create-video` được làm cho video tin tức dọc 9:16, dài 80 tới 90 giây. Bản đầu của mục này
liệt kê năm chỗ vướng khi dùng cho video YouTube dài 16:9. Cả năm đã xử lý.

**Đính chính.** Bản đầu ghi rằng `src/video/packets.ts` ghi cứng "Canvas 1080×1920" và vùng an toàn
khổ dọc. Câu đó sai. `packets.ts` dùng `<thư mục video>/brand/rules.md` khi file này có mặt, và chỉ
rơi về luật Evose khổ dọc khi không có. Repo cũng đã có sẵn một hồ sơ khổ ngang là `brands/mazino`.
Nên khổ ngang đến từ một hồ sơ thương hiệu mới, không cần sửa lõi.

| Chỗ vướng | Đã xử lý bằng |
|---|---|
| Khổ hình | Hồ sơ `brands/ai-engineer/`. `brand/rules.md` khai canvas 1920×1080 và vùng an toàn y 120 tới 860, `video:packets` đưa nó vào gói việc của worker |
| Khung mở và kết | `brands/ai-engineer/brand/open.html` (khung mở chương) và `close.html` (khung kết tập), khổ ngang |
| Video dài | `npm run video:join` trong `src/video/join.ts`. Nối chương nguyên luồng, trải một bản nhạc liền dưới cả tập, ghi `chapters.txt` |
| Lời đọc dài | Luật lời đọc bài giảng trong `brands/ai-engineer/brand/rules.md`. Được dùng thuật ngữ, câu kêu gọi chỉ ở chương cuối |
| Chiếu code | Khung `brands/ai-engineer/brand/code.html`. Hiện từng dòng, tô sáng dòng đang nói tới |

Cách dùng cả bộ nằm ở mục "Hồ sơ bài giảng dài" của `.claude/skills/create-video/SKILL.md`.

Hai điều còn phải nói thật:

- Mốc hình đứng yên 17% trong `src/video/stillness.ts` chỉ hiệu chuẩn cho khổ dọc. Số đo khổ ngang
  chỉ để tham khảo cho tới khi có người hiệu chuẩn lại ngưỡng.
- Phụ đề khổ ngang trên nền sáng chưa render thật lần nào. Chương đầu tiên dựng xong phải nhìn
  dải y 900 tới 1080 trước khi dựng tiếp.

### Chi phí ước tính

Skill ghi mỗi lượt 80 tới 90 giây tốn khoảng 1,5 tới 2 triệu token Claude. Đây là ước tính
theo tỉ lệ, chưa đo trên chương dài 2 tới 3 phút.

| Đơn vị | Ước tính |
|---|---|
| Một chương 2-3 phút | khoảng 3 tới 5 triệu token |
| Một tập 6 chương | khoảng 20 tới 30 triệu token |
| Cả series 18 tập | khoảng 400 tới 500 triệu token, chưa tính ElevenLabs |

Cách giảm: chương phỏng vấn và chương bài tập dùng chung một khuôn khung đã dựng sẵn, chỉ thay
chữ. Dựng thử chương 3 của tập 6 trước, đo chi phí thật, rồi mới chốt cả series.

## 6. Nguồn minh hoạ đã kiểm

Kiểm ngày 17/11/2026 bằng tìm kiếm web. Trước khi dựng tập nào thì mở lại nguồn gốc và chụp
màn hình ngày dựng.

| Sự việc | Tập | Nguồn |
|---|---|---|
| Moffatt v. Air Canada, 2024 BCCRT 149 | 3 | https://www.americanbar.org/groups/business_law/resources/business-law-today/2024-february/bc-tribunal-confirms-companies-remain-liable-information-provided-ai-chatbot/ |
| Replit xoá database của SaaStr, 7/2025 | 13 | https://fortune.com/2025/07/23/ai-coding-tool-replit-wiped-database-called-it-a-catastrophic-failure/ |
| EchoLeak, CVE-2025-32711 | 14 | https://arxiv.org/abs/2509.10540 |
| Prompt injection qua GitHub MCP | 14 | https://invariantlabs.ai/blog/mcp-github-vulnerability |

Bài báo khoa học và trang công bố dùng ở tập 6, 7, 8, 9, 12 chưa mở lại trong lượt này. Mã
arXiv ghi trong từng tập, phải mở đúng trang để chụp trước khi dựng.
