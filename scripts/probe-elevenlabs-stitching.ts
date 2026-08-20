/**
 * Thăm dò: ElevenLabs có cho nối ngữ điệu giữa các lần gọi không, và với model
 * nào.
 *
 * Bối cảnh: mỗi cảnh trong pipeline là một lần gọi API riêng, model không biết
 * mạch câu nên tự chọn ngữ điệu mở đầu mỗi lần → cao độ và nhịp lệch nhau, nghe
 * rõ ở chỗ chuyển cảnh. ElevenLabs có hai cơ chế nối:
 *
 *   - `previous_text` / `next_text`     — cho model ĐỌC lời cảnh kề (không phát ra tiếng)
 *   - `previous_request_ids` / `next_request_ids` — cho model NGHE LẠI đoạn vừa tạo
 *
 * Cách thứ hai liên tục hơn nhưng buộc phải chạy tuần tự. Đã biết chắc
 * `previous_text` trả 400 với `eleven_v3`; script này kiểm cách thứ hai.
 *
 * Chạy:
 *   npx tsx scripts/probe-elevenlabs-stitching.ts             # model trong .env.local
 *   npx tsx scripts/probe-elevenlabs-stitching.ts eleven_v3 eleven_flash_v2_5
 *
 * KHÔNG ghi file âm thanh — chỉ đọc mã trạng thái. Mỗi model tốn 2 lần gọi API.
 */
import axios, { AxiosError } from "axios";
import { config } from "dotenv";

config({ path: ".env.local" });
config();

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";

/** Hai câu liền mạch — câu sau nối ý câu trước, đúng tình huống pipeline gặp. */
const TEXT_A = "Trí tuệ nhân tạo đang thay đổi cách chúng ta làm việc.";
const TEXT_B = "Nhưng đằng sau đó là một câu hỏi ít ai đặt ra.";

interface ProbeResult {
  readonly model: string;
  readonly requestIdHeader?: string;
  readonly stitchStatus: number | "ok";
  readonly detail: string;
}

function errorBody(e: AxiosError): string {
  const data = e.response?.data;
  // `responseType: "arraybuffer"` ở Node trả về Buffer (một Uint8Array), KHÔNG
  // phải ArrayBuffer — kiểm nhầm kiểu thì thân lỗi in ra thành mảng số vô nghĩa.
  if (ArrayBuffer.isView(data)) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString("utf8").slice(0, 400);
  }
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString("utf8").slice(0, 400);
  if (typeof data === "string") return data.slice(0, 400);
  if (data) return JSON.stringify(data).slice(0, 400);
  return e.message;
}

async function speak(
  apiKey: string,
  voiceId: string,
  model: string,
  text: string,
  extra: Record<string, unknown> = {},
) {
  return axios.post<ArrayBuffer>(
    `${ELEVENLABS_BASE}/text-to-speech/${voiceId}`,
    {
      text,
      model_id: model,
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      ...extra,
    },
    {
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      responseType: "arraybuffer",
      timeout: 60000,
    },
  );
}

async function probeModel(apiKey: string, voiceId: string, model: string): Promise<ProbeResult> {
  // Lần 1 — gọi bình thường, mục đích là lấy request-id từ header phản hồi.
  let requestId: string | undefined;
  try {
    const resp = await speak(apiKey, voiceId, model, TEXT_A);
    // ElevenLabs trả id ở `request-id`; thử vài biến thể phòng khi đổi tên.
    const h = resp.headers as Record<string, string>;
    requestId = h["request-id"] ?? h["x-request-id"] ?? h["request_id"];
    if (!requestId) {
      const seen = Object.keys(h).join(", ");
      return {
        model,
        stitchStatus: "ok",
        detail: `Gọi được nhưng KHÔNG thấy request-id trong header. Header có: ${seen}`,
      };
    }
  } catch (e) {
    return {
      model,
      stitchStatus: (e as AxiosError).response?.status ?? -1,
      detail: `Lần gọi ĐẦU đã lỗi (chưa tới bước nối): ${errorBody(e as AxiosError)}`,
    };
  }

  // Lần 2 — gửi kèm id của lần 1. Đây là điều thật sự cần biết.
  try {
    await speak(apiKey, voiceId, model, TEXT_B, { previous_request_ids: [requestId] });
    return {
      model,
      requestIdHeader: requestId,
      stitchStatus: "ok",
      detail: "NHẬN previous_request_ids — dùng được để nối ngữ điệu.",
    };
  } catch (e) {
    const err = e as AxiosError;
    return {
      model,
      requestIdHeader: requestId,
      stitchStatus: err.response?.status ?? -1,
      detail: errorBody(err),
    };
  }
}

async function main() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!apiKey) throw new Error("Thiếu ELEVENLABS_API_KEY (đặt trong .env.local)");
  if (!voiceId) throw new Error("Thiếu ELEVENLABS_VOICE_ID (đặt trong .env.local)");

  const models = process.argv.slice(2);
  if (models.length === 0) {
    models.push(process.env.ELEVENLABS_MODEL_ID ?? "eleven_multilingual_v2");
  }

  console.log(`Giọng: ${voiceId}`);
  console.log(`Model kiểm: ${models.join(", ")}\n`);

  for (const model of models) {
    process.stdout.write(`→ ${model} ... `);
    const r = await probeModel(apiKey, voiceId, model);
    const verdict = r.stitchStatus === "ok" ? "NHẬN" : `TỪ CHỐI (${r.stitchStatus})`;
    console.log(verdict);
    if (r.requestIdHeader) console.log(`   request-id lần 1: ${r.requestIdHeader}`);
    console.log(`   ${r.detail}\n`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
