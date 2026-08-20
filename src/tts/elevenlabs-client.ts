import axios, { AxiosError } from "axios";
import { writeFile } from "node:fs/promises";
import type { TtsClient, TtsContext, TtsResult } from "./tts-client.js";

export interface ElevenLabsOpts {
  apiKey: string;
  voiceId: string;
  modelId?: string;
}

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";
const DEFAULT_MODEL = "eleven_multilingual_v2";

/** API không nhận quá 3 id trong `previous_request_ids`. */
const MAX_CHAIN_IDS = 3;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Đọc thân lỗi thành chữ. Với `responseType: "arraybuffer"` thì Node trả về
 *  Buffer, không phải ArrayBuffer — không xử riêng thì lỗi in ra mảng số. */
function readErrorBody(e: AxiosError): string | undefined {
  const data = e.response?.data;
  let raw: string;
  if (ArrayBuffer.isView(data)) {
    raw = Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString("utf8");
  } else if (typeof data === "string") {
    raw = data;
  } else if (data && typeof data === "object") {
    raw = JSON.stringify(data);
  } else {
    return undefined;
  }
  try {
    const parsed = JSON.parse(raw) as { detail?: { message?: string } | string };
    const detail = parsed.detail;
    if (typeof detail === "string") return detail;
    if (detail?.message) return detail.message;
  } catch {
    // không phải JSON — trả nguyên văn
  }
  return raw.slice(0, 300) || undefined;
}

export class ElevenLabsClient implements TtsClient {
  constructor(private cfg: ElevenLabsOpts) {}

  private get model(): string {
    return this.cfg.modelId ?? DEFAULT_MODEL;
  }

  /**
   * `eleven_v3` TỪ CHỐI mọi cơ chế nối ngữ điệu giữa các lần gọi — trả 400
   * `unsupported_model` cho cả `previous_text`/`next_text` lẫn
   * `previous_request_ids`/`next_request_ids`. Đã kiểm bằng
   * `scripts/probe-elevenlabs-stitching.ts`; chạy lại script đó khi muốn biết
   * ElevenLabs đã mở hỗ trợ chưa.
   */
  supportsRequestIdChaining(): boolean {
    return !this.model.startsWith("eleven_v3");
  }

  /**
   * `ctx` cấp ngữ cảnh để ngữ điệu nối liền giữa các cảnh. Không có nó thì mỗi
   * cảnh là một lần gọi độc lập, model tự chọn ngữ điệu mở đầu nên cao độ và
   * nhịp lệch nhau, nghe rõ ở chỗ chuyển cảnh.
   *
   * Hai mức, dùng được cùng lúc:
   *   - `previousText`/`nextText`   — cho model ĐỌC lời cảnh kề (không phát tiếng)
   *   - `previousRequestIds`        — cho model NGHE LẠI chính đoạn vừa tạo
   *
   * Mức thứ hai liên tục hơn nhưng buộc gọi tuần tự, vì phải có kết quả cảnh
   * trước mới gọi được cảnh sau.
   */
  async generate(
    text: string,
    audioOutPath: string,
    _srtOutPath?: string,
    ctx?: TtsContext,
  ): Promise<TtsResult> {
    const url = `${ELEVENLABS_BASE}/text-to-speech/${this.cfg.voiceId}`;
    const chainIds = (ctx?.previousRequestIds ?? []).slice(-MAX_CHAIN_IDS);
    const stitching = this.supportsRequestIdChaining()
      ? {
          ...(ctx?.previousText ? { previous_text: ctx.previousText } : {}),
          ...(ctx?.nextText ? { next_text: ctx.nextText } : {}),
          ...(chainIds.length > 0 ? { previous_request_ids: chainIds } : {}),
        }
      : {};
    const delays = [2000, 4000, 8000];
    let lastErr: unknown;

    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const resp = await axios.post<ArrayBuffer>(
          url,
          {
            text,
            model_id: this.model,
            voice_settings: { stability: 0.5, similarity_boost: 0.75 },
            ...stitching,
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
        const headers = resp.headers as Record<string, string | undefined>;
        return { requestId: headers["request-id"] ?? headers["x-request-id"] };
      } catch (e) {
        lastErr = e;
        const err = e as AxiosError;
        const status = err.response?.status;
        if (status === 401) throw new Error("ElevenLabs: invalid API key (401)");
        if (status !== undefined && status < 500 && status !== 429) {
          const detail = readErrorBody(err);
          throw new Error(
            `ElevenLabs TTS failed (status ${status})${detail ? `: ${detail}` : ""}`,
          );
        }
        if (attempt < delays.length) await sleep(delays[attempt]);
      }
    }
    throw lastErr;
  }
}
