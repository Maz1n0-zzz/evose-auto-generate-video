import { describe, it, expect, beforeEach, afterEach } from "vitest";
import nock from "nock";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ElevenLabsClient } from "./elevenlabs-client.js";

const BASE = "https://api.elevenlabs.io";
const VOICE = "voice-123";
const AUDIO = Buffer.from("fake-mp3-bytes");

let dir: string;
let out: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "el-test-"));
  out = join(dir, "scene.mp3");
  nock.disableNetConnect();
});

afterEach(async () => {
  nock.cleanAll();
  nock.enableNetConnect();
  await rm(dir, { recursive: true, force: true });
});

function client(modelId: string) {
  return new ElevenLabsClient({ apiKey: "k", voiceId: VOICE, modelId });
}

/** Bắt thân request của lần gọi tiếp theo để soi tham số đã gửi. */
function captureBody(replyHeaders: Record<string, string> = {}) {
  const seen: { body?: Record<string, unknown> } = {};
  nock(BASE)
    .post(`/v1/text-to-speech/${VOICE}`, (b) => {
      seen.body = b as Record<string, unknown>;
      return true;
    })
    .reply(200, AUDIO, replyHeaders);
  return seen;
}

describe("ElevenLabsClient — ghi file", () => {
  it("ghi đúng bytes trả về ra đường dẫn chỉ định", async () => {
    captureBody();
    await client("eleven_flash_v2_5").generate("xin chào", out);
    expect(await readFile(out)).toEqual(AUDIO);
  });

  it("trả về request-id lấy từ header phản hồi", async () => {
    captureBody({ "request-id": "req-abc" });
    const res = await client("eleven_flash_v2_5").generate("xin chào", out);
    expect(res.requestId).toBe("req-abc");
  });

  it("không có header request-id thì trả về undefined, không ném lỗi", async () => {
    captureBody();
    const res = await client("eleven_flash_v2_5").generate("xin chào", out);
    expect(res.requestId).toBeUndefined();
  });
});

describe("ElevenLabsClient — nối ngữ điệu với model dòng v2", () => {
  it("gửi previous_text và next_text khi được cấp", async () => {
    const seen = captureBody();
    await client("eleven_multilingual_v2").generate("câu hai", out, undefined, {
      previousText: "câu một",
      nextText: "câu ba",
    });
    expect(seen.body?.previous_text).toBe("câu một");
    expect(seen.body?.next_text).toBe("câu ba");
  });

  it("gửi previous_request_ids khi được cấp", async () => {
    const seen = captureBody();
    await client("eleven_flash_v2_5").generate("câu hai", out, undefined, {
      previousRequestIds: ["r1", "r2"],
    });
    expect(seen.body?.previous_request_ids).toEqual(["r1", "r2"]);
  });

  it("cắt còn 3 id gần nhất — API không nhận quá 3", async () => {
    const seen = captureBody();
    await client("eleven_flash_v2_5").generate("câu năm", out, undefined, {
      previousRequestIds: ["r1", "r2", "r3", "r4", "r5"],
    });
    expect(seen.body?.previous_request_ids).toEqual(["r3", "r4", "r5"]);
  });

  it("bỏ hẳn trường khi mảng id rỗng", async () => {
    const seen = captureBody();
    await client("eleven_flash_v2_5").generate("câu một", out, undefined, {
      previousRequestIds: [],
    });
    expect(seen.body).not.toHaveProperty("previous_request_ids");
  });
});

describe("ElevenLabsClient — eleven_v3 chặn mọi cơ chế nối", () => {
  // API trả 400 unsupported_model cho CẢ previous_text LẪN previous_request_ids
  // với v3 — đã kiểm bằng scripts/probe-elevenlabs-stitching.ts.
  it("không gửi tham số nối nào dù được cấp đủ", async () => {
    const seen = captureBody();
    await client("eleven_v3").generate("câu hai", out, undefined, {
      previousText: "câu một",
      nextText: "câu ba",
      previousRequestIds: ["r1"],
    });
    expect(seen.body).not.toHaveProperty("previous_text");
    expect(seen.body).not.toHaveProperty("next_text");
    expect(seen.body).not.toHaveProperty("previous_request_ids");
  });

  it("báo không nối được request-id", () => {
    expect(client("eleven_v3").supportsRequestIdChaining()).toBe(false);
    expect(client("eleven_flash_v2_5").supportsRequestIdChaining()).toBe(true);
  });
});

describe("ElevenLabsClient — lỗi", () => {
  it("401 báo sai API key và không thử lại", async () => {
    nock(BASE).post(`/v1/text-to-speech/${VOICE}`).reply(401, "nope");
    await expect(client("eleven_v3").generate("x", out)).rejects.toThrow(/invalid API key/);
  });

  it("400 nêu rõ nguyên văn lỗi từ API", async () => {
    nock(BASE)
      .post(`/v1/text-to-speech/${VOICE}`)
      .reply(400, { detail: { code: "unsupported_model", message: "not yet supported" } });
    await expect(client("eleven_v3").generate("x", out)).rejects.toThrow(/not yet supported/);
  });
});
