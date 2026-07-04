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

  async generate(text: string, audioOutPath: string, _srtOutPath?: string): Promise<void> {
    const url = `${ELEVENLABS_BASE}/text-to-speech/${this.cfg.voiceId}`;
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
