import axios, { AxiosError, type AxiosResponse } from "axios";
import { writeFile } from "node:fs/promises";
import type { AlignedTake, TtsClient, TtsContext, TtsResult } from "./tts-client.js";

export interface ElevenLabsOpts {
  apiKey: string;
  voiceId: string;
  modelId?: string;
}

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";
const DEFAULT_MODEL = "eleven_multilingual_v2";

/** API không nhận quá 3 id trong `previous_request_ids`. */
const MAX_CHAIN_IDS = 3;

const VOICE_SETTINGS = { stability: 0.5, similarity_boost: 0.75 };

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

interface TimestampsResponse {
  audio_base64?: string;
  alignment?: {
    characters?: string[];
    character_start_times_seconds?: number[];
    character_end_times_seconds?: number[];
  };
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
   * Chỉ `eleven_v3` hiểu thẻ cảm xúc như chỉ dẫn diễn xuất. Dòng v2 sẽ ĐỌC TO
   * chữ trong ngoặc, nên gửi thẻ cho v2 là hỏng lời đọc.
   *
   * Đúng ngược chiều với `supportsRequestIdChaining` — đây chính là cái giá
   * phải trả khi đổi v3 sang v2 để lấy khả năng nối ngữ điệu.
   */
  supportsAudioTags(): boolean {
    return this.model.startsWith("eleven_v3");
  }

  /** Gọi API kèm thử lại. Lỗi 4xx là lỗi mình gửi sai, thử lại vô ích. */
  private async post<T>(
    path: string,
    body: Record<string, unknown>,
    responseType: "arraybuffer" | "json",
  ): Promise<AxiosResponse<T>> {
    const url = `${ELEVENLABS_BASE}/text-to-speech/${this.cfg.voiceId}${path}`;
    const delays = [2000, 4000, 8000];
    let lastErr: unknown;

    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        return await axios.post<T>(url, body, {
          headers: {
            "xi-api-key": this.cfg.apiKey,
            "Content-Type": "application/json",
            Accept: responseType === "json" ? "application/json" : "audio/mpeg",
          },
          responseType,
          timeout: 120000,
        });
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

  /**
   * `ctx` cấp ngữ cảnh để ngữ điệu nối liền giữa các cảnh. Không có nó thì mỗi
   * cảnh là một lần gọi độc lập, model tự chọn ngữ điệu mở đầu nên cao độ và
   * nhịp lệch nhau, nghe rõ ở chỗ chuyển cảnh.
   *
   * Hai mức, dùng được cùng lúc:
   *   - `previousText`/`nextText`   — cho model ĐỌC lời cảnh kề (không phát tiếng)
   *   - `previousRequestIds`        — cho model NGHE LẠI chính đoạn vừa tạo
   *
   * Model nào từ chối cả hai (v3) thì dùng `generateAlignedTake` thay thế.
   */
  async generate(
    text: string,
    audioOutPath: string,
    _srtOutPath?: string,
    ctx?: TtsContext,
  ): Promise<TtsResult> {
    const chainIds = (ctx?.previousRequestIds ?? []).slice(-MAX_CHAIN_IDS);
    const stitching = this.supportsRequestIdChaining()
      ? {
          ...(ctx?.previousText ? { previous_text: ctx.previousText } : {}),
          ...(ctx?.nextText ? { next_text: ctx.nextText } : {}),
          ...(chainIds.length > 0 ? { previous_request_ids: chainIds } : {}),
        }
      : {};

    const resp = await this.post<ArrayBuffer>(
      "",
      { text, model_id: this.model, voice_settings: VOICE_SETTINGS, ...stitching },
      "arraybuffer",
    );
    await writeFile(audioOutPath, Buffer.from(resp.data));
    const headers = resp.headers as Record<string, string | undefined>;
    return { requestId: headers["request-id"] ?? headers["x-request-id"] };
  }

  /**
   * Đọc cả bài một lần, trả kèm mốc thời gian từng ký tự.
   *
   * Bảng mốc PHẢI khớp 1:1 với chuỗi gửi đi — cả sơ đồ cắt theo cảnh dựa vào
   * đó. Lệch một ký tự là cắt vào giữa từ, mà lại lệch âm thầm, nên kiểm ngay
   * ở đây và ném lỗi thay vì để pipeline cho ra file hỏng.
   */
  async generateAlignedTake(text: string): Promise<AlignedTake> {
    const resp = await this.post<TimestampsResponse>(
      "/with-timestamps",
      { text, model_id: this.model, voice_settings: VOICE_SETTINGS },
      "json",
    );
    const { audio_base64: audioB64, alignment } = resp.data;
    if (!audioB64) throw new Error("ElevenLabs: phản hồi thiếu audio_base64");

    const chars = alignment?.characters;
    const startSec = alignment?.character_start_times_seconds;
    const endSec = alignment?.character_end_times_seconds;
    if (!chars || !startSec || !endSec) {
      throw new Error("ElevenLabs: phản hồi thiếu bảng alignment");
    }
    if (chars.join("") !== text) {
      throw new Error(
        `ElevenLabs: bảng alignment không khớp lời gửi đi ` +
          `(gửi ${text.length} ký tự, nhận ${chars.length}) — không cắt theo cảnh được`,
      );
    }

    return {
      audio: Buffer.from(audioB64, "base64"),
      charStartSec: startSec,
      charEndSec: endSec,
    };
  }
}
