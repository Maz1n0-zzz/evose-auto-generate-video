import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig } from "./config.js";

const ENV_KEYS = ["TTS_PROVIDER", "OMNIVOICE_ENDPOINT", "TTS_CONCURRENCY", "ELEVENLABS_API_KEY", "ELEVENLABS_VOICE_ID"];

describe("loadConfig", () => {
  let saved: Record<string, string | undefined>;

  beforeEach(() => {
    saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
    ENV_KEYS.forEach((k) => delete process.env[k]);
  });

  afterEach(() => {
    Object.entries(saved).forEach(([k, v]) => {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    });
  });

  it("mặc định dùng ElevenLabs, thiếu key thì báo rõ tên biến", () => {
    // OmniVoice không còn trên máy nào. Mặc định về nó thì máy thiếu
    // TTS_PROVIDER sẽ đi gọi một server không tồn tại.
    expect(() => loadConfig()).toThrow(/ELEVENLABS_API_KEY/);
  });

  it("mặc định dùng ElevenLabs khi đủ key", () => {
    process.env.ELEVENLABS_API_KEY = "k";
    process.env.ELEVENLABS_VOICE_ID = "v";
    const cfg = loadConfig();
    expect(cfg.ttsProvider).toBe("elevenlabs");
    expect(cfg.ttsConcurrency).toBe(1);
  });

  it("vẫn chọn được omnivoice khi đặt rõ", () => {
    process.env.TTS_PROVIDER = "omnivoice";
    process.env.OMNIVOICE_ENDPOINT = "http://localhost:9000";
    const cfg = loadConfig();
    expect(cfg.ttsProvider).toBe("omnivoice");
    expect(cfg.omnivoiceEndpoint).toBe("http://localhost:9000");
  });

  it("từ chối provider lạ", () => {
    process.env.TTS_PROVIDER = "azure";
    expect(() => loadConfig()).toThrow(/TTS_PROVIDER/);
  });
});
