import "dotenv/config";

export type TtsProvider = "omnivoice" | "elevenlabs";

export interface Config {
    ttsProvider: TtsProvider;

    // OmniVoice (local TTS server)
    omnivoiceEndpoint: string;

    // ElevenLabs (cloud TTS)
    elevenlabsApiKey: string;
    elevenlabsVoiceId: string;
    elevenlabsModelId: string;

    ttsConcurrency: number;
}

function intDefault(name: string, def: number): number {
    const v = process.env[name];
    if (!v) return def;
    const n = parseInt(v, 10);
    if (isNaN(n))
        throw new Error(`Env var ${name} must be integer, got "${v}"`);
    return n;
}

export function loadConfig(): Config {
    const provider = (process.env.TTS_PROVIDER ?? "omnivoice") as TtsProvider;
    if (provider !== "omnivoice" && provider !== "elevenlabs") {
        throw new Error(
            `TTS_PROVIDER must be "omnivoice" or "elevenlabs", got "${provider}"`,
        );
    }

    if (provider === "elevenlabs") {
        const apiKey = process.env.ELEVENLABS_API_KEY;
        if (!apiKey) throw new Error("ELEVENLABS_API_KEY is required when TTS_PROVIDER=elevenlabs");
        const voiceId = process.env.ELEVENLABS_VOICE_ID;
        if (!voiceId) throw new Error("ELEVENLABS_VOICE_ID is required when TTS_PROVIDER=elevenlabs");
    }

    return {
        ttsProvider: provider,
        omnivoiceEndpoint: process.env.OMNIVOICE_ENDPOINT ?? "http://127.0.0.1:8123",
        elevenlabsApiKey: process.env.ELEVENLABS_API_KEY ?? "",
        elevenlabsVoiceId: process.env.ELEVENLABS_VOICE_ID ?? "",
        elevenlabsModelId: process.env.ELEVENLABS_MODEL_ID ?? "eleven_multilingual_v2",
        ttsConcurrency: intDefault("TTS_CONCURRENCY", 1),
    };
}
