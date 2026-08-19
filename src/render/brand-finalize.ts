import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * Lớp hoàn thiện thương hiệu Evose: đè khung header/footer và trộn nhạc nền.
 *
 * Bộ template `frame-*` (nền tối) dựa vào lớp overlay để có nhận diện trên mọi
 * cảnh. Bộ `evose-*` (nền sáng) thì KHÔNG — nhận diện chỉ nằm ở cảnh mở và
 * cảnh kết, giống video mẫu. Vì vậy overlay bật/tắt được qua `brand.overlay`
 * trong script.json, mặc định BẬT để script cũ chạy lại không đổi kết quả.
 *
 * Nhạc nền không phụ thuộc cờ này — bộ nào cũng dùng.
 */

export interface FinalizeSpec {
    /** Video đã ghép hình + tiếng. */
    videoPath: string;
    /** Đường dẫn video kết quả. */
    outPath: string;
    /** PNG overlay, hoặc null nếu tắt / không có file. */
    overlayPng: string | null;
    /** MP3 nhạc nền, hoặc null nếu không có file. */
    musicMp3: string | null;
    /** Cắt đúng độ dài phần hình, tránh nhạc nền kéo dài quá video. */
    durationSec: number;
}

/**
 * Dựng danh sách tham số ffmpeg. Tách riêng và thuần tuý để kiểm thử được —
 * chuỗi filter_complex ở đây rất dễ sai một ký tự mà chỉ phát hiện ra khi
 * render xong cả video.
 */
export function buildFinalizeArgs(spec: FinalizeSpec): string[] {
    const { videoPath, outPath, overlayPng, musicMp3, durationSec } = spec;

    const args: string[] = ["-y", "-loglevel", "warning"];
    args.push("-i", videoPath);
    if (overlayPng) args.push("-i", overlayPng);
    // -stream_loop -1: nhạc ngắn hơn video thì lặp lại cho đủ.
    if (musicMp3) args.push("-stream_loop", "-1", "-i", musicMp3);

    const filters: string[] = [];
    let vmap = "0:v";
    if (overlayPng) {
        filters.push("[0:v][1:v]overlay=0:0:format=auto[vovr]");
        vmap = "[vovr]";
    }

    let amap = "0:a";
    if (musicMp3) {
        // Chỉ số input của nhạc phụ thuộc có overlay hay không.
        const mi = overlayPng ? 2 : 1;
        // sidechaincompress: nhạc tự hạ xuống mỗi khi có giọng đọc, rồi tự
        // nâng lại ở khoảng lặng — nếu chỉ hạ volume cố định thì lúc im lặng
        // nhạc sẽ nhỏ một cách vô lý.
        filters.push(
            `[${mi}:a]volume=0.28[mus];` +
            `[0:a]asplit=2[vm][vs];` +
            `[mus][vs]sidechaincompress=threshold=0.04:ratio=10:attack=80:release=400[md];` +
            `[vm][md]amix=inputs=2:duration=first:dropout_transition=0[ao]`,
        );
        amap = "[ao]";
    }

    if (filters.length) args.push("-filter_complex", filters.join(";"));
    args.push("-map", vmap, "-map", amap);
    args.push("-c:v", "libx264", "-preset", "fast", "-crf", "20", "-pix_fmt", "yuv420p");
    args.push("-c:a", "aac", "-b:a", "192k");
    args.push("-t", String(durationSec));
    args.push(outPath);
    return args;
}

/** Vị trí các tài nguyên thương hiệu, tính từ thư mục output của một video. */
export function resolveBrandAssets(outputDir: string): { overlayPng: string; musicMp3: string } {
    const kitDir = resolve(outputDir, "..", "..", "evose-brand-kit");
    return {
        overlayPng: join(kitDir, "overlays", "overlay-frame.png"),
        musicMp3: join(kitDir, "music", "background.mp3"),
    };
}

export interface FinalizeOptions {
    outputDir: string;
    videoPath: string;
    durationSec: number;
    /** false → bỏ overlay, vẫn giữ nhạc nền. */
    useOverlay: boolean;
}

/** Chạy ffmpeg. Không có overlay lẫn nhạc thì bỏ qua hẳn, không tạo file thừa. */
export async function runBrandFinalize(opts: FinalizeOptions): Promise<string | null> {
    const { outputDir, videoPath, durationSec, useOverlay } = opts;
    const { overlayPng, musicMp3 } = resolveBrandAssets(outputDir);

    const overlay = useOverlay && existsSync(overlayPng) ? overlayPng : null;
    const music = existsSync(musicMp3) ? musicMp3 : null;

    console.log(
        `\n[evose] Finalize: overlay=${overlay ? "có" : useOverlay ? "không thấy file" : "tắt theo script"}` +
        ` music=${music ? "có" : "không thấy file"}`,
    );
    if (!overlay && !music) {
        console.log("[evose] Bỏ qua bước hoàn thiện (không có overlay lẫn nhạc).");
        return null;
    }

    const outPath = join(outputDir, "video-evose.mp4");
    const args = buildFinalizeArgs({
        videoPath,
        outPath,
        overlayPng: overlay,
        musicMp3: music,
        durationSec,
    });

    await new Promise<void>((res, rej) => {
        const proc = spawn("ffmpeg", args, { stdio: ["ignore", "inherit", "inherit"], shell: false });
        proc.on("close", (code) =>
            code === 0 ? res() : rej(new Error(`evose finalize ffmpeg thoát mã ${code}`)),
        );
        proc.on("error", rej);
    });
    console.log(`[evose] OK video cuối: ${outPath}`);
    return outPath;
}
