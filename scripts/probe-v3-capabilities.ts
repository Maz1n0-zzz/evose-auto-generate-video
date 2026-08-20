/**
 * Thăm dò: `eleven_v3` cho dùng những gì để giữ ngữ điệu đều giữa các cảnh.
 *
 * v3 đã chặn cả hai cơ chế nối chính thức (xem
 * `probe-elevenlabs-stitching.ts`). Script này kiểm ba đường vòng còn lại:
 *
 *   1. `stability` cao      — bớt biến thiên biểu cảm giữa các lần gọi
 *   2. `seed` cố định       — cùng seed thì bớt ngẫu nhiên
 *   3. endpoint có timestamp — để đọc MỘT LẦN rồi cắt theo cảnh
 *
 * Chạy:  npx tsx scripts/probe-v3-capabilities.ts [model]
 *
 * Mỗi mục 1 lần gọi API, không ghi file âm thanh.
 */
import axios, { AxiosError } from "axios";
import { config } from "dotenv";

config({ path: ".env.local" });
config();

const BASE = "https://api.elevenlabs.io/v1";
const TEXT = "Cuối tháng bảy, giá giảm tám mươi phần trăm.";

function errorBody(e: AxiosError): string {
  const data = e.response?.data;
  let raw: string;
  if (ArrayBuffer.isView(data)) {
    raw = Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString("utf8");
  } else if (typeof data === "string") raw = data;
  else if (data) raw = JSON.stringify(data);
  else return e.message;
  try {
    const p = JSON.parse(raw) as { detail?: { message?: string } | string };
    const d = p.detail;
    if (typeof d === "string") return d;
    if (d?.message) return d.message;
  } catch { /* không phải JSON */ }
  return raw.slice(0, 300);
}

async function probe(
  label: string,
  apiKey: string,
  voiceId: string,
  path: string,
  body: Record<string, unknown>,
  inspect?: (data: unknown) => string,
) {
  process.stdout.write(`→ ${label} ... `);
  try {
    const resp = await axios.post(`${BASE}/text-to-speech/${voiceId}${path}`, body, {
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
      // Endpoint timestamp trả JSON; endpoint thường trả bytes.
      responseType: path.includes("timestamps") ? "json" : "arraybuffer",
      timeout: 60000,
    });
    console.log(`NHẬN${inspect ? ` — ${inspect(resp.data)}` : ""}`);
    return true;
  } catch (e) {
    const err = e as AxiosError;
    console.log(`TỪ CHỐI (${err.response?.status ?? "?"}) — ${errorBody(err)}`);
    return false;
  }
}

async function main() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!apiKey) throw new Error("Thiếu ELEVENLABS_API_KEY");
  if (!voiceId) throw new Error("Thiếu ELEVENLABS_VOICE_ID");
  const model = process.argv[2] ?? "eleven_v3";

  console.log(`Model: ${model}\nGiọng: ${voiceId}\n`);
  const base = { text: TEXT, model_id: model };

  await probe("stability 1.0 (Robust)", apiKey, voiceId, "", {
    ...base,
    voice_settings: { stability: 1.0, similarity_boost: 0.75 },
  });

  await probe("seed cố định", apiKey, voiceId, "", { ...base, seed: 12345 });

  await probe("endpoint /with-timestamps", apiKey, voiceId, "/with-timestamps", base, (d) => {
    const data = d as { alignment?: { characters?: unknown[] } };
    const chars = data?.alignment?.characters;
    return Array.isArray(chars)
      ? `có alignment, ${chars.length} ký tự — CẮT THEO CẢNH ĐƯỢC`
      : `KHÔNG có alignment: ${Object.keys(data ?? {}).join(", ")}`;
  });
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
