#!/usr/bin/env node
/**
 * `npm run video:join -- <thư mục tập> <chương 1> <chương 2> ... [cờ]` — nối chương thành một tập.
 *
 * Dùng cho series bài giảng dài (hồ sơ `brands/ai-engineer`). Mỗi chương là một lượt
 * `/create-video` riêng, đã có `renders/final.mp4`. Lệnh này:
 *
 *   1. Đo từng chương bằng ffprobe. Lệch khổ, fps, codec, tần số lấy mẫu hay số kênh
 *      thì DỪNG, nêu tên chương và trường lệch. Nối bừa hai luồng khác nhau thì
 *      `-c copy` ra file hỏng tiếng hoặc hình đứng giữa chừng.
 *   2. Nối bằng concat demuxer, chép nguyên luồng, không mã hoá lại hình.
 *   3. Tuỳ chọn trải MỘT bản nhạc nền liền dưới cả tập: lặp nếu ngắn hơn, nhỏ dưới
 *      giọng, tắt dần ở cuối. Chương dựng KHÔNG có nhạc riêng (đừng chạy video:music).
 *   4. Ghi `chapters.txt` dạng mốc chương YouTube, tính từ độ dài đo thật.
 *
 * Cờ:
 *   --music <file>         nhạc nền cho cả tập
 *   --music-volume <0..1>  âm lượng nhạc, mặc định 0.12
 *   --title "<tên>"        tên chương, lặp lại đúng bằng số chương. Bỏ thì lấy `title:`
 *                          trong frontmatter STORYBOARD, không có thì lấy tên thư mục.
 *   --out <tên file>       tên file ra trong thư mục tập, mặc định tap.mp4
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { capture, run } from "./lib.js";

export interface MediaInfo {
  width: number;
  height: number;
  fps: string;
  vcodec: string;
  pixfmt: string;
  acodec: string;
  sampleRate: number;
  channels: number;
  duration: number;
}

export interface JoinArgs {
  episode: string;
  chapters: string[];
  music?: string;
  titles: string[];
  out: string;
  volume: number;
}

const DEFAULT_OUT = "tap.mp4";
const DEFAULT_MUSIC_VOLUME = 0.12;
const DEFAULT_FADE_OUT_SEC = 4;
/** YouTube chỉ bật mốc chương khi có ít nhất 3 chương, mỗi chương từ 10 giây. */
const YT_MIN_CHAPTERS = 3;
const YT_MIN_CHAPTER_SEC = 10;

/** Giây thành mốc YouTube. Làm tròn xuống để mốc không nhảy qua lúc chương thật bắt đầu. */
export function formatTimestamp(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) throw new Error(`mốc thời gian không hợp lệ: ${sec}`);
  const total = Math.floor(sec);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const two = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${two(m)}:${two(s)}` : `${two(m)}:${two(s)}`;
}

/** Mốc bắt đầu của từng chương, cộng dồn từ độ dài thật. */
export function chapterOffsets(durations: readonly number[]): number[] {
  return durations.reduce<number[]>((acc, _d, i) => [...acc, i === 0 ? 0 : acc[i - 1]! + durations[i - 1]!], []);
}

/** Nội dung `chapters.txt`: mỗi dòng `mốc tên`, dòng đầu luôn 00:00. */
export function chaptersTxt(titles: readonly string[], durations: readonly number[]): string {
  if (titles.length !== durations.length) {
    throw new Error(`có ${titles.length} tên chương cho ${durations.length} chương`);
  }
  const offsets = chapterOffsets(durations);
  return titles.map((t, i) => `${formatTimestamp(offsets[i]!)} ${t}`).join("\n") + "\n";
}

/** Những điều làm YouTube không bật mốc chương. Chỉ cảnh báo, không chặn. */
export function youtubeChapterWarnings(durations: readonly number[]): string[] {
  const warns: string[] = [];
  if (durations.length < YT_MIN_CHAPTERS) {
    warns.push(`YouTube cần ít nhất ${YT_MIN_CHAPTERS} chương mới hiện mốc chương, tập này có ${durations.length}`);
  }
  durations.forEach((d, i) => {
    if (d < YT_MIN_CHAPTER_SEC) warns.push(`chương ${i + 1} dài ${d.toFixed(1)} giây, YouTube cần mỗi chương từ ${YT_MIN_CHAPTER_SEC} giây`);
  });
  return warns;
}

interface ProbeStream {
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  r_frame_rate?: string;
  pix_fmt?: string;
  sample_rate?: string;
  channels?: number;
}

/** Rút các trường cần so từ JSON của ffprobe. Thiếu trường nào thì ném lỗi kèm tên chương. */
export function parseProbe(json: string, name: string): MediaInfo {
  const data = JSON.parse(json) as { streams?: ProbeStream[]; format?: { duration?: string } };
  const streams = data.streams ?? [];
  const v = streams.find((s) => s.codec_type === "video");
  const a = streams.find((s) => s.codec_type === "audio");
  if (!v) throw new Error(`${name}: không có luồng hình`);
  if (!a) throw new Error(`${name}: không có luồng tiếng`);
  const duration = Number(data.format?.duration);
  if (!data.format?.duration || !Number.isFinite(duration) || duration <= 0) {
    throw new Error(`${name}: ffprobe không trả về độ dài hợp lệ`);
  }
  return {
    width: Number(v.width),
    height: Number(v.height),
    fps: String(v.r_frame_rate),
    vcodec: String(v.codec_name),
    pixfmt: String(v.pix_fmt),
    acodec: String(a.codec_name),
    sampleRate: Number(a.sample_rate),
    channels: Number(a.channels),
    duration,
  };
}

const COMPAT_FIELDS: [keyof MediaInfo, string][] = [
  ["width", "bề rộng"],
  ["height", "chiều cao"],
  ["fps", "fps"],
  ["vcodec", "codec hình"],
  ["pixfmt", "định dạng điểm ảnh"],
  ["acodec", "codec tiếng"],
  ["sampleRate", "tần số lấy mẫu"],
  ["channels", "số kênh tiếng"],
];

/** So mọi chương với chương đầu. Trả về danh sách lỗi, rỗng là nối được. */
export function checkCompat(items: readonly { name: string; info: MediaInfo }[]): string[] {
  const [first, ...rest] = items;
  if (!first) return [];
  return rest.flatMap(({ name, info }) =>
    COMPAT_FIELDS.filter(([k]) => info[k] !== first.info[k]).map(
      ([k, label]) => `${name}: ${label} là ${info[k]}, khác chương đầu (${first.name}) là ${first.info[k]}`,
    ),
  );
}

/** File danh sách cho concat demuxer. Dấu nháy đơn trong đường dẫn phải escape. */
export function buildConcatList(paths: readonly string[]): string {
  return paths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n") + "\n";
}

/** Tham số ffmpeg để nối. Không nhạc thì chép nguyên mọi luồng. Có nhạc thì hình vẫn chép
 *  nguyên, chỉ tiếng được trộn và mã hoá lại. */
export function buildJoinArgs(o: {
  listPath: string;
  out: string;
  total: number;
  music?: string;
  volume?: number;
  fadeOut?: number;
}): string[] {
  const head = ["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", o.listPath];
  if (!o.music) return [...head, "-c", "copy", "-movflags", "+faststart", o.out];
  const fade = Math.min(o.fadeOut ?? DEFAULT_FADE_OUT_SEC, o.total);
  const fadeStart = Math.max(0, o.total - fade);
  const vol = o.volume ?? DEFAULT_MUSIC_VOLUME;
  const round = (n: number) => Number(n.toFixed(3));
  const filter =
    `[1:a]volume=${vol},atrim=0:${round(o.total)},afade=t=out:st=${round(fadeStart)}:d=${round(fade)}[m];` +
    `[0:a][m]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[a]`;
  return [
    ...head,
    "-stream_loop", "-1", "-i", o.music,
    "-filter_complex", filter,
    "-map", "0:v", "-c:v", "copy",
    "-map", "[a]", "-c:a", "aac", "-b:a", "160k",
    "-t", String(round(o.total)),
    "-movflags", "+faststart", o.out,
  ];
}

const FLAGS_WITH_VALUE = new Set(["--music", "--music-volume", "--title", "--out"]);

/** Đọc tham số dòng lệnh. Sai thì ném lỗi tiếng Việt nêu đúng cờ sai. */
export function parseJoinArgs(argv: readonly string[]): JoinArgs {
  const positional: string[] = [];
  const titles: string[] = [];
  let music: string | undefined;
  let out = DEFAULT_OUT;
  let volume = DEFAULT_MUSIC_VOLUME;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (!a.startsWith("--")) {
      positional.push(a);
      continue;
    }
    if (!FLAGS_WITH_VALUE.has(a)) throw new Error(`cờ không biết: ${a}`);
    const value = argv[i + 1];
    if (value === undefined || value.startsWith("--")) throw new Error(`cờ ${a} thiếu giá trị`);
    i++;
    if (a === "--music") music = value;
    else if (a === "--title") titles.push(value);
    else if (a === "--out") out = value;
    else volume = Number(value);
  }
  const [episode, ...chapters] = positional;
  if (!episode || chapters.length === 0) throw new Error("cần thư mục tập và ít nhất một thư mục chương");
  if (titles.length && titles.length !== chapters.length) {
    throw new Error(`có ${titles.length} cờ --title cho ${chapters.length} chương, phải bằng nhau hoặc bỏ hẳn`);
  }
  if (!Number.isFinite(volume) || volume <= 0 || volume > 1) throw new Error(`--music-volume phải trong khoảng 0 tới 1, nhận ${volume}`);
  if (basename(out) !== out || !out.endsWith(".mp4")) throw new Error(`--out phải là tên file .mp4 trần, không có đường dẫn: ${out}`);
  return { episode, chapters, ...(music ? { music } : {}), titles, out, volume };
}

/** Tên chương: `title:` trong frontmatter STORYBOARD, không có thì tên thư mục bỏ đuôi ngày giờ. */
export function chapterTitle(dir: string): string {
  const sb = join(dir, "STORYBOARD.md");
  if (existsSync(sb)) {
    const fm = readFileSync(sb, "utf8").match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const t = fm?.[1]?.match(/^title:\s*(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "");
    if (t) return t;
  }
  return basename(resolve(dir)).replace(/-\d{8}-\d{4}$/, "");
}

/* ------------------------------------------------------------------ *
 * ranh giới với ffprobe và ffmpeg
 * ------------------------------------------------------------------ */

async function probe(path: string, name: string): Promise<MediaInfo> {
  const out = await capture("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", path]);
  return parseProbe(out.toString(), name);
}

/** Chương đã tự có nhạc thì nhạc tập sẽ chồng lên. Chỉ cảnh báo. */
function chapterHasMusic(dir: string): boolean {
  const p = join(dir, "audio_meta.json");
  if (!existsSync(p)) return false;
  try {
    return Boolean((JSON.parse(readFileSync(p, "utf8")) as { bgm?: unknown }).bgm);
  } catch {
    return false;
  }
}

/** Quy mọi đường dẫn về tuyệt đối theo `cwd` của lệnh. Phải làm trước khi chạy
 *  ffmpeg, vì ffmpeg chạy với cwd là thư mục tập nên đường dẫn tương đối sẽ trỏ sai. */
export function resolveJoinPaths<T extends { episode: string; chapters: string[]; music?: string }>(args: T, cwd: string): T {
  return {
    ...args,
    episode: resolve(cwd, args.episode),
    chapters: args.chapters.map((c) => resolve(cwd, c)),
    ...(args.music ? { music: resolve(cwd, args.music) } : {}),
  };
}

async function main(): Promise<void> {
  const args = resolveJoinPaths(parseJoinArgs(process.argv.slice(2)), process.env.INIT_CWD ?? process.cwd());
  const episode = args.episode;
  const chapters = args.chapters;
  const files = chapters.map((c) => join(c, "renders", "final.mp4"));
  const missing = files.filter((f) => !existsSync(f));
  if (missing.length) throw new Error(`chưa có bản dựng:\n${missing.map((f) => `  · ${f}`).join("\n")}`);
  if (args.music && !existsSync(args.music)) throw new Error(`không thấy file nhạc ${args.music}`);

  const names = chapters.map((c) => basename(c));
  const infos = await Promise.all(files.map((f, i) => probe(f, names[i]!)));
  const errors = checkCompat(infos.map((info, i) => ({ name: names[i]!, info })));
  if (errors.length) throw new Error(`các chương không cùng thông số, không nối nguyên luồng được:\n${errors.map((e) => `  · ${e}`).join("\n")}`);
  const first = infos[0]!;
  console.log(`✓ ${infos.length} chương cùng thông số: ${first.width}×${first.height} ${first.fps} ${first.vcodec}, ${first.acodec} ${first.sampleRate} Hz ${first.channels} kênh`);

  if (args.music) {
    const withMusic = names.filter((_n, i) => chapterHasMusic(chapters[i]!));
    if (withMusic.length) console.log(`  ⚠ đã có nhạc riêng, nhạc tập sẽ chồng lên: ${withMusic.join(", ")}`);
  }

  mkdirSync(episode, { recursive: true });
  const durations = infos.map((i) => i.duration);
  const total = durations.reduce((a, b) => a + b, 0);
  const listPath = join(episode, "concat.txt");
  writeFileSync(listPath, buildConcatList(files));
  const out = join(episode, args.out);
  await run("ffmpeg", buildJoinArgs({ listPath, out, total, music: args.music, volume: args.volume }), episode);

  const titles = args.titles.length ? args.titles : chapters.map(chapterTitle);
  writeFileSync(join(episode, "chapters.txt"), chaptersTxt(titles, durations));

  const outDur = (await probe(out, args.out)).duration;
  console.log(`✓ ${out}`);
  console.log(`  độ dài ${formatTimestamp(outDur)} (${outDur.toFixed(2)} giây), tổng các chương ${total.toFixed(2)} giây`);
  if (Math.abs(outDur - total) > 0.5) console.log(`  ⚠ lệch ${(outDur - total).toFixed(2)} giây so với tổng các chương`);
  console.log(`  nhạc nền: ${args.music ? `${args.music} ở âm lượng ${args.volume}` : "không có"}`);
  console.log(`✓ ${join(episode, "chapters.txt")}`);
  for (const w of youtubeChapterWarnings(durations)) console.log(`  ⚠ ${w}`);
}

// Chỉ chạy khi gọi thẳng file này, để join.test.ts import được các hàm thuần.
const entry = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === entry) {
  main().catch((e) => {
    console.error(`✗ video:join: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  });
}
