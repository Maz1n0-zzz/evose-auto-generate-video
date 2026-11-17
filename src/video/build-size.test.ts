import { describe, expect, it } from "vitest";
import { sizeVerdict } from "./size-cap.js";

const MB = 1024 * 1024;

describe("sizeVerdict", () => {
  it("khổ dọc 1920: giữ trần 50 MB và mốc cảnh báo 45 MB như cũ", () => {
    expect(sizeVerdict(30 * MB, 1920)).toBe("ok");
    expect(sizeVerdict(45 * MB, 1920)).toBe("ok");
    expect(sizeVerdict(45 * MB + 1, 1920)).toBe("near");
    expect(sizeVerdict(50 * MB, 1920)).toBe("near");
    expect(sizeVerdict(50 * MB + 1, 1920)).toBe("over");
  });

  it("khổ ngang 1080: không có trần cố định, 61 MB cho 132 s không bị cảnh báo", () => {
    expect(sizeVerdict(61 * MB, 1080)).toBe("uncapped");
    expect(sizeVerdict(2000 * MB, 1080)).toBe("uncapped");
  });
});
