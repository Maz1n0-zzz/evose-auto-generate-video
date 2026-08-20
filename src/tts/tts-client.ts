/**
 * Ngữ cảnh giúp giọng đọc nối liền giữa các cảnh. Provider nào không hỗ trợ thì
 * bỏ qua, không báo lỗi.
 */
export interface TtsContext {
  /** Lời cảnh liền trước — model đọc để biết mạch câu, KHÔNG phát thành tiếng. */
  previousText?: string;
  /** Lời cảnh liền sau, cùng mục đích. */
  nextText?: string;
  /**
   * Id của những lần gọi trước, cũ nhất trước, mới nhất sau. Cho model nghe lại
   * chính đoạn vừa tạo — liên tục hơn `previousText` nhưng buộc gọi tuần tự.
   * Provider tự cắt cho vừa giới hạn của nó.
   */
  previousRequestIds?: string[];
}

export interface TtsResult {
  /** Id lần gọi này, để cảnh sau nối tiếp qua `previousRequestIds`. Provider
   *  không cấp id thì bỏ trống. */
  requestId?: string;
}

/**
 * Common TTS client interface. Giữ interface để phần điều phối pipeline không
 * dính vào chi tiết của provider.
 */
export interface TtsClient {
  /**
   * Generate speech audio for `text` and write to `audioOutPath` (mp3 or wav).
   * If `srtOutPath` is provided AND the provider supports subtitles,
   * write the SRT to that path. Otherwise silently skip.
   */
  generate(
    text: string,
    audioOutPath: string,
    srtOutPath?: string,
    ctx?: TtsContext,
  ): Promise<TtsResult>;

  /**
   * Provider có nối được ngữ điệu qua `previousRequestIds` với cấu hình hiện
   * tại không. Pipeline dựa vào đây để quyết định có buộc gọi tuần tự hay
   * không — nối kiểu này chỉ đúng khi các cảnh chạy lần lượt.
   */
  supportsRequestIdChaining?(): boolean;

  /**
   * Có hiểu thẻ cảm xúc (`[excited]`) như chỉ dẫn diễn xuất không. Không hiểu
   * thì phải bỏ thẻ trước khi gửi, nếu không máy sẽ ĐỌC TO chữ trong ngoặc.
   * Đây là chuyện của từng MODEL chứ không phải từng provider.
   */
  supportsAudioTags?(): boolean;
}

import type { Config } from "../config.js";
import { OmniVoiceClient } from "./omnivoice-client.js";
import { ElevenLabsClient } from "./elevenlabs-client.js";

export function createTtsClient(cfg: Config): TtsClient {
  if (cfg.ttsProvider === "elevenlabs") {
    return new ElevenLabsClient({
      apiKey: cfg.elevenlabsApiKey,
      voiceId: cfg.elevenlabsVoiceId,
      modelId: cfg.elevenlabsModelId,
    });
  }
  return new OmniVoiceClient({ endpoint: cfg.omnivoiceEndpoint });
}
