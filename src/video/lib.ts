/**
 * Phần dùng chung cho quy trình làm video (một composition HyperFrames).
 *
 * Quy trình: Claude viết SCRIPT.md + STORYBOARD.md, các lệnh `npm run video:*`
 * lo phần máy làm (giọng, nhạc, SFX, ghép, render, phủ logo, đo). Xem
 * `.claude/skills/create-video/SKILL.md`.
 */

import { spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { z } from "zod";

export const REPO_ROOT = resolve(import.meta.dirname, "..", "..");
export const TEMPLATE_DIR = join(REPO_ROOT, "template");
export const SFX_LIB_DIR = join(REPO_ROOT, "assets", "sfx");
export const OVERLAY_PNG = join(REPO_ROOT, "evose-brand-kit", "overlays", "overlay-frame-light.png");

/**
 * Overlay phủ lên video. Thư mục video có `brand/overlay.png` riêng thì dùng cái đó
 * (bộ nhận diện khách), không có thì về bộ Evose mặc định.
 */
export function overlayPng(dir: string): string {
  const own = join(dir, "brand", "overlay.png");
  return existsSync(own) ? own : OVERLAY_PNG;
}

/**
 * Thư mục video đã lắp một bộ nhận diện riêng chưa.
 *
 * Mốc nhận biết là `brand/rules.md`, vì đó là file `packets.ts` bắt buộc phải có để
 * không rơi về luật Evose. Đã lắp brand thì các mảnh còn lại phải đủ — xem
 * `assertBrandComplete`. Chưa lắp thì mọi thứ về bộ Evose như cũ.
 */
export function isBranded(dir: string): boolean {
  return existsSync(join(dir, "brand", "rules.md"));
}

/**
 * Lắp brand thì phải lắp đủ, không được thiếu nửa chừng.
 *
 * Thiếu một mảnh mà vẫn chạy tiếp là kiểu hỏng tệ nhất của pipeline này: video vẫn
 * render ra, vẫn có logo, nhưng font hoặc lớp phủ là của Evose. Không ai nhìn log,
 * và lỗi chỉ lộ ra khi đã gửi cho khách. Nên dừng hẳn ở đây.
 */
export function assertBrandComplete(dir: string): void {
  if (!isBranded(dir)) return;
  const need: [string, string][] = [
    [join(dir, "brand", "fonts.css"), "bộ @font-face của brand (build.ts cần, nếu không khung bị áp font Evose)"],
    [join(dir, "brand", "overlay.png"), "lớp phủ của brand (nếu không video bị phủ logo Evose)"],
  ];
  const missing = need.filter(([f]) => !existsSync(f) || readFileSync(f).length === 0);
  if (missing.length) {
    throw new Error(
      `${dir} đã lắp brand (có brand/rules.md) nhưng thiếu hoặc rỗng:\n` +
        missing.map(([f, why]) => `  · ${f.slice(dir.length + 1)} — ${why}`).join("\n") +
        `\nLắp lại bằng: npm run video:brand -- <tên-brand> ${dir}`,
    );
  }
}

/** Giọng đọc riêng của một thương hiệu, đặt ở `<dir>/brand/voice.json`. */
export const BrandVoiceSchema = z.object({
  voiceId: z.string().min(1),
  modelId: z.string().min(1).optional(),
  note: z.string().optional(),
});
export type BrandVoice = z.infer<typeof BrandVoiceSchema>;

/** Đọc JSON kèm đường dẫn trong thông báo lỗi — SyntaxError trần không nói file nào hỏng. */
export function readJsonFile(p: string): unknown {
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch (e) {
    throw new Error(`${p}: JSON hỏng — ${e instanceof Error ? e.message : e}`);
  }
}

/**
 * Giọng của thương hiệu, nếu thư mục video có `brand/voice.json`.
 *
 * Trước đây `ELEVENLABS_VOICE_ID` trong `.env.local` là giọng duy nhất, nên làm video
 * tiếng Anh phải sửa `.env` rồi nhớ sửa lại — dễ ship nhầm giọng. File này đè lên biến
 * môi trường cho đúng một thư mục video.
 */
export function brandVoice(dir: string): BrandVoice | undefined {
  const p = join(dir, "brand", "voice.json");
  if (!existsSync(p)) return undefined;
  const raw = readJsonFile(p);
  if (typeof raw === "object" && raw !== null && (raw as { voiceId?: unknown }).voiceId === "REPLACE_ME") {
    throw new Error(
      `${p}: chưa điền voiceId thật (đang là "REPLACE_ME"). ` +
        `Lấy ID ở elevenlabs.io → Voices → ⋮ → Copy voice ID, rồi điền vào brands/<brand>/voice.json.`,
    );
  }
  const parsed = BrandVoiceSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`${p}: sai định dạng — ${parsed.error.issues.map((i) => `${i.path.join(".") || "(gốc)"}: ${i.message}`).join("; ")}`);
  }
  return parsed.data;
}

/** Thư mục skill faceless-explainer của HyperFrames (cài bằng `npx hyperframes skills update faceless-explainer`). */
export function facelessScriptsDir(): string {
  const root = process.env.HF_SKILLS_DIR ?? join(homedir(), ".claude", "skills");
  const dir = join(root, "faceless-explainer", "scripts");
  if (!existsSync(dir)) {
    throw new Error(
      `Không thấy skill faceless-explainer ở ${dir}. Chạy: npx hyperframes skills update faceless-explainer ` +
        `(hoặc đặt HF_SKILLS_DIR trỏ tới thư mục skills).`,
    );
  }
  return dir;
}

export interface TimedWord {
  id: string;
  text: string;
  /** Giây, tính từ đầu khung. */
  start: number;
  end: number;
}

export interface VoiceEntry {
  frame: number;
  path: string;
  duration_s: number;
  words: TimedWord[];
}

export interface SfxEntry {
  frame: number;
  file: string;
  offset_s: number;
  duration_s: number;
  volume: number;
}

export interface AudioMeta {
  bgm: { path: string; volume: number; query?: string | null; duration_s?: number | null } | null;
  bgm_pending: boolean;
  voices: VoiceEntry[];
  sfx: SfxEntry[];
}

export function projectDir(arg: string | undefined, usage: string): string {
  if (!arg) {
    console.error(usage);
    process.exit(2);
  }
  const dir = resolve(arg);
  if (!existsSync(join(dir, "hyperframes.json"))) {
    console.error(`${dir} không phải thư mục video (thiếu hyperframes.json). Tạo bằng: npm run video:new -- <slug>`);
    process.exit(2);
  }
  return dir;
}

export function readAudioMeta(dir: string): AudioMeta {
  const p = join(dir, "audio_meta.json");
  if (!existsSync(p)) return { bgm: null, bgm_pending: false, voices: [], sfx: [] };
  return JSON.parse(readFileSync(p, "utf8")) as AudioMeta;
}

export function writeAudioMeta(dir: string, meta: AudioMeta): void {
  writeFileSync(join(dir, "audio_meta.json"), JSON.stringify(meta, null, 1));
}

/** Chạy lệnh, in thẳng ra màn hình, lỗi thì ném. */
export function run(cmd: string, args: readonly string[], cwd: string): Promise<void> {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { cwd, stdio: "inherit" });
    p.on("close", (c) => (c === 0 ? res() : rej(new Error(`${cmd} ${args.join(" ")} thoát mã ${c}`))));
    p.on("error", rej);
  });
}

/** Chạy lệnh và lấy stdout. */
export function capture(cmd: string, args: readonly string[], cwd?: string): Promise<Buffer> {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { cwd, stdio: ["ignore", "pipe", "inherit"] });
    const chunks: Buffer[] = [];
    p.stdout.on("data", (c: Buffer) => chunks.push(c));
    p.on("close", (c) => (c === 0 ? res(Buffer.concat(chunks)) : rej(new Error(`${cmd} thoát mã ${c}`))));
    p.on("error", rej);
  });
}

export async function durationSec(path: string): Promise<number> {
  const out = await capture("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]);
  return Number(out.toString().trim());
}

/** Khung storyboard: số thứ tự và khối dòng `- key: value`. */
export interface StoryFrame {
  number: number;
  fields: Record<string, string>;
}

const FRAME_RE = /^#{2,3}\s+(?:frame|beat|scene)\b.*?(\d+)/i;

export function parseStoryboard(md: string): StoryFrame[] {
  const frames: StoryFrame[] = [];
  let cur: StoryFrame | null = null;
  for (const line of md.split(/\r?\n/)) {
    const h = line.match(FRAME_RE);
    if (h) {
      cur = { number: Number(h[1]), fields: {} };
      frames.push(cur);
      continue;
    }
    const kv = cur && line.match(/^\s*[-*]\s+([a-z_]+)\s*:\s*(.*)$/i);
    if (cur && kv && !(kv[1].toLowerCase() in cur.fields)) cur.fields[kv[1].toLowerCase()] = kv[2].trim();
  }
  return frames;
}

/** Ghi độ dài giọng thật vào dòng `- duration:` của từng khung. */
export function syncDurations(md: string, durByFrame: ReadonlyMap<number, number>): { md: string; updated: number } {
  const lines = md.split(/\r?\n/);
  let cur: number | null = null;
  const done = new Set<number>();
  for (let i = 0; i < lines.length; i++) {
    const h = lines[i].match(FRAME_RE);
    if (h) {
      cur = Number(h[1]);
      continue;
    }
    if (cur == null || done.has(cur) || !durByFrame.has(cur)) continue;
    const m = lines[i].match(/^(\s*[-*]\s+duration\s*:\s*).*/i);
    if (m) {
      lines[i] = `${m[1]}${durByFrame.get(cur)}s`;
      done.add(cur);
    }
  }
  return { md: lines.join("\n"), updated: done.size };
}
