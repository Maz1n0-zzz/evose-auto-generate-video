/**
 * Đọc cùng một câu bằng nhiều model để nghe so.
 *
 * Dùng khi nghi model đọc sai — sai dấu thanh, sai số, sai tên riêng. Nghe là
 * cách duy nhất phân định, không có thước nào đo hộ được.
 *
 * Chạy:
 *   npx tsx scripts/compare-tts-models.ts "Cuối tháng bảy, giá giảm tám mươi phần trăm."
 *   npx tsx scripts/compare-tts-models.ts "câu cần thử" eleven_v3 eleven_multilingual_v2
 *
 * Ghi ra `output/_model-compare/<model>.mp3`. Mỗi model tốn 1 lần gọi API.
 */
import { config } from "dotenv";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { ElevenLabsClient } from "../src/tts/elevenlabs-client.js";

config({ path: ".env.local" });
config();

const DEFAULT_MODELS = ["eleven_v3", "eleven_multilingual_v2", "eleven_flash_v2_5"];
const OUT_DIR = join("output", "_model-compare");

async function main() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!apiKey) throw new Error("Thiếu ELEVENLABS_API_KEY (đặt trong .env.local)");
  if (!voiceId) throw new Error("Thiếu ELEVENLABS_VOICE_ID (đặt trong .env.local)");

  const [text, ...models] = process.argv.slice(2);
  if (!text) throw new Error('Thiếu câu cần thử. Ví dụ: npx tsx scripts/compare-tts-models.ts "tháng bảy"');
  const list = models.length > 0 ? models : DEFAULT_MODELS;

  await mkdir(OUT_DIR, { recursive: true });
  console.log(`Câu: "${text}"`);
  console.log(`Giọng: ${voiceId}\n`);

  for (const model of list) {
    const out = join(OUT_DIR, `${model}.mp3`);
    process.stdout.write(`→ ${model} ... `);
    try {
      await new ElevenLabsClient({ apiKey, voiceId, modelId: model }).generate(text, out);
      console.log(out);
    } catch (e) {
      console.log(`LỖI — ${e instanceof Error ? e.message : e}`);
    }
  }
  console.log(`\nNghe thử:  open ${OUT_DIR}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
