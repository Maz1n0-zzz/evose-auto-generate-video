import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
  buildConcatList,
  buildJoinArgs,
  chapterOffsets,
  chapterTitle,
  chaptersTxt,
  checkCompat,
  formatTimestamp,
  parseJoinArgs,
  resolveJoinPaths,
  parseProbe,
  youtubeChapterWarnings,
  type MediaInfo,
} from "./join.js";

const info = (over: Partial<MediaInfo> = {}): MediaInfo => ({
  width: 1920,
  height: 1080,
  fps: "30/1",
  vcodec: "h264",
  pixfmt: "yuv420p",
  acodec: "aac",
  sampleRate: 44100,
  channels: 2,
  duration: 150,
  ...over,
});

describe("formatTimestamp", () => {
  test("dưới một giờ ghi mm:ss", () => {
    expect(formatTimestamp(0)).toBe("00:00");
    expect(formatTimestamp(65)).toBe("01:05");
    expect(formatTimestamp(3599.9)).toBe("59:59");
  });
  test("từ một giờ trở lên ghi h:mm:ss", () => {
    expect(formatTimestamp(3600)).toBe("1:00:00");
    expect(formatTimestamp(3725.4)).toBe("1:02:05");
  });
  test("làm tròn XUỐNG: mốc chương không được nhảy qua giây chương thật bắt đầu", () => {
    expect(formatTimestamp(125.99)).toBe("02:05");
  });
  test("số âm hay không hữu hạn thì ném lỗi", () => {
    expect(() => formatTimestamp(-1)).toThrow();
    expect(() => formatTimestamp(Number.NaN)).toThrow();
  });
});

describe("chapterOffsets", () => {
  test("mốc bắt đầu cộng dồn từ độ dài thật, chương đầu ở 0", () => {
    expect(chapterOffsets([150.5, 170.25, 160])).toEqual([0, 150.5, 320.75]);
  });
  test("không sửa mảng đầu vào", () => {
    const d = [1, 2];
    chapterOffsets(d);
    expect(d).toEqual([1, 2]);
  });
});

describe("chaptersTxt", () => {
  test("đúng định dạng YouTube, dòng đầu 00:00", () => {
    expect(chaptersTxt(["Mở", "Vấn đề", "Tự xây"], [95.4, 130.2, 3500])).toBe(
      "00:00 Mở\n01:35 Vấn đề\n03:45 Tự xây\n",
    );
  });
  test("tập vượt một giờ thì mọi mốc từ một giờ trở đi ghi h:mm:ss", () => {
    expect(chaptersTxt(["A", "B"], [3600, 10])).toBe("00:00 A\n1:00:00 B\n");
  });
  test("số tên khác số chương thì ném lỗi", () => {
    expect(() => chaptersTxt(["A"], [1, 2])).toThrow(/tên chương/);
  });
});

describe("youtubeChapterWarnings", () => {
  test("dưới ba chương thì YouTube không bật mốc chương", () => {
    expect(youtubeChapterWarnings([200, 200]).join(" ")).toMatch(/ít nhất 3/);
  });
  test("chương ngắn hơn 10 giây bị cảnh báo kèm số thứ tự", () => {
    expect(youtubeChapterWarnings([200, 8, 200]).join(" ")).toMatch(/chương 2/);
  });
  test("đủ điều kiện thì không cảnh báo", () => {
    expect(youtubeChapterWarnings([120, 150, 140])).toEqual([]);
  });
});

describe("parseProbe", () => {
  const json = JSON.stringify({
    streams: [
      { codec_type: "video", codec_name: "h264", width: 1920, height: 1080, r_frame_rate: "30/1", pix_fmt: "yuv420p" },
      { codec_type: "audio", codec_name: "aac", sample_rate: "44100", channels: 2 },
    ],
    format: { duration: "151.234000" },
  });
  test("rút đủ trường cần so", () => {
    expect(parseProbe(json, "ch1")).toEqual(info({ duration: 151.234 }));
  });
  test("thiếu luồng tiếng thì báo rõ tên chương", () => {
    const noAudio = JSON.stringify({ streams: [JSON.parse(json).streams[0]], format: { duration: "1" } });
    expect(() => parseProbe(noAudio, "ch2")).toThrow(/ch2.*không có luồng tiếng/);
  });
  test("thiếu độ dài thì ném lỗi, không coi là 0", () => {
    const bad = JSON.stringify({ streams: JSON.parse(json).streams, format: {} });
    expect(() => parseProbe(bad, "ch3")).toThrow(/ch3.*độ dài/);
  });
});

describe("checkCompat", () => {
  test("mọi chương giống nhau thì không lỗi", () => {
    expect(checkCompat([{ name: "a", info: info() }, { name: "b", info: info({ duration: 9 }) }])).toEqual([]);
  });
  test("lệch trường nào thì nêu tên chương và tên trường đó", () => {
    const errs = checkCompat([
      { name: "chuong-1", info: info() },
      { name: "chuong-2", info: info({ height: 1920, width: 1080 }) },
      { name: "chuong-3", info: info({ sampleRate: 48000 }) },
    ]);
    expect(errs).toHaveLength(3);
    expect(errs.join("\n")).toMatch(/chuong-2.*rộng.*1080.*1920/);
    expect(errs.join("\n")).toMatch(/chuong-2.*cao.*1920.*1080/);
    expect(errs.join("\n")).toMatch(/chuong-3.*tần số lấy mẫu.*48000.*44100/);
  });
  test("so cả fps, codec hình, codec tiếng, số kênh", () => {
    const errs = checkCompat([
      { name: "a", info: info() },
      { name: "b", info: info({ fps: "25/1", vcodec: "hevc", acodec: "mp3", channels: 1, pixfmt: "yuv444p" }) },
    ]);
    expect(errs).toHaveLength(5);
  });
});

describe("buildConcatList", () => {
  test("mỗi file một dòng, dấu nháy đơn trong đường dẫn được escape", () => {
    expect(buildConcatList(["/a/b.mp4", "/x/it's.mp4"])).toBe("file '/a/b.mp4'\nfile '/x/it'\\''s.mp4'\n");
  });
});

describe("buildJoinArgs", () => {
  test("không nhạc: chép nguyên luồng, không mã hoá lại", () => {
    const a = buildJoinArgs({ listPath: "/l.txt", out: "/o.mp4", total: 300 });
    expect(a).toEqual([
      "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", "/l.txt",
      "-c", "copy", "-movflags", "+faststart", "/o.mp4",
    ]);
  });
  test("có nhạc: hình vẫn chép nguyên, nhạc lặp, nhỏ dưới giọng, tắt dần ở cuối", () => {
    const a = buildJoinArgs({ listPath: "/l.txt", out: "/o.mp4", total: 300, music: "/m.mp3", volume: 0.1, fadeOut: 4 });
    const s = a.join(" ");
    expect(s).toContain("-stream_loop -1 -i /m.mp3");
    expect(s).toContain("-map 0:v -c:v copy");
    expect(s).toMatch(/volume=0\.1/);
    expect(s).toMatch(/afade=t=out:st=296:d=4/);
    expect(s).toMatch(/amix=inputs=2:duration=first/);
    expect(s).toContain("-t 300");
  });
  test("tập ngắn hơn quãng tắt dần thì tắt dần từ giây 0, không ra số âm", () => {
    const s = buildJoinArgs({ listPath: "/l", out: "/o", total: 2, music: "/m", fadeOut: 4 }).join(" ");
    expect(s).toMatch(/afade=t=out:st=0:d=2/);
  });
});

describe("parseJoinArgs", () => {
  test("thư mục tập, các chương, cờ nhạc và tên chương", () => {
    expect(
      parseJoinArgs(["ep", "c1", "c2", "c3", "--music", "m.mp3", "--title", "Mở", "--title", "Hai", "--title", "Ba"]),
    ).toEqual({ episode: "ep", chapters: ["c1", "c2", "c3"], music: "m.mp3", titles: ["Mở", "Hai", "Ba"], out: "tap.mp4", volume: 0.12 });
  });
  test("đổi tên file ra và âm lượng nhạc", () => {
    const r = parseJoinArgs(["ep", "c1", "--out", "tap-06.mp4", "--music-volume", "0.2"]);
    expect(r.out).toBe("tap-06.mp4");
    expect(r.volume).toBe(0.2);
  });
  test("thiếu chương thì ném lỗi", () => {
    expect(() => parseJoinArgs(["ep"])).toThrow(/ít nhất một/);
  });
  test("số --title khác số chương thì ném lỗi", () => {
    expect(() => parseJoinArgs(["ep", "c1", "c2", "--title", "A"])).toThrow(/--title/);
  });
  test("cờ lạ hoặc cờ thiếu giá trị thì ném lỗi", () => {
    expect(() => parseJoinArgs(["ep", "c1", "--nhac", "x"])).toThrow(/--nhac/);
    expect(() => parseJoinArgs(["ep", "c1", "--music"])).toThrow(/--music/);
  });
  test("âm lượng ngoài 0 tới 1 thì ném lỗi", () => {
    expect(() => parseJoinArgs(["ep", "c1", "--music-volume", "3"])).toThrow(/music-volume/);
  });
  test("tên file ra không được chứa đường dẫn", () => {
    expect(() => parseJoinArgs(["ep", "c1", "--out", "../x.mp4"])).toThrow(/--out/);
  });
});

describe("chapterTitle", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "join-title-"));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  test("lấy title: trong frontmatter STORYBOARD", () => {
    const d = join(root, "tap-06-chuong-3-20261117-2049");
    mkdirSync(d);
    writeFileSync(join(d, "STORYBOARD.md"), '---\nformat: 1920x1080\ntitle: "Tự xây agent loop"\n---\n## Frame 1\n');
    expect(chapterTitle(d)).toBe("Tự xây agent loop");
  });
  test("không có title thì dùng tên thư mục, bỏ đuôi ngày giờ của video:new", () => {
    const d = join(root, "tap-06-chuong-3-20261117-2049");
    mkdirSync(d);
    writeFileSync(join(d, "STORYBOARD.md"), "---\nformat: 1920x1080\n---\ntitle: lẫn trong thân bài\n");
    expect(chapterTitle(d)).toBe("tap-06-chuong-3");
  });
  test("không có STORYBOARD thì vẫn ra tên thư mục", () => {
    const d = join(root, "chuong-mot");
    mkdirSync(d);
    expect(chapterTitle(d)).toBe("chuong-mot");
  });
});

describe("resolveJoinPaths", () => {
  it("quy --music tương đối về cwd của lệnh, vì ffmpeg chạy trong thư mục tập", () => {
    const r = resolveJoinPaths(parseJoinArgs(["ep", "c1", "--music", "nhac/bgm.mp3"]), "/work");
    expect(r).toMatchObject({ episode: "/work/ep", chapters: ["/work/c1"], music: "/work/nhac/bgm.mp3" });
  });
  it("giữ nguyên đường dẫn tuyệt đối và không thêm music khi không có", () => {
    const r = resolveJoinPaths(parseJoinArgs(["/a/ep", "/a/c1"]), "/work");
    expect(r.episode).toBe("/a/ep");
    expect("music" in r).toBe(false);
  });
});
