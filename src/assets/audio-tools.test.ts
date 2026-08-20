import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  getDurationSec,
  concatWithSilence,
  measureLoudness,
  gainForTarget,
  makeSilence,
  TARGET_LUFS,
} from "./audio-tools.js";

let tmp: string;
beforeEach(() => { tmp = mkdtempSync(join(tmpdir(), "aud-")); });
afterEach(() => { rmSync(tmp, { recursive: true, force: true }); });

/** Làm một bản nhỏ tiếng hơn `db` dB — giả lập cảnh bị đọc nhỏ hơn hẳn. */
function attenuate(src: string, db: number, out: string): Promise<void> {
  return new Promise((res, rej) => {
    const p = spawn("ffmpeg", [
      "-y", "-loglevel", "error", "-i", src,
      "-af", `volume=-${db}dB`, "-c:a", "libmp3lame", "-b:a", "192k", out,
    ]);
    p.on("close", (c) => (c === 0 ? res() : rej(new Error(`attenuate exit ${c}`))));
    p.on("error", rej);
  });
}

describe("getDurationSec", () => {
  it("returns ~2s for sample-audio-1.mp3", async () => {
    const d = await getDurationSec("tests/fixtures/sample-audio-1.mp3");
    expect(d).toBeGreaterThan(1.9);
    expect(d).toBeLessThan(2.2);
  });
});

describe("concatWithSilence", () => {
  it("concatenates two mp3s with 0.3s gap", async () => {
    const out = join(tmp, "voice.mp3");
    await concatWithSilence(
      ["tests/fixtures/sample-audio-1.mp3", "tests/fixtures/sample-audio-2.mp3"],
      0.3,
      out,
    );
    expect(existsSync(out)).toBe(true);
    const d = await getDurationSec(out);
    // 2s + 0.3s + 3s = 5.3s, allow ±0.3s
    expect(d).toBeGreaterThan(5.0);
    expect(d).toBeLessThan(5.6);
  });
});

describe("measureLoudness", () => {
  it("đọc được độ to và đỉnh thật của một file có tiếng", async () => {
    const info = await measureLoudness("tests/fixtures/sample-audio-1.mp3");
    expect(info.integratedLufs).toBeGreaterThan(-70);
    expect(info.integratedLufs).toBeLessThan(0);
    expect(Number.isFinite(info.truePeakDb)).toBe(true);
  });

  it("file câm cho -Infinity chứ không phải NaN", async () => {
    // ffmpeg in ra chuỗi "-inf"; parseFloat sẽ ra NaN nếu không xử riêng, và
    // NaN lọt xuống bước tính gain thì hỏng cả file ghép.
    const sil = join(tmp, "sil.mp3");
    await makeSilence(1, sil);
    const info = await measureLoudness(sil);
    expect(info.integratedLufs).toBe(-Infinity);
  });
});

describe("gainForTarget", () => {
  it("kéo đoạn nhỏ tiếng lên đúng mức đích", () => {
    expect(gainForTarget({ integratedLufs: -26, truePeakDb: -20 }, -16)).toBeCloseTo(10, 5);
  });

  it("hạ đoạn to tiếng xuống đúng mức đích", () => {
    expect(gainForTarget({ integratedLufs: -10, truePeakDb: -6 }, -16)).toBeCloseTo(-6, 5);
  });

  it("không đụng vào đoạn câm", () => {
    expect(gainForTarget({ integratedLufs: -Infinity, truePeakDb: -Infinity }, -16)).toBe(0);
  });

  it("chặn mức kéo quá tay — đoạn gần như im lặng không bị thổi thành tiếng ồn", () => {
    // Cần tới +44 dB mới đạt mức đích; trần chặn lại ở +12.
    expect(gainForTarget({ integratedLufs: -60, truePeakDb: -55 }, -16)).toBe(12);
  });

  it("giảm bớt gain để đỉnh không vượt ngưỡng, tránh vỡ tiếng", () => {
    // Cần +10 dB để đạt mức đích, nhưng đỉnh đang ở -2 dBTP → +10 sẽ cắt ngọn.
    const g = gainForTarget({ integratedLufs: -26, truePeakDb: -2 }, -16);
    expect(g).toBeLessThan(10);
    expect(-2 + g).toBeLessThanOrEqual(-1);
  });
});

describe("concatWithSilence — chuẩn hoá âm lượng", () => {
  // Fixture vốn ở khoảng -22 LUFS. Hạ thêm 5 dB là mức chênh sát với thực tế
  // giữa hai cảnh TTS; hạ sâu hơn nữa sẽ chạm trần MAX_GAIN_DB (đã có test
  // riêng cho trần đó ở trên).
  const DIP_DB = 5;

  it("kéo một file nhỏ tiếng lên gần mức đích", async () => {
    const quiet = join(tmp, "quiet.mp3");
    await attenuate("tests/fixtures/sample-audio-1.mp3", DIP_DB, quiet);
    const before = await measureLoudness(quiet);
    expect(before.integratedLufs).toBeLessThan(TARGET_LUFS - 8);

    const out = join(tmp, "one.mp3");
    await concatWithSilence([quiet], 0.3, out);

    const after = await measureLoudness(out);
    expect(after.integratedLufs).toBeGreaterThan(TARGET_LUFS - 2);
    expect(after.integratedLufs).toBeLessThan(TARGET_LUFS + 2);
  });

  it("hai cảnh chênh lệch to nhỏ được kéo về cùng mức", async () => {
    const quiet = join(tmp, "q.mp3");
    await attenuate("tests/fixtures/sample-audio-2.mp3", DIP_DB, quiet);

    const out = join(tmp, "two.mp3");
    await concatWithSilence(["tests/fixtures/sample-audio-1.mp3", quiet], 0.3, out);

    // Cả hai nửa đã về cùng mức thì mức chung cũng phải nằm quanh mức đích.
    // Còn để nguyên chênh lệch thì trung bình sẽ bị kéo tụt xuống.
    const after = await measureLoudness(out);
    expect(after.integratedLufs).toBeGreaterThan(TARGET_LUFS - 3);
    expect(after.integratedLufs).toBeLessThan(TARGET_LUFS + 3);
  });
});
