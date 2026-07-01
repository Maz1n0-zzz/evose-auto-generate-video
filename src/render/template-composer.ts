import { spawn } from "node:child_process";
import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { log } from "../utils/logger.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
/** Repo-root/templates — where vendored HyperFrames templates live. */
const TEMPLATES_DIR = join(__dirname, "..", "..", "templates");

export type Aspect = "16:9" | "9:16" | "1:1";

/**
 * Each aspect renders a dedicated composition file authored at that native
 * canvas (these templates use absolute-px layouts, so we re-lay-out per aspect
 * rather than scale a single composition). Missing file → fall back to index.html.
 */
const ASPECT_ENTRY: Record<Aspect, string> = {
    "16:9": "index.html",
    "9:16": "compositions/portrait.html",
    "1:1": "compositions/square.html",
};

export interface ComposeArgs {
    /** Folder name under templates/, e.g. "frame-bold-poster". */
    templateId: string;
    /** Content slots, matching the template's data-composition-variables schema. */
    inputs: Record<string, unknown>;
    /** Absolute or repo-relative output .mp4 path. */
    outputPath: string;
    /** Force an output aspect. Omit to render the template's native canvas. */
    aspect?: Aspect;
    fps?: number;
    quality?: "draft" | "standard" | "high";
}

/**
 * HyperFrames serves HTML via a local HTTP server rooted at templateDir.
 * Requests for "assets/x.png" resolve to templateDir/assets/x.png — NOT
 * templateDir/compositions/assets/x.png. Copy images to templateDir/assets/
 * so the browser can load them over the local HTTP server.
 */
function resolveImageAssets(
    inputs: Record<string, unknown>,
    templateDir: string,
): Record<string, unknown> {
    const assetsDir = join(templateDir, "assets");
    const resolved: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(inputs)) {
        if (typeof value === "string") {
            let filePath = value;
            if (filePath.startsWith("file://")) {
                filePath = fileURLToPath(filePath);
            }
            if (!isAbsolute(filePath)) {
                const cwdAbsolute = resolve(process.cwd(), filePath);
                if (existsSync(cwdAbsolute)) filePath = cwdAbsolute;
            }
            if (
                isAbsolute(filePath) &&
                /\.(png|jpe?g|webp|gif|svg)$/i.test(filePath) &&
                existsSync(filePath)
            ) {
                mkdirSync(assetsDir, { recursive: true });
                const filename = basename(filePath);
                copyFileSync(filePath, join(assetsDir, filename));
                log.info(`Asset resolved: ${filename} → assets/`);
                resolved[key] = `assets/${filename}`;
                continue;
            }
        }
        resolved[key] = value;
    }
    return resolved;
}

/** Dimensions for each aspect ratio (px). */
const ASPECT_DIMS: Record<Aspect, [number, number]> = {
    "9:16": [1080, 1920],
    "16:9": [1920, 1080],
    "1:1": [1080, 1080],
};

/**
 * CSS-only frames (no GSAP, no window.__timelines) cause HyperFrames@0.6.94
 * to exit with code 1 ("zero duration"). Inject the required HyperFrames
 * metadata attributes into a temp copy so the original template stays pristine.
 */
function ensureHyperframesMeta(
    templateDir: string,
    entryFile: string,
    aspect: Aspect | undefined,
): { renderDir: string; cleanup: () => void } {
    const html = readFileSync(join(templateDir, entryFile), "utf8");
    if (html.includes("data-composition-id")) {
        return { renderDir: templateDir, cleanup: () => {} };
    }

    const [w, h] = ASPECT_DIMS[aspect ?? "9:16"];
    const attrs = `data-composition-id="main" data-width="${w}" data-height="${h}" data-duration="15"`;

    let patched = html.replace(
        /(<div\b[^>]*\bid="root")/,
        `$1 ${attrs}`,
    );
    if (patched === html) {
        // Fallback: first <div immediately after <body
        patched = html.replace(/(<body[^>]*>[\s\S]*?<div)/, `$1 ${attrs}`);
    }

    // mkdtempSync creates an existing dir; cpSync(src, existingDir) would nest src
    // inside dest on POSIX. Use a child path so cpSync creates it fresh as a copy.
    const tempParent = mkdtempSync(join(tmpdir(), "hf-inject-"));
    const renderDir = join(tempParent, "tpl");
    cpSync(templateDir, renderDir, { recursive: true });
    writeFileSync(join(renderDir, entryFile), patched, "utf8");
    log.info(`CSS-only frame detected — injected data-duration=15 into temp dir`);

    return {
        renderDir,
        cleanup: () => {
            try { rmSync(tempParent, { recursive: true, force: true }); } catch {}
        },
    };
}

/**
 * Render one vendored HyperFrames template into an MP4, injecting `inputs`
 * as composition variables. This is the deterministic "fill the slots" step:
 * the agent only supplies text, the template owns all the visual design.
 */
export async function composeTemplate(args: ComposeArgs): Promise<string> {
    const { templateId, inputs, fps = 30, quality = "standard", aspect } = args;
    const templateDir = join(TEMPLATES_DIR, templateId);
    if (!existsSync(join(templateDir, "index.html"))) {
        throw new Error(`Template not found: ${templateDir}/index.html`);
    }

    // Pick the composition file for the requested aspect (fall back to index.html).
    const entry = aspect ? ASPECT_ENTRY[aspect] : "index.html";
    const entryFile = existsSync(join(templateDir, entry))
        ? entry
        : "index.html";

    const outputPath = isAbsolute(args.outputPath)
        ? args.outputPath
        : resolve(process.cwd(), args.outputPath);

    // For CSS-only frames, work from a temp dir with injected HyperFrames attrs.
    const { renderDir, cleanup } = ensureHyperframesMeta(templateDir, entryFile, aspect);

    // Pass variables via a temp file, NOT --variables: a JSON arg through
    // npx + shell:true on Windows mangles quotes/Unicode (em-dash, Vietnamese)
    // and the render silently no-ops. A file is shell-safe and UTF-8 clean.
    const resolvedInputs = resolveImageAssets(inputs, renderDir);
    const varsFile = join(
        mkdtempSync(join(tmpdir(), "hf-vars-")),
        "variables.json",
    );
    writeFileSync(varsFile, JSON.stringify(resolvedInputs), "utf8");

    const spawnArgs = [
        // -y: never prompt to install. Pinned version → deterministic renders.
        "-y",
        "hyperframes@0.6.94",
        "render",
        renderDir,
        "--composition",
        entryFile,
        "--output",
        outputPath,
        "--fps",
        String(fps),
        "--quality",
        quality,
        "--variables-file",
        varsFile,
    ];

    log.info(`Compose ${templateId} (${entryFile}) → ${outputPath}`);

    try {
        await new Promise<void>((resolve, reject) => {
            const proc = spawn("npx", spawnArgs, {
                stdio: ["ignore", "inherit", "inherit"],
                shell: true,
            });
            proc.on("close", (code) =>
                code === 0
                    ? resolve()
                    : reject(new Error(`hyperframes render failed (exit ${code})`)),
            );
            proc.on("error", reject);
        });
    } finally {
        cleanup();
    }

    log.info(`Rendered: ${outputPath}`);
    return outputPath;
}

/** POC entry: `tsx src/render/template-composer.ts` renders sample clips. */
// pathToFileURL handles Windows backslash paths (a raw `file://${argv[1]}`
// never matches import.meta.url on win32, silently skipping this block).
if (
    process.argv[1] &&
    import.meta.url === pathToFileURL(process.argv[1]).href
) {
    const inputs = {
        kicker: "Evose",
        date: "12 · 06 · 2026",
        figure: "5.5",
        headline: ["GPT 5.5", "ra mắt.", "Mạnh nhất."],
        standfirst:
            "OpenAI vừa công bố mô hình mạnh nhất từ trước tới nay — nhanh hơn, rẻ hơn, hiểu tiếng Việt tốt hơn.",
        footer_left: "Evose",
        footer_right: "https://evose.ai/",
    };
    (async () => {
        await composeTemplate({
            templateId: "frame-bold-poster",
            inputs,
            aspect: "16:9",
            outputPath: "output/poc-bold-poster-16x9.mp4",
        });
        await composeTemplate({
            templateId: "frame-bold-poster",
            inputs,
            aspect: "9:16",
            outputPath: "output/poc-bold-poster-9x16.mp4",
        });
    })().catch((err) => {
        console.error(err);
        process.exit(1);
    });
}
