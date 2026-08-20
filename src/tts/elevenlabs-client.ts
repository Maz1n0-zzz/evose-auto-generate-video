import axios, { AxiosError } from "axios";
import { writeFile } from "node:fs/promises";
import type { TtsClient } from "./tts-client.js";

export interface ElevenLabsOpts {
  apiKey: string;
  voiceId: string;
  modelId?: string;
}

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";
const DEFAULT_MODEL = "eleven_multilingual_v2";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class ElevenLabsClient implements TtsClient {
  constructor(private cfg: ElevenLabsOpts) {}

  /**
   * `ctx` cấp lời của cảnh liền trước và liền sau. Không có nó thì mỗi cảnh là
   * một lần gọi độc lập, model tự chọn ngữ điệu mở đầu nên cao độ và nhịp lệch
   * nhau nghe rõ ở chỗ chuyển cảnh. Hai trường này chỉ để model biết mạch câu,
   * KHÔNG được đọc thành tiếng.
   */
  async generate(
    text: string,
    audioOutPath: string,
    _srtOutPath?: string,
    ctx?: { previousText?: string; nextText?: string },
  ): Promise<void> {
    const url = `${ELEVENLABS_BASE}/text-to-speech/${this.cfg.voiceId}`;
    const model = this.cfg.modelId ?? DEFAULT_MODEL;
    const supportsStitching = !model.startsWith("eleven_v3");
    const delays = [2000, 4000, 8000];
    let lastErr: unknown;

    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const resp = await axios.post<ArrayBuffer>(
          url,
          {
            text,
            model_id: this.cfg.modelId ?? DEFAULT_MODEL,
            voice_settings: { stability: 0.5, similarity_boost: 0.75 },
            // eleven_v3 TRẢ VỀ 400 khi có previous_text/next_text — đã thử và
            // xác nhận. Hai tham số này chỉ dùng được với dòng v2
            // (multilingual_v2, flash_v2_5, turbo_v2_5). Với v3 thì bỏ qua,
            // chấp nhận ngữ điệu lệch nhẹ giữa các cảnh.
            ...(supportsStitching ? {
              ...(ctx?.previousText ? { previous_text: ctx.previousText } : {}),
              ...(ctx?.nextText ? { next_text: ctx.nextText } : {}),
            } : {}),
          },
          {
            headers: {
              "xi-api-key": this.cfg.apiKey,
              "Content-Type": "application/json",
              Accept: "audio/mpeg",
            },
            responseType: "arraybuffer",
            timeout: 60000,
          },
        );
        await writeFile(audioOutPath, Buffer.from(resp.data));
        return;
      } catch (e) {
        lastErr = e;
        const status = (e as AxiosError).response?.status;
        if (status === 401) throw new Error("ElevenLabs: invalid API key (401)");
        if (status === 422) throw new Error("ElevenLabs: invalid voice_id or request (422)");
        if (status !== undefined && status < 500 && status !== 429) {
          throw new Error(`ElevenLabs TTS failed (status ${status})`);
        }
        if (attempt < delays.length) await sleep(delays[attempt]);
      }
    }
    throw lastErr;
  }
}
