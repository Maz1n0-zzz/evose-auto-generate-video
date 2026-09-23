import { describe, expect, test } from "vitest";
import { buildFinalizeArgs, resolveBrandAssets } from "./brand-finalize.js";

/** Lấy giá trị đứng ngay sau một cờ trong danh sách tham số ffmpeg. */
function valueAfter(args: string[], flag: string): string | undefined {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
}

const BASE = {
    videoPath: "/out/video.mp4",
    outPath: "/out/video-evose.mp4",
    durationSec: 42.5,
};

describe("buildFinalizeArgs", () => {
    test("có overlay thì thêm input ảnh và filter overlay", () => {
        const args = buildFinalizeArgs({
            ...BASE,
            overlayPng: "/kit/overlay.png",
            musicMp3: null,
        });

        expect(args).toContain("/kit/overlay.png");
        expect(valueAfter(args, "-filter_complex")).toContain("[0:v][1:v]overlay=");
        // Video lấy từ nhánh đã ghép overlay, không phải input gốc.
        expect(valueAfter(args, "-map")).toBe("[vovr]");
    });

    test("tắt overlay thì không còn input ảnh lẫn filter overlay", () => {
        const args = buildFinalizeArgs({
            ...BASE,
            overlayPng: null,
            musicMp3: "/kit/bg.mp3",
        });

        expect(args.join(" ")).not.toContain("overlay=");
        expect(valueAfter(args, "-map")).toBe("0:v");
    });

    test("tắt overlay vẫn giữ nguyên nhạc nền có ducking", () => {
        const args = buildFinalizeArgs({
            ...BASE,
            overlayPng: null,
            musicMp3: "/kit/bg.mp3",
        });

        const fc = valueAfter(args, "-filter_complex") ?? "";
        expect(fc).toContain("sidechaincompress");
        expect(fc).toContain("amix=inputs=2");
        expect(args).toContain("/kit/bg.mp3");
    });

    test("nhạc dùng mức Mazino chốt ngày 2026-09-23 (bản E)", () => {
        // Bản cũ 0.30 + ratio 4: lúc giọng nghỉ nhạc chỉ -32.7 dB, thấp hơn
        // giọng 16 dB, nghe như không có nhạc. Bản E nền to, dìm sâu, nhả nhanh
        // để nhạc kịp lên trong quãng nghỉ dưới 1 giây giữa các câu.
        const fc = valueAfter(buildFinalizeArgs({ ...BASE, overlayPng: null, musicMp3: "/kit/bg.mp3" }), "-filter_complex") ?? "";
        expect(fc).toContain("[1:a]volume=0.80[mus]");
        expect(fc).toContain("sidechaincompress=threshold=0.03:ratio=12:attack=20:release=250");
    });

    test("amix phải tắt normalize, nếu không video giao đi mất 6 dB", () => {
        // Mặc định amix chia biên độ cho số input. Thiếu cờ này thì
        // video-evose.mp4 nhỏ tiếng hơn hẳn voice.mp3 mà không ai ngờ.
        const fc = valueAfter(buildFinalizeArgs({ ...BASE, overlayPng: null, musicMp3: "/kit/bg.mp3" }), "-filter_complex") ?? "";
        expect(fc).toContain("normalize=0");
    });

    test("có bộ hãm đỉnh sau khi trộn để đỉnh cộng dồn không vỡ tiếng", () => {
        const fc = valueAfter(buildFinalizeArgs({ ...BASE, overlayPng: null, musicMp3: "/kit/bg.mp3" }), "-filter_complex") ?? "";
        expect(fc).toContain("alimiter");
    });

    test("chỉ số input của nhạc dịch theo việc có overlay hay không", () => {
        const withOverlay = buildFinalizeArgs({
            ...BASE,
            overlayPng: "/kit/overlay.png",
            musicMp3: "/kit/bg.mp3",
        });
        const withoutOverlay = buildFinalizeArgs({
            ...BASE,
            overlayPng: null,
            musicMp3: "/kit/bg.mp3",
        });

        // Đây chính là chỗ dễ hỏng nhất khi bật/tắt overlay: lấy sai chỉ số là
        // ffmpeg trộn nhầm luồng, video vẫn ra nhưng tiếng sai.
        expect(valueAfter(withOverlay, "-filter_complex")).toContain("[2:a]volume=");
        expect(valueAfter(withoutOverlay, "-filter_complex")).toContain("[1:a]volume=");
    });

    test("không overlay cũng không nhạc thì không sinh filter_complex", () => {
        const args = buildFinalizeArgs({ ...BASE, overlayPng: null, musicMp3: null });

        expect(args).not.toContain("-filter_complex");
        expect(valueAfter(args, "-map")).toBe("0:v");
    });

    test("luôn cắt đúng độ dài phần hình", () => {
        const args = buildFinalizeArgs({
            ...BASE,
            overlayPng: "/kit/overlay.png",
            musicMp3: "/kit/bg.mp3",
        });

        // Thiếu -t thì nhạc lặp vô hạn sẽ kéo video dài ra.
        expect(valueAfter(args, "-t")).toBe("42.5");
        expect(args[args.length - 1]).toBe("/out/video-evose.mp4");
    });
});

describe("resolveBrandAssets", () => {
    test("tìm tài nguyên ở evose-brand-kit tính từ gốc repo", () => {
        const { overlayPng, musicMp3 } = resolveBrandAssets("/repo/output/bai-viet-001");

        expect(overlayPng).toBe("/repo/evose-brand-kit/overlays/overlay-frame.png");
        expect(musicMp3).toBe("/repo/evose-brand-kit/music/background.mp3");
    });

    test('style "light" lấy đúng file overlay bản sáng', () => {
        // Lấy nhầm bản dark cho bộ evose-* thì video ra hai vệt đen chắn ngang.
        const { overlayPng } = resolveBrandAssets("/repo/output/bai-001", "light");
        expect(overlayPng).toBe("/repo/evose-brand-kit/overlays/overlay-frame-light.png");
    });

    test("không truyền style thì mặc định dark (giữ hành vi cũ)", () => {
        const { overlayPng } = resolveBrandAssets("/repo/output/bai-001");
        expect(overlayPng).toContain("overlay-frame.png");
    });
});
