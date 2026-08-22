# Khắc phục giọng ElevenLabs v3 lệch ngữ điệu giữa các đoạn

> Bản tóm lược để chuyển sang dự án khác. Tự chứa — không cần đọc code của repo
> này. Mọi kết luận dưới đây đều đã kiểm bằng API thật, không phải suy đoán.
>
> Đúc kết từ `Maz1n0-zzz/evose-auto-generate-video`, bản 2.1.0 (2026-08-20).

## Triệu chứng

Cắt lời thành nhiều đoạn, gọi TTS riêng cho từng đoạn, rồi nối lại. Cùng một
`voice_id`, cùng model, nhưng **cao độ và nhịp lệch nhau giữa các đoạn** — nghe
rõ nhất ngay chỗ nối. Đoạn thì cao vống, đoạn thì trầm xuống, như hai người đọc.

## Nguyên nhân

Mỗi lần gọi API là một lần sinh độc lập. Model không biết đoạn trước đọc thế
nào nên **tự chọn lại ngữ điệu mở đầu** mỗi lần. `eleven_v3` biểu cảm mạnh nên
độ lệch càng lộ.

Đây **không phải** lỗi âm lượng. Đo 12 đoạn thật thì độ to chỉ chênh 1.43 dB —
dưới ngưỡng tai nghe ra. Đừng mất công đi chuẩn hoá âm lượng để chữa cái này,
sai bệnh.

## Ba cách KHÔNG dùng được với v3 — đừng thử lại

| Cách | Kết quả với `eleven_v3` |
|---|---|
| `previous_text` / `next_text` | **400** |
| `previous_request_ids` / `next_request_ids` | **400 `unsupported_model`** |
| Đổi sang model khác | mất chất giọng, xem bảng dưới |

Nguyên văn lỗi API:

```
Providing previous_request_ids or next_request_ids is not yet supported
with the 'eleven_v3' model.
```

Hai tham số này **dùng được với dòng v2** (`multilingual_v2`, `flash_v2_5`,
`turbo_v2_5`). Nếu dự án của bạn chấp nhận v2 thì đó là đường ngắn nhất: bắt
`request-id` từ header phản hồi, gửi kèm tối đa 3 id gần nhất ở lần gọi sau,
và **buộc gọi tuần tự**.

Nhưng với **tiếng Việt** thì đã nghe so và loại cả hai:

| Model | Nối ngữ điệu | Chất giọng tiếng Việt |
|---|---|---|
| `eleven_v3` | ❌ | ✅ tốt nhất |
| `eleven_multilingual_v2` | ✅ | ❌ như người nước ngoài tập nói |
| `eleven_flash_v2_5` | ✅ | ❌ nuốt dấu thanh — "tháng bảy" → "tháng bay" |

Tự kiểm trên giọng của bạn trước khi tin bảng này: đọc cùng một câu bằng cả ba
model rồi nghe.

## Cách dùng được: đọc MỘT LẦN cả bài rồi cắt

Bỏ hẳn việc gọi riêng từng đoạn. Nối toàn bộ lời thành một chuỗi, gọi **một
lần** vào endpoint có timestamp, rồi cắt ra từng đoạn theo mốc thời gian.

Cả bài là một mạch đọc liền nên **không còn chỗ nào để lệch** — không phải giảm
thiểu, mà là loại bỏ nguyên nhân.

### Vì sao cắt được chính xác

`POST /v1/text-to-speech/{voice_id}/with-timestamps` trả về:

```json
{
  "audio_base64": "...",
  "alignment": {
    "characters": ["[", "e", "x", ...],
    "character_start_times_seconds": [0.0, 0.02, ...],
    "character_end_times_seconds":   [0.02, 0.02, ...]
  }
}
```

`alignment.characters` **khớp 1:1 với đúng chuỗi gửi đi** — kể cả thẻ cảm xúc
`[excited]` (chiếm ký tự nhưng gần như không tốn thời gian). Biết đoạn nào nằm
ở khoảng ký tự nào thì tra ra ngay khoảng giây tương ứng. Ánh xạ thuần, không
phải đoán.

**Bắt buộc kiểm:** `alignment.characters.join("") === text`. Lệch một ký tự là
cắt vào giữa từ, mà lại lệch âm thầm. Không khớp thì ném lỗi ngay, đừng cắt.

### Các bước

```
1. Nối lời các đoạn, ngăn bằng "\n\n", ghi lại vị trí ký tự [lo, hi] của từng đoạn
2. Gọi /with-timestamps một lần
3. Kiểm alignment khớp 1:1 với chuỗi đã gửi
4. Đổi [lo, hi] → [giây bắt đầu, giây kết thúc]
5. Cắt file audio theo từng khoảng bằng ffmpeg
```

### Code mẫu

```ts
const SEPARATOR = "\n\n";
const EDGE_PAD_SEC = 0.12;

/** Nối lời và ghi lại vị trí ký tự từng đoạn. */
function joinTake(segments: { id: string; text: string }[]) {
  const spans: { id: string; lo: number; hi: number }[] = [];
  let text = "";
  for (const seg of segments) {
    if (text.length > 0) text += SEPARATOR;
    const lo = text.length;
    text += seg.text;
    spans.push({ id: seg.id, lo, hi: text.length - 1 });
  }
  return { text, spans };
}

/** Gọi API, kiểm alignment, trả audio + bảng mốc. */
async function generateAlignedTake(text: string, apiKey: string, voiceId: string) {
  const r = await axios.post(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps`,
    { text, model_id: "eleven_v3", voice_settings: { stability: 0.5, similarity_boost: 0.75 } },
    { headers: { "xi-api-key": apiKey, "Content-Type": "application/json" }, timeout: 120000 },
  );
  const a = r.data.alignment;
  if (!a?.characters) throw new Error("phản hồi thiếu bảng alignment");
  if (a.characters.join("") !== text) {
    throw new Error("alignment không khớp lời gửi đi — không cắt được");
  }
  return {
    audio: Buffer.from(r.data.audio_base64, "base64"),
    charStartSec: a.character_start_times_seconds as number[],
    charEndSec: a.character_end_times_seconds as number[],
  };
}

/** Vị trí ký tự → khoảng thời gian cắt. */
function sliceRanges(
  spans: { id: string; lo: number; hi: number }[],
  charStartSec: number[],
  charEndSec: number[],
) {
  const speech = spans.map((s) => ({
    id: s.id,
    start: charStartSec[s.lo],
    end: charEndSec[s.hi],
  }));
  const n = speech.length;
  // Ranh giới giữa đoạn i-1 và i — nơi hai đoạn không được lấn qua.
  const divide = (i: number) => {
    const prevEnd = speech[i - 1].end;
    const curStart = speech[i].start;
    return curStart > prevEnd ? (prevEnd + curStart) / 2 : curStart;
  };
  return speech.map((s, i) => ({
    id: s.id,
    startSec: i === 0 ? Math.max(0, s.start - EDGE_PAD_SEC)
                      : Math.max(s.start - EDGE_PAD_SEC, divide(i)),
    endSec: i === n - 1 ? s.end + EDGE_PAD_SEC
                        : Math.min(s.end + EDGE_PAD_SEC, divide(i + 1)),
  }));
}
```

Cắt bằng ffmpeg — **`-ss` phải đặt SAU `-i`** để tua chính xác tới mẫu, đặt
trước thì nhảy theo khung và hụt chữ:

```bash
ffmpeg -y -i take.mp3 -ss 12.340 -to 20.780 \
  -c:a libmp3lame -b:a 192k -ar 44100 -ac 1 doan-3.mp3
```

## Ba cái bẫy — cái nào cũng đã dính thật

### Bẫy 1 — phải GỌT quãng nghỉ, không thì video phình ra

Đọc liền mạch thì model **tự chèn quãng nghỉ khá dài** giữa các đoạn (đo được
~0.48s ở ký tự `\n\n`). Nếu cắt ở chính giữa quãng nghỉ, mỗi đoạn ôm một nửa,
rồi pipeline lại cộng thêm khoảng nghỉ riêng — cộng dồn thành đội hơn một giây
mỗi chỗ chuyển.

Số thật: cắt giữa quãng nghỉ cho ra video **110.26s**, gọt còn chừa 0.12s hai
đầu cho ra **103.68s**. Bản gọi riêng từng đoạn là 96.78s.

Đó là lý do `sliceRanges` ở trên chỉ chừa `EDGE_PAD_SEC` chứ không lấy trọn.
Khoảng cách giữa các đoạn do **bạn** quyết, không phải model.

### Bẫy 2 — v3 thỉnh thoảng ĐỌC TO thẻ cảm xúc

`eleven_v3` có lúc phát `[curious]` thành tiếng thay vì hiểu là chỉ dẫn diễn
xuất. Nghe ra kiểu "CU Arius" ngay đầu video.

Cùng một chuỗi đầu vào chạy bốn lần thì **trượt một lần**. Không tránh được
bằng cách viết lời khác, và không phải do `voice_settings` (đã loại trừ bằng
thực nghiệm).

Đọc một lần cả bài làm chuyện này nguy hiểm hơn hẳn: trước đây một lần trượt
chỉ hỏng một đoạn, nay **hỏng nguyên video**. Nên bắt buộc phải chặn.

Cách nhận biết, **không tốn thêm lần gọi API nào** vì dữ liệu có sẵn trong
phản hồi: thẻ bị đọc thì mỗi chữ cái tốn thời gian như chữ thường; thẻ hiểu
đúng thì cả thẻ gộp lại chỉ tốn một khoảnh khắc, dài bao nhiêu chữ cũng vậy.

```ts
const SPOKEN_TAG_SEC_PER_CHAR = 0.12;
const SPOKEN_TAG_MIN_SEC = 0.4;

function findSpokenTags(text: string, charStartSec: number[], charEndSec: number[]) {
  const spoken: { literal: string; durationSec: number }[] = [];
  const TAG = /\[[a-zA-Z][a-zA-Z ]{1,23}\]/g;
  let m: RegExpExecArray | null;
  while ((m = TAG.exec(text)) !== null) {
    const last = m.index + m[0].length - 1;
    if (last >= charEndSec.length) continue;
    const durationSec = charEndSec[last] - charStartSec[m.index];
    if (durationSec >= SPOKEN_TAG_MIN_SEC &&
        durationSec / m[0].length > SPOKEN_TAG_SEC_PER_CHAR) {
      spoken.push({ literal: m[0], durationSec });
    }
  }
  return spoken;
}
```

Số đo thật để hiệu chỉnh ngưỡng (giây trên mỗi ký tự):

```
hiểu đúng : [curious] 0.007–0.036 | [warm] 0.040 | [excited] 0.041
            [thoughtful] 0.043 | [sighs] 0.069   ← cao nhất
bị đọc to : [curious] 0.164 và 0.23              ← hai lần gặp thật
```

⚠️ **Đừng dùng TỔNG thời lượng làm thước.** `[sighs]` tốn 0.48s vì nó thở dài
THẬT — dài hơn cả `[curious]` bị đọc to khi chia đều ra từng ký tự. Tôi đã thử
thước đó trước và nó cho kết quả sai. Phải chia cho số ký tự.

Bắt được thì **đọc lại**, tối đa 2 lượt. Vẫn hỏng thì **bỏ hẳn thẻ rồi đọc
lại** — không còn thẻ thì không còn gì để đọc nhầm. Thà mất biểu cảm còn hơn
giao video lỗi.

### Bẫy 3 — `amix` của ffmpeg âm thầm hạ 6 dB

Không liên quan ngữ điệu nhưng cùng nằm ở khâu âm thanh, và rất dễ bỏ sót.

`amix` **mặc định chia biên độ cho số input**. Trộn giọng với nhạc nền mà quên
`normalize=0` là hạ **cả hai** đi 6.02 dB. File giao đi nhỏ tiếng hơn hẳn track
giọng gốc mà không có gì báo.

```bash
# SAI — mất 6 dB
amix=inputs=2:duration=first:dropout_transition=0

# ĐÚNG
amix=inputs=2:duration=first:dropout_transition=0:normalize=0
```

Nhớ thêm `alimiter` sau khi trộn để đỉnh cộng dồn không vượt trần:

```
[vm][md]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[amx];
[amx]alimiter=limit=0.891:level=0[ao]
```

## Kèm thêm: chuẩn hoá âm lượng cho đúng cách

Nếu dự án của bạn có đoạn nào lệch to nhỏ thật (khác với chuyện ngữ điệu ở
trên), thì chuẩn hoá thế này:

- Đo `loudnorm` từng file, áp **gain tĩnh** đưa về mức đích (−16 LUFS hợp cho
  tiếng nói trên mạng xã hội).
- **Đừng chạy `loudnorm` để ghi đè** — nó nén dải động và làm giọng nghe bẹt.
  Việc cần làm là kéo các đoạn ngang nhau, không phải nén bên trong từng đoạn.
- Giọng đọc có đỉnh nhọn hơn mức trung bình **18–20 dB**. Nếu bắt riêng đỉnh
  phải nằm dưới trần thì gain bị chặn còn 2–3 dB, không đoạn nào lên nổi mức
  đích. Phải **kéo đủ tay rồi hãm riêng phần đỉnh** bằng `alimiter` — đúng cách
  các bộ chuẩn hoá phát thanh vẫn làm. Chặn cho bộ hãm không phải làm quá 6 dB.

## Cái phải đánh đổi

**Mất khả năng sinh lại riêng một đoạn.** Sửa một chữ ở đoạn 7 là phải đọc lại
cả bài — đọc bù riêng một đoạn thì rơi đúng vào chỗ ngữ điệu sẽ lệch, tức phá
đúng thứ vừa sửa. Với bài ~1600 ký tự thì đó là **một** lần gọi API nên không
đắt hơn, nhưng cơ chế cache theo từng đoạn phải bỏ, thay bằng cache theo vân
tay của toàn bộ lời.

**Nhịp đọc chậm hơn ~7%.** Model đọc có nhịp hơn khi liền mạch. Muốn kéo về
nhịp cũ thì thêm `speed` vào `voice_settings` (ElevenLabs cho 0.7–1.2).

**Giới hạn độ dài.** `eleven_v3` nhận khoảng 3000 ký tự một lần gọi. Đặt ngưỡng
an toàn ~2900 (ký tự ngăn cũng tính vào); dài hơn thì hoặc chia thành vài lần
đọc lớn, hoặc chấp nhận quay về gọi từng đoạn.

## Cách tự kiểm lại trên dự án của bạn

Đừng tin bảng nào ở trên mà không kiểm — ElevenLabs có thể đã đổi. Gọi thử:

1. **v3 còn chặn nối không:** gọi bình thường lấy `request-id` từ header, rồi
   gọi lần hai kèm `previous_request_ids: [id]`. Trả 400 là còn chặn.
2. **`/with-timestamps` có chạy không:** gọi thử, xem `alignment.characters`
   có khớp 1:1 với chuỗi gửi đi không.
3. **Model nào đọc đúng tiếng Việt:** đọc cùng một câu có dấu thanh khó
   ("tháng bảy", "chỉ có thế") bằng cả ba model rồi nghe.

Mỗi mục tốn 1–2 lần gọi API, không cần ghi file.
