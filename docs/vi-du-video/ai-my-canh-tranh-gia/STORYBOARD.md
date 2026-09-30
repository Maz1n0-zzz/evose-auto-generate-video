---
format: 1080x1920
duration: 80s
message: "AI Mỹ buộc phải giảm giá vì khách bỏ sang mô hình Trung Quốc rẻ hơn — người thắng là người trả tiền"
arc: story-explainer
audience: người Việt dùng AI cho công việc, lướt TikTok/Reels
mode: autonomous
music: warm news underscore, light pulsing synth, steady 100bpm, hopeful, no vocals
---

## Video direction

- **Palette:** giấy `#f2f2f0` + lưới chấm `#d6d6d1` làm nền toàn video. Mực `#0a0a0a` cho chữ chính. Xanh Evose `#2563eb` là màu nhấn duy nhất, dùng cho phía "rẻ / người trả tiền". Đỏ gạch `#d64545` chỉ dùng cho giá cũ bị gạch và chuông báo động. Không gradient tím xanh, không bokeh.
- **Type:** display = Hanken Grotesk 800 cho chữ lớn. Số liệu = JetBrains Mono, `tabular-nums`. Chữ tiếng Việt có dấu nên line-height ≥ 1.12.
- **Vùng an toàn (bắt buộc):** header logo Evose phủ y 0–270, footer mạng xã hội phủ y 1690–1920, phụ đề nằm y 1540–1690. Nội dung chính chỉ được nằm trong y 290–1520. Nền và lớp trang trí được tràn toàn khung.
- **Luật storyboard (đề xuất 2):** không khung nào trống, không thứ gì đứng yên. Mỗi khung có ít nhất 3 trạng thái hình khác nhau hẳn nhau, mỗi trạng thái đổi đúng lúc giọng nhắc tới. Không có quãng nào quá 1,5 giây mà khung hình không có chuyển động nhìn thấy được. Khi nội dung đã hiện đủ, camera vẫn đẩy chậm (tối đa 4%) và lưới nền trôi nhẹ.
- **Motion grammar:** ease `power3.out` mặc định, `back.out(1.6)` chỉ cho pop của nhãn giá. Mọi phần tử vào đúng mốc chữ ghi trong Scene. Không front-load.
- **Nhịp:** khung 6 và khung 10 là khung nhịp chậm (câu ngắn, chữ lớn). Khung 7 là cao trào số liệu, dày nhất.
- **Cấm:** logo thật của OpenAI, Anthropic, Meta, xAI, DoorDash, Siemens (chỉ dùng chip chữ). Không bịa số ngoài lời đọc. Không slideshow (hiện hết rồi đứng im). Không screensaver (mọi thứ trôi lung tung không theo lời).
- **Đồ vật xuyên suốt:** một "thẻ giá" (price tag) màu mực, xuất hiện từ khung 2, bị gạch ở khung 6–7, co lại ở khung 8. Nó là sợi chỉ nối các khung.

## Frame 1 — Hook

- scene: Logo card Evose đã duyệt, tiêu đề "AI Mỹ xoay xở cạnh tranh giá với Trung Quốc"
- voiceover: "Tháng sáu vừa rồi, một công ty ở San Francisco tắt hẳn mô hình AI của Mỹ... để chuyển sang hàng Trung Quốc."
- duration: 7.263s
- transition_in: cut
- status: animated
- src: compositions/frames/01-hook.html
- type: hook
- persuasion: Imagine / scenario
- beat: curiosity
- blueprint: logo-assemble-lockup
- focal: tiêu đề hai dòng
- roles: tiêu đề = foreground subject · phụ đề nhỏ = supporting · lưới chấm = background
- sfx: whoosh@0.0

narrativeRole: Mở đúng như cảnh mở đã được Mazino duyệt, dựng lại bằng HTML của template evose-logo-card.
keyMessage: Có chuyện lớn: doanh nghiệp đang bỏ AI Mỹ.

Orchestrator tự dựng khung này từ `templates/evose-logo-card` (không giao worker, không áp camera chung).

## Frame 2 — Cùng một việc, hai cái giá

- scene: Một thẻ việc ở giữa tách làm hai làn, làn Mỹ thẻ giá to, làn Trung Quốc thẻ giá nhỏ, rồi hai kết quả giống nhau
- voiceover: "Lý do rất đời thường. Cùng một việc, bên Mỹ lấy nhiều tiền. Bên Trung Quốc lấy ít hơn hẳn. Mà kết quả gần như nhau."
- duration: 7.054s
- transition_in: zoom-through
- status: animated
- src: compositions/frames/02-cung-mot-viec.html
- type: pain_point
- persuasion: Comparison of two options
- beat: recognition
- blueprint: comparison-split
- focal: hai thẻ giá chênh nhau
- roles: thẻ việc "Cùng một việc" = foreground subject · hai làn giá = foreground · dấu ≈ = supporting · lưới = background
- sfx: whoosh-short@0.0, pop@0.9, impact-bass-1@2.5, pop@3.85, impact-bass-1@5.6

Adapt: giữ signature hai thẻ đối xứng nghiêng ngược nhau, đổi từ trái/phải sang trên/dưới cho khung dọc.
Scene 1 (0.0–1.5s): "Lý do rất đời thường" — chữ lớn "Lý do?" hiện per-word ở y≈520, dưới nó một thẻ việc trắng bo góc (icon tài liệu + chữ "1 việc") trượt lên từ dưới. Centered, thẻ chiếm ~45% bề ngang.
Scene 2 (1.5–2.4s): "Cùng một việc" — chữ "Lý do?" bay lên và mờ đi. Thẻ việc nhân đôi thành hai bản (center-outward-expansion), một bản chạy lên nửa trên, một bản chạy xuống nửa dưới. Đường kẻ mảnh chia khung làm hai dải.
Scene 3 (2.4–3.7s): "bên Mỹ lấy nhiều tiền" — dải trên có nhãn "AI MỸ", thẻ giá màu mực to rơi xuống cạnh thẻ việc với số "$$$$" (JetBrains Mono), rung nhẹ khi chạm. Split-tilt: dải trên nghiêng −4°.
Scene 4 (3.7–5.5s): "Bên Trung Quốc lấy ít hơn hẳn" — dải dưới nhãn "AI TRUNG QUỐC", thẻ giá xanh `#2563eb` nhỏ bằng 1/3 thẻ Mỹ pop vào với "$". Dải dưới nghiêng +4°.
Scene 5 (5.5–7.05s): "Mà kết quả gần như nhau" — ở mỗi dải một ô kết quả có dấu tích vẽ bằng svg-path-draw, hai ô y hệt nhau. Dấu "≈" cỡ rất lớn slam vào giữa đường chia. Camera đẩy chậm 3% tới hết khung.

## Frame 3 — Nguồn tin và cái tên Lindy

- scene: Trang báo VnExpress nghiêng 3D, hai chip nguồn bay vào, rồi zoom vào chữ "Lindy" khổng lồ, cuối cùng Lindy thu về thành một trong ba thẻ
- voiceover: "VnExpress vừa đăng lại chuyện này, dẫn Financial Times và CNBC. Công ty kia tên là Lindy. Và họ không phải trường hợp duy nhất."
- duration: 8.435s
- transition_in: push-slide UP
- status: animated
- src: compositions/frames/03-nguon-lindy.html
- type: social_proof
- persuasion: Citation / source + progressive disclosure
- beat: orientation
- blueprint: zoom-out-workspace-reveal
- asset_candidates: assets/shot-news.png — ảnh chụp bài báo VnExpress gốc về AI Mỹ giảm giá, khổ dọc
- focal: ảnh bài báo, rồi chữ "Lindy"
- roles: ảnh bài báo = foreground subject · chip "Financial Times" / "CNBC" = supporting · chữ Lindy = foreground subject (Scene 3) · ba thẻ công ty = foreground (Scene 4)
- sfx: whoosh@0.0, pop@2.6, pop@4.0, glitch-1@6.0, click@7.4

Adapt: giữ signature zoom liên tục, nhưng đảo chiều: bắt đầu rộng trên trang báo, đẩy vào tên công ty, rồi zoom-out để lộ đó chỉ là một trong ba.
Scene 1 (0.0–2.3s): "VnExpress vừa đăng lại chuyện này" — ảnh bài báo dạng card 3D nghiêng (3d-page-scroll), chiếm ~70% chiều ngang, tự cuộn chậm xuống. Nhãn nhỏ "NGUỒN" góc trên. Dải tô xanh mờ quét qua tiêu đề bài.
Scene 2 (2.3–4.8s): "dẫn Financial Times và CNBC" — chip "Financial Times" pop vào lúc 2.6s, chip "CNBC" pop vào lúc 4.0s, cả hai đè lên mép dưới card báo, có đường nối mảnh tới bài.
Scene 3 (4.8–6.7s): "Công ty kia tên là Lindy" — card báo và chip lùi ra sau, mờ, blur (depth-of-field). Chữ "Lindy" cỡ gần tràn ngang hiện kiểu hacker-flip-3d đúng lúc 6.0s. Dưới nó dòng mono nhỏ "San Francisco · tháng 6".
Scene 4 (6.7–8.43s): "Và họ không phải trường hợp duy nhất" — chữ Lindy thu nhỏ và bay vào thẻ thứ nhất của một hàng ba thẻ dọc; hai thẻ còn lại hiện dạng khung trống viền nét đứt có dấu "?" lúc 7.4s. Đây là sân khấu mà khung 4 kế thừa.

## Frame 4 — Ba cách xoay xở

- scene: Ba thẻ công ty xếp dọc, mỗi thẻ đổi trạng thái theo lời: Lindy đi hẳn, DoorDash chia đôi, Siemens chạy song song
- voiceover: "Lindy đi hẳn. DoorDash thì chia đôi, việc dễ giao cho Trung Quốc, việc khó giữ lại cho Mỹ. Còn Siemens của Đức... dùng song song cả hai."
- duration: 8.469s
- transition_in: zoom-through
- status: animated
- src: compositions/frames/04-ba-cach.html
- type: feature_showcase
- persuasion: Rule of three + concretization
- beat: comprehension
- blueprint: grid-card-assemble
- focal: thẻ đang được nhắc tới
- roles: ba thẻ công ty = foreground subject (thẻ đang nói phóng to, thẻ khác lùi xám) · mũi tên tách luồng = supporting · lưới = background
- sfx: whoosh-short@0.1, click@1.06, pop@2.85, pop@4.33, pop@6.1, sparkle@7.3

Adapt: giữ signature ba thẻ tự xếp thành list dọc, nhưng mỗi thẻ có một trò riêng xảy ra ngay trong thẻ.
Scene 1 (0.0–1.0s): "Lindy đi hẳn" — ba thẻ dọc (Lindy / DoorDash / Siemens) đã ở chỗ; thẻ Lindy sáng lên, phóng 1.08. Icon cửa trong thẻ mở, nhãn "AI Mỹ" trong thẻ trượt ra ngoài mép phải và biến mất, nhãn "AI Trung Quốc" xanh trượt vào thế chỗ. Tag đỏ "ĐI HẲN".
Scene 2 (1.0–2.8s): "DoorDash thì chia đôi" — thẻ Lindy lùi xám. Thẻ DoorDash phóng to; đường cắt dọc chia thẻ làm hai nửa tách nhẹ ra.
Scene 3 (2.8–5.6s): "việc dễ giao cho Trung Quốc" (2.85s) nửa trái có chip "việc dễ" + mũi tên tới "TQ" xanh. "việc khó giữ lại cho Mỹ" (4.33s) nửa phải có chip "việc khó" + mũi tên tới "Mỹ" màu mực. Tag vàng nhạt "CHIA ĐÔI".
Scene 4 (5.6–8.47s): "Còn Siemens của Đức" (6.1s) thẻ DoorDash lùi, thẻ Siemens phóng to, cờ chữ nhỏ "Đức". "dùng song song cả hai" (7.3s) hai thanh "Mỹ" và "TQ" chạy song song trong thẻ, cùng sáng nhịp. Tag "SONG SONG". Camera đẩy chậm vào thẻ Siemens tới hết khung.

## Frame 5 — Chênh 10 đến 60 lần

- scene: Câu hỏi "Vì sao họ dám đổi?", rồi hai cột giá, cột mô hình đóng cao vút, cột mô hình mở thấp tè, rồi con số 10 → 60 lần đếm lên và phình to
- voiceover: "Vì sao họ dám đổi? Vì chênh lệch quá lớn. Mô hình mở tốt nhất rẻ hơn mô hình đóng tương đương... từ mười đến sáu mươi lần."
- duration: 7.339s
- transition_in: push-slide UP
- status: animated
- src: compositions/frames/05-chenh-lech.html
- type: social_proof
- persuasion: Statistical proof + value-scaled counter
- beat: surprise
- blueprint: dataviz-countup
- focal: con số "10–60×"
- roles: câu hỏi = foreground (Scene 1) · hai cột = foreground (Scene 2–3) · số đếm = foreground subject (Scene 4) · lưới = background
- sfx: pop@1.03, click@2.98, riser@4.4, impact-bass-2@6.8

Adapt: giữ signature số đếm lên, đổi nền tối sang giấy sáng Evose.
Scene 1 (0.0–1.6s): "Vì sao họ dám đổi?" — câu hỏi chữ lớn per-word ở giữa khung, dấu "?" xanh phóng to rồi nảy.
Scene 2 (1.6–2.9s): "Vì chênh lệch quá lớn" — câu hỏi co lên đỉnh vùng an toàn thành tiêu đề nhỏ. Hai cột đáy chung hiện ra: nhãn "MÔ HÌNH ĐÓNG" (mực) và "MÔ HÌNH MỞ" (xanh), chưa có chiều cao.
Scene 3 (2.9–5.9s): "Mô hình mở tốt nhất" (2.98s) cột mở mọc lên một đoạn ngắn. "rẻ hơn mô hình đóng tương đương" (4.75s) cột đóng mọc vút lên cao gần đỉnh vùng an toàn, có thẻ giá màu mực gắn đỉnh cột.
Scene 4 (5.9–7.34s): "từ mười đến sáu mươi lần" — số JetBrains Mono ở giữa đếm "10×" lúc 6.1s rồi nhảy lên "60×" lúc 6.8s, cỡ chữ phình theo giá trị (counting-dynamic-scale). Dòng nhỏ "rẻ hơn" dưới số. Camera đẩy 4%.

## Frame 6 — Chuông báo động

- scene: Chiếc chuông đỏ rung, sóng âm tỏa ra, rồi thẻ giá Mỹ bị đóng dấu "GIẢM GIÁ"
- voiceover: "Với các hãng Mỹ, đó là hồi chuông báo động. Và họ chọn cách đơn giản nhất... giảm giá."
- duration: 5.337s
- transition_in: blur-crossfade
- status: animated
- src: compositions/frames/06-bao-dong.html
- type: benefit_highlight
- persuasion: Visceral metaphor
- beat: tension
- blueprint: kinetic-type-beats
- focal: chiếc chuông, rồi con dấu "GIẢM GIÁ"
- roles: chuông SVG = foreground subject · vòng sóng = supporting · thẻ giá + con dấu = foreground (Scene 3) · lưới = background
- sfx: pop@0.8, notification@2.1, impact-bass-1@4.77

Adapt: giữ signature payoff spring-pop cuối, thêm vật thể chuông làm hero đầu khung.
Scene 1 (0.0–1.7s): "Với các hãng Mỹ" — chip chữ "OpenAI", "Anthropic", "xAI", "Meta" xếp thành hàng ngang ở y≈420, pop lần lượt từ 0.8s.
Scene 2 (1.7–3.0s): "đó là hồi chuông báo động" — chuông SVG đỏ `#d64545` cỡ lớn ở giữa khung, rung theo góc nghiêng qua lại (tất định, không repeat vô hạn), ba vòng sóng đỏ loang ra đúng lúc 2.26s. Chip hãng rung theo.
Scene 3 (3.0–4.7s): "Và họ chọn cách đơn giản nhất" — chuông thu nhỏ bay lên góc. Thẻ giá màu mực lớn (vật xuyên suốt) trượt vào giữa, ghi "$$$$".
Scene 4 (4.7–5.34s): "giảm giá" — con dấu chữ nhật đỏ "GIẢM GIÁ" đập xuống thẻ giá nghiêng −8° (kinetic-beat-slam), thẻ giá co lại 15% khi dấu chạm.

## Frame 7 — Ba lần cắt giá

- scene: Ba dòng giá xếp dọc, mỗi dòng có thanh giá cũ bị gạch và co lại tới mức mới đúng lúc giọng đọc
- voiceover: "Cuối tháng bảy, OpenAI giảm giá bản rẻ nhất tới tám mươi phần trăm. Anthropic ra mô hình mới, giá chỉ bằng một nửa. Bản tầm trung của OpenAI cũng giảm hai mươi phần trăm."
- duration: 10.963s
- transition_in: zoom-through
- status: animated
- src: compositions/frames/07-ba-lan-cat.html
- type: feature_showcase
- persuasion: Numbered enumeration + before/after
- beat: momentum
- blueprint: grid-card-assemble
- focal: thanh giá đang co lại
- roles: tiêu đề "Cuối tháng 7" = supporting · ba dòng giá = foreground subject · nhãn % = foreground · lưới = background
- sfx: key-press@0.3, whoosh-short@1.39, click@3.55, whoosh-short@4.49, click@6.58, whoosh-short@7.82, click@10.1

Adapt: giữ signature list dọc tự tích lũy, mỗi dòng là một thanh ngang co lại (stat-bars-and-fills) thay vì thẻ tĩnh.
Scene 1 (0.0–1.3s): "Cuối tháng bảy" — nhãn lịch "CUỐI THÁNG 7" lật vào (hacker-flip-3d) ở đỉnh vùng an toàn, dòng mảnh kẻ ngang dưới nó.
Scene 2 (1.3–4.4s): "OpenAI giảm giá bản rẻ nhất" (1.39s) dòng 1 trượt vào: chip "OpenAI · bản rẻ nhất" + thanh ngang màu mực dài full. "tám mươi phần trăm" (3.55s) thanh co lại còn 20% chiều dài, phần bị cắt để lại vết gạch đỏ mờ; số "−80%" đếm lên bên phải bằng JetBrains Mono.
Scene 3 (4.4–7.7s): "Anthropic ra mô hình mới" (4.49s) dòng 2 trượt vào dưới dòng 1: chip "Anthropic · mô hình mới" + thanh full. "giá chỉ bằng một nửa" (6.58s) thanh co còn 50%, nhãn "½ giá".
Scene 4 (7.7–10.96s): "Bản tầm trung của OpenAI" (7.82s) dòng 3 trượt vào: chip "OpenAI · tầm trung" + thanh full. "giảm hai mươi phần trăm" (10.1s) thanh co còn 80%, số "−20%". Dòng 1 và 2 nhấp nháy xanh nhẹ khi dòng 3 chốt. Camera lùi nhẹ để thấy đủ ba dòng.

## Frame 8 — Khách trả ít hơn gần một phần tư

- scene: Một đồng xu lớn, một phần tư bị cắt ra và bay đi, số "≈ ¼" và mũi tên xuống
- voiceover: "Cộng lại, chỉ từ giữa tháng bảy, khách hàng đã trả ít hơn gần một phần tư cho các mô hình hàng đầu của Mỹ."
- duration: 6.541s
- transition_in: push-slide UP
- status: animated
- src: compositions/frames/08-mot-phan-tu.html
- type: benefit_highlight
- persuasion: Concretization (con số thành vật thể)
- beat: "aha"
- blueprint: dataviz-countup
- focal: đồng xu bị cắt một phần tư
- roles: đồng xu SVG = foreground subject · nhãn "từ giữa tháng 7" = supporting · số ≈¼ = foreground · lưới = background
- sfx: whoosh@0.3, pop@1.6, whoosh-short@3.9, sparkle@4.2

Adapt: giữ signature vòng tròn đo lường (donut) nhưng biến nó thành đồng xu tiền.
Scene 1 (0.0–2.4s): "Cộng lại, chỉ từ giữa tháng bảy" — ba thanh giá của khung 7 thu nhỏ ở trên cùng rồi gộp vào nhau (scale-swap) thành một đồng xu lớn màu mực viền xanh ở giữa khung; nhãn mono "TỪ GIỮA THÁNG 7" hiện lúc 1.6s.
Scene 2 (2.4–3.9s): "khách hàng đã trả ít hơn" — icon người dùng nhỏ xuất hiện dưới đồng xu, mũi tên xuống xanh vẽ ra (svg-path-draw) lúc 3.4s.
Scene 3 (3.9–6.54s): "gần một phần tư" (3.9s) một lát 1/4 của đồng xu tách ra, bay chéo lên phải và mờ đi; số "≈ ¼" cỡ lớn pop cạnh. "cho các mô hình hàng đầu của Mỹ" (5.0s) dòng nhỏ "mô hình hàng đầu của Mỹ" hiện dưới số. Camera đẩy 3%.

## Frame 9 — Cuộc đua chưa dừng

- scene: Đường đua hạ giá, đường giá đi xuống, hai người chơi mới nhập cuộc: công ty của Elon Musk và Meta
- voiceover: "Và cuộc đua chưa dừng ở đó. Công ty của Elon Musk cũng hạ phí, còn Meta vừa tung ra một sản phẩm giá mềm hồi đầu tháng tám."
- duration: 8.209s
- transition_in: push-slide UP
- status: animated
- src: compositions/frames/09-cuoc-dua.html
- type: feature_showcase
- persuasion: Causal chain
- beat: momentum
- blueprint: spatial-pan-stations
- asset_candidates: assets/shot-scroll.png — ảnh chụp dài bài báo VnExpress, dùng làm nền mờ
- focal: đường giá dốc xuống với các trạm
- roles: đường giá SVG = foreground subject · trạm "xAI (Elon Musk)" và "Meta" = foreground · ảnh bài báo = background mờ 12% · lưới = background
- sfx: whoosh-cinematic@0.2, pop@2.9, pop@4.89, ping@6.63

Adapt: giữ signature camera lướt qua các trạm trên một canvas lớn, canvas là một đường giá đi xuống theo đường chéo.
Scene 1 (0.0–2.0s): "Và cuộc đua chưa dừng ở đó" — chữ "CUỘC ĐUA" lớn hiện per-word, đường giá SVG bắt đầu tự vẽ từ trên trái đi xuống (svg-path-draw), các chip OpenAI và Anthropic nhỏ nằm sẵn trên đường như trạm đã qua.
Scene 2 (2.0–4.5s): "Công ty của Elon Musk cũng hạ phí" — camera pan xuống theo đường giá tới trạm thứ ba: chip "xAI · Elon Musk" pop lúc 2.9s, mũi tên giá giảm nhỏ cạnh nó lúc 3.84s.
Scene 3 (4.5–8.21s): "còn Meta vừa tung ra một sản phẩm giá mềm" — camera pan tiếp tới trạm thứ tư: chip "Meta" pop lúc 4.89s, nhãn "giá mềm" xanh lúc 6.63s, nhãn mono "đầu tháng 8" lúc 7.3s. Đường giá tiếp tục vẽ xuống ra khỏi khung, ngụ ý chưa dừng. Camera zoom-out nhẹ để thấy cả bốn trạm cuối khung.

## Frame 10 — Người thắng là người trả tiền

- scene: Chip các hãng AI lần lượt bị gạch, rồi dòng chữ "NGƯỜI TRẢ TIỀN" xanh đứng giữa khung
- voiceover: "Lindy rời đi vì giá. Nên người thắng cuộc đua này... không phải hãng nào cả. Mà là người trả tiền."
- duration: 5.99s
- transition_in: blur-crossfade
- status: animated
- src: compositions/frames/10-nguoi-thang.html
- type: branding
- persuasion: Callback + distillation
- beat: "now I get it"
- blueprint: kinetic-type-beats
- focal: cụm chữ "người trả tiền"
- roles: chữ "Lindy rời đi vì giá" = foreground (Scene 1) · chip hãng = supporting · "NGƯỜI TRẢ TIỀN" = foreground subject (Scene 3) · lưới = background
- sfx: pop@1.25, glitch-1@3.58, chime@5.12

Adapt: giữ signature relay 2–3 câu mỗi câu một nhịp, kết bằng spring-pop.
Scene 1 (0.0–1.9s): "Lindy rời đi vì giá" — dòng "Lindy rời đi" per-word, rồi chữ "vì giá" xanh pop lúc 1.25s. Icon cửa nhỏ (gọi lại khung 4) đóng lại.
Scene 2 (1.9–4.7s): "Nên người thắng cuộc đua này" — dòng trên co lên đỉnh. Chữ "Người thắng?" giữa khung; bốn chip hãng (OpenAI, Anthropic, xAI, Meta) xếp quanh. "không phải hãng nào cả" (3.58s) mỗi chip bị một vạch gạch đỏ quét qua và rơi mờ đi, mỗi chip cách nhau 0.12s.
Scene 3 (4.7–5.99s): "Mà là người trả tiền" — "NGƯỜI TRẢ TIỀN" cỡ gần tràn ngang, màu xanh `#2563eb`, spring-pop đúng lúc 5.12s; icon ví tiền nhỏ phía trên. Camera đẩy 4%.

## Frame 11 — Kết

- scene: Logo card kết đã duyệt: tagline "Begin a new era", URL evose.ai, lời mời follow
- voiceover: "Truy cập evose.ai để tạo ra trợ lý AI của riêng bạn."
- duration: 4.32s
- transition_in: crossfade
- status: animated
- src: compositions/frames/11-ket.html
- type: cta
- persuasion: Direct address
- beat: resolve
- blueprint: logo-assemble-lockup
- focal: logo Evose + URL
- roles: logo = foreground subject · URL = foreground · lưới = background
- sfx: sparkle@0.75

narrativeRole: Kết đúng như cảnh kết đã được Mazino duyệt.
keyMessage: Vào evose.ai để tạo trợ lý AI của riêng bạn.

Orchestrator tự dựng khung này từ `templates/evose-logo-card` (không giao worker, không áp camera chung).
