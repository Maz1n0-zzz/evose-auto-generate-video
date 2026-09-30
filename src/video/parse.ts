/**
 * Hàm thuần của quy trình làm video: đọc SCRIPT.md, cue SFX, chuẩn hoá font khung.
 * Tách riêng để test mà không chạy lệnh.
 */

export interface ScriptLine {
  frame: number;
  text: string;
  /** Giây lặng nối thêm cuối khung (cảnh kết cần chỗ cho logo). */
  padSec: number;
}

export interface Script {
  speed: number;
  lines: ScriptLine[];
}

/**
 * SCRIPT.md: header có `**Speed:** 1.06` (tuỳ chọn); mỗi khung một mục
 * `## Line N — nhãn (Frame N)`, tuỳ chọn `**Pad:** 1.2s`, lời đọc thụt lề 4 dấu cách.
 */
export function parseScript(md: string): Script {
  const speedM = md.match(/\*\*Speed:\*\*\s*([\d.]+)/i);
  const lines: ScriptLine[] = [];
  let cur: ScriptLine | null = null;
  for (const line of md.split(/\r?\n/)) {
    const h = line.match(/^##\s+Line\s+\d+.*\(Frame\s+(\d+)\)/i);
    if (h) {
      cur = { frame: Number(h[1]), text: "", padSec: 0 };
      lines.push(cur);
      continue;
    }
    if (!cur) continue;
    const pad = line.match(/^\*\*Pad:\*\*\s*([\d.]+)/i);
    if (pad) cur.padSec = Number(pad[1]);
    else if (/^( {4}|\t)\S/.test(line)) cur.text = `${cur.text} ${line.trim()}`.trim();
  }
  const bad = lines.filter((l) => !l.text);
  if (bad.length) throw new Error(`SCRIPT.md: khung ${bad.map((l) => l.frame).join(", ")} không có lời đọc (lời phải thụt lề 4 dấu cách)`);
  if (lines.length < 2) throw new Error("SCRIPT.md cần ít nhất 2 khung có lời");
  return { speed: speedM ? Number(speedM[1]) : 1, lines };
}

export function parseCues(field: string): { name: string; at: number }[] {
  return field
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s && s.toLowerCase() !== "none")
    .map((s) => {
      const m = s.match(/^([a-z0-9-]+)\s*@\s*([\d.]+)s?$/i);
      if (!m) throw new Error(`cue SFX sai cú pháp "${s}" (đúng: tên@giây, vd pop@2.6)`);
      return { name: m[1].toLowerCase(), at: Number(m[2]) };
    });
}

const FONT_FACES = [
  '@font-face { font-family: "Hanken Grotesk"; src: url("assets/fonts/HankenGrotesk-VF.ttf") format("truetype"); font-weight: 100 900; }',
  '@font-face { font-family: "JetBrains Mono"; src: url("assets/fonts/JetBrainsMono-Regular.ttf") format("truetype"); font-weight: 100 599; }',
  '@font-face { font-family: "JetBrains Mono"; src: url("assets/fonts/JetBrainsMono-Bold.ttf") format("truetype"); font-weight: 600 900; }',
].join("\n    ");

/** Worker hay tự chế đường dẫn font hoặc tải từ Google Fonts. Thay hết bằng font trong dự án. */
export function normalizeFonts(html: string): string {
  let out = html.replace(/@import\s+url\([^)]*fonts\.googleapis[^)]*\)\s*;?/g, "");
  out = out.replace(/<link[^>]*fonts\.googleapis[^>]*>/g, "");
  const blocks = out.match(/@font-face\s*\{[^}]*\}/g) ?? [];
  if (blocks.length === 0) return out.replace(/<style>/, `<style>\n    ${FONT_FACES}`);
  const first = out.indexOf(blocks[0]!);
  for (const b of blocks) out = out.replace(b, "");
  return out.slice(0, first) + FONT_FACES + out.slice(first);
}

