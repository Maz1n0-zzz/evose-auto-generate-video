/**
 * Bộ vẽ chart nến — hàm thuần, không đụng DOM, không đụng mạng.
 *
 * Nhận OHLC thật cộng một khung nhìn, trả về SVG và bảng toạ độ. Worker dựng khung
 * đọc bảng toạ độ rồi gắn hiệu ứng, không bao giờ tự gõ vị trí nến. Trước đây mỗi
 * worker đặt từng cây nến bằng tay nên chart nhìn như vẽ đại, và luật WTC "chart phải
 * vẽ từ dữ liệu thật" bị vi phạm âm thầm.
 *
 * Chỉ số trong `Zone` và `Marker` là chỉ số TUYỆT ĐỐI trong mảng `candles`. Nhờ vậy
 * một vùng khai một lần dùng được ở mọi mức zoom: đổi khung nhìn thì ô tự to nhỏ theo.
 */

export interface Candle {
  /** Mốc mở nến, mili giây UTC. */
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
}

export interface Theme {
  panel: string;
  border: string;
  grid: string;
  axisText: string;
  up: string;
  down: string;
  gold: string;
  textDim: string;
  demandFill: string;
  supplyFill: string;
}

/** TradingView dark hoà với bảng màu WTC: nền gần đen, nến xanh đỏ WTC, chú thích vàng. */
export const DEFAULT_THEME: Theme = {
  panel: "#0B0E12",
  border: "#2A2E39",
  grid: "#1A1E27",
  axisText: "#787B86",
  up: "#26D07C",
  down: "#FF4B4B",
  gold: "#E8B018",
  textDim: "#9C9790",
  demandFill: "rgba(38,208,124,0.12)",
  supplyFill: "rgba(255,75,75,0.12)",
};

export interface Viewport {
  /** Chỉ số nến đầu, tính trong mảng đầy đủ. */
  from: number;
  /** Chỉ số nến cuối, không bao gồm. */
  to: number;
  /** Ghi đè biên giá để camera zoom có kiểm soát. Bỏ trống thì lấy từ nến trong khung. */
  priceLo?: number;
  priceHi?: number;
  /** Đệm trên dưới theo tỉ lệ biên độ giá. Mặc định 0.08. */
  padFrac?: number;
}

export interface Panel {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Bề ngang trục giá bên phải. */
  priceAxisW: number;
  /** Chiều cao trục thời gian bên dưới. */
  timeAxisH: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Scale {
  plot: Rect;
  lo: number;
  hi: number;
  pitch: number;
  bodyW: number;
  /** Tâm nến theo chỉ số TUYỆT ĐỐI. */
  xOf(i: number): number;
  yOf(p: number): number;
}

export interface Zone {
  from: number;
  to: number | "end";
  low: number;
  high: number;
  kind: "demand" | "supply";
  label?: string;
}

export interface Level {
  price: number;
  color?: string;
  dash?: string;
  /** Vẽ thẻ giá trên trục bên phải. */
  tag?: boolean;
}

export interface Marker {
  i: number;
  price: number;
  label?: string;
}

export interface Annotations {
  zones?: Zone[];
  levels?: Level[];
  markers?: Marker[];
}

export interface ChartInput {
  /** Toàn bộ dữ liệu, không cắt sẵn. Khung nhìn do `view` quyết định. */
  candles: Candle[];
  view: Viewport;
  panel: Panel;
  symbol: string;
  interval: string;
  theme?: Theme;
  annotations?: Annotations;
}

export interface CandleCoord {
  i: number;
  t: number;
  x: number;
  yO: number;
  yH: number;
  yL: number;
  yC: number;
  /** Chiều cao thân đã áp sàn, dùng thẳng được. */
  bodyH: number;
  up: boolean;
}

export interface ZoneCoord extends Rect {
  id: string;
  kind: "demand" | "supply";
  labelX: number;
  labelY: number;
  /** Bề ngang ước lượng của nhãn, 0 nếu vùng không có nhãn. */
  labelW: number;
}

export interface MarkerCoord {
  id: string;
  x: number;
  y: number;
  labelX: number;
  labelY: number;
  labelAnchor: "start" | "end";
}

export interface TimeLabel {
  x: number;
  /** Nửa bề ngang ước lượng, để kiểm nhãn có lọt ra mép không. */
  halfW: number;
  text: string;
}

export interface Coords {
  plot: Rect;
  priceLo: number;
  priceHi: number;
  pitch: number;
  bodyW: number;
  candles: CandleCoord[];
  zones: ZoneCoord[];
  levels: { price: number; y: number }[];
  markers: MarkerCoord[];
  timeLabels: TimeLabel[];
  priceLabels: { price: number; y: number; text: string }[];
}

export interface ChartOutput {
  svg: string;
  scale: Scale;
  coords: Coords;
  panel: Panel;
}

const MIN_BODY_H = 1.5;
const MARKER_GAP = 24;
const MARKER_FONT = 28;
const TIME_FONT = 22;
const TIME_LABEL_GAP = 24;
const ZONE_LABEL_FONT = 30;
/** Bề ngang một ký tự so với cỡ chữ. Acumin Pro là font tỉ lệ nên lấy trung bình;
 *  JetBrains Mono là font đều nên lấy đúng bước tiến 0.6em của nó. */
const CHAR_W = 0.56;
const MONO_CHAR_W = 0.6;

const textHalfW = (s: string, font: number, cw = CHAR_W) => (s.length * font * cw) / 2;

/**
 * Tấm nền lót sau một nhãn. Không có nó thì đường lưới giá cắt ngang chữ: nhãn
 * "ORIGIN CANDLE" từng nằm đúng mức 110.000 và bị gạch một đường xám qua giữa.
 */
function plate(id: string, x: number, baselineY: number, w: number, font: number, bg: string): string {
  const padX = 10;
  const top = baselineY - font * 0.78;
  return `<rect id="${id}" x="${round1(x - padX)}" y="${round1(top)}" width="${round1(w + padX * 2)}" height="${round1(font * 1.06)}" fill="${bg}" fill-opacity="0.88"/>`;
}
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
const round1 = (v: number) => Math.round(v * 10) / 10;

export function makeScale(candles: Candle[], view: Viewport, panel: Panel): Scale {
  const win = candles.slice(view.from, view.to);
  if (win.length === 0) {
    throw new Error(`khung nhìn rỗng: không có nến nào trong khoảng [${view.from}, ${view.to})`);
  }
  const plot: Rect = {
    x: panel.x,
    y: panel.y,
    w: panel.w - panel.priceAxisW,
    h: panel.h - panel.timeAxisH,
  };

  let lo: number;
  let hi: number;
  if (view.priceLo !== undefined && view.priceHi !== undefined) {
    lo = view.priceLo;
    hi = view.priceHi;
  } else {
    lo = Math.min(...win.map((c) => c.l));
    hi = Math.max(...win.map((c) => c.h));
    const pad = (view.padFrac ?? 0.08) * (hi - lo);
    lo -= pad;
    hi += pad;
  }
  // Giá phẳng tuyệt đối: nới ra một chút để không chia cho 0.
  if (hi - lo < 1e-9) {
    const nudge = Math.abs(hi) * 0.01 || 1;
    lo -= nudge;
    hi += nudge;
  }

  const pitch = plot.w / win.length;
  const bodyW = Math.max(2, Math.round(pitch * 0.62));
  return {
    plot,
    lo,
    hi,
    pitch,
    bodyW,
    xOf: (i) => plot.x + pitch * (i - view.from + 0.5),
    yOf: (p) => plot.y + plot.h * (1 - (p - lo) / (hi - lo)),
  };
}

/** Chọn bước chia trục giá sao cho ra số tròn. Bước luôn là 1, 2, 2.5, 5 hoặc 10 nhân luỹ thừa 10. */
export function priceTicks(lo: number, hi: number, want = 6): number[] {
  if (!(hi > lo)) return [lo];
  const raw = (hi - lo) / want;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  // Làm tròn theo bước chứ không cộng dồn: cộng dồn làm trôi số thập phân.
  const dec = Math.max(0, -Math.floor(Math.log10(step)) + 1);
  const first = Math.ceil(lo / step) * step;
  const out: number[] = [];
  for (let k = 0; ; k++) {
    const v = Number((first + k * step).toFixed(dec));
    if (v > hi + 1e-9) break;
    out.push(v);
  }
  return out;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Nhóm ba chữ số bằng tay. `toLocaleString` phụ thuộc bản ICU của máy, không tất định. */
export function fmtPrice(v: number): string {
  const dec = Math.abs(v) < 100 ? 2 : 0;
  const neg = v < 0;
  const [int, frac] = Math.abs(v).toFixed(dec).split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${neg ? "-" : ""}${grouped}${frac ? `.${frac}` : ""}`;
}

const fmtDay = (t: number) => {
  const d = new Date(t);
  return `${String(d.getUTCDate()).padStart(2, "0")} ${MONTHS[d.getUTCMonth()]}`;
};

/** Nhãn năm của khung nhìn. Dữ liệu cũ mà không ghi năm thì người xem tưởng là giá hôm nay. */
function yearLabel(win: Candle[]): string {
  const a = new Date(win[0].t).getUTCFullYear();
  const b = new Date(win[win.length - 1].t).getUTCFullYear();
  return a === b ? `${a}` : `${a}–${b}`;
}

export function renderChart(input: ChartInput): ChartOutput {
  const th = input.theme ?? DEFAULT_THEME;
  const { panel, view } = input;
  const scale = makeScale(input.candles, view, panel);
  const { plot } = scale;
  const win = input.candles.slice(view.from, view.to);
  const axX = plot.x + plot.w;
  const a = input.annotations ?? {};
  const P: string[] = [];

  P.push(`<rect x="${panel.x}" y="${panel.y}" width="${panel.w}" height="${panel.h}" fill="${th.panel}" stroke="${th.border}" stroke-width="1"/>`);

  // ── lưới ngang và trục giá ──
  const priceLabels = priceTicks(scale.lo, scale.hi).map((v) => ({ price: v, y: scale.yOf(v), text: fmtPrice(v) }));
  for (const t of priceLabels) {
    P.push(`<line x1="${plot.x}" y1="${round1(t.y)}" x2="${axX}" y2="${round1(t.y)}" stroke="${th.grid}" stroke-width="1"/>`);
    P.push(`<text x="${axX + 12}" y="${round1(t.y + 9)}" fill="${th.axisText}" font-family="JetBrains Mono" font-size="24" style="font-variant-numeric:tabular-nums">${t.text}</text>`);
  }

  // ── lưới dọc và trục thời gian ──
  const every = Math.max(1, Math.round(win.length / 7));
  const timeLabels: TimeLabel[] = [];
  win.forEach((c, k) => {
    if (k % every) return;
    const x = scale.xOf(view.from + k);
    P.push(`<line x1="${round1(x)}" y1="${plot.y}" x2="${round1(x)}" y2="${plot.y + plot.h}" stroke="${th.grid}" stroke-width="1"/>`);
    const text = fmtDay(c.t);
    const halfW = textHalfW(text, TIME_FONT, MONO_CHAR_W);
    // Nhãn tràn mép thì BỎ hẳn, không kéo vào trong. Kéo vào làm nó đâm vào nhãn kế
    // bên và khoảng cách giữa các mốc thành lệch ("20 Jun03 Jul").
    if (x - halfW < panel.x || x + halfW > panel.x + panel.w) return;
    const prev = timeLabels[timeLabels.length - 1];
    if (prev && x - halfW < prev.x + prev.halfW + TIME_LABEL_GAP) return;
    timeLabels.push({ x, halfW, text });
  });
  for (const l of timeLabels) {
    P.push(`<text x="${round1(l.x)}" y="${plot.y + plot.h + 34}" fill="${th.axisText}" font-family="JetBrains Mono" font-size="${TIME_FONT}" text-anchor="middle">${l.text}</text>`);
  }

  // ── ô vùng, toạ độ lấy từ giá thật ──
  const zones: ZoneCoord[] = [];
  const zoneLabels: string[] = [];
  (a.zones ?? []).forEach((z, n) => {
    const xRaw = scale.xOf(z.from) - scale.pitch / 2;
    const x = clamp(xRaw, plot.x, axX);
    const x2 = z.to === "end" ? axX : clamp(scale.xOf(z.to) + scale.pitch / 2, plot.x, axX);
    const yT = scale.yOf(z.high);
    const yB = scale.yOf(z.low);
    const id = `zone-${n}`;
    const labelY = Math.max(plot.y + ZONE_LABEL_FONT, yT - 16);
    const labelX = x + 16;
    const labelW = z.label ? textHalfW(z.label, ZONE_LABEL_FONT) * 2 : 0;
    zones.push({ id, kind: z.kind, x, y: yT, w: x2 - x, h: yB - yT, labelX, labelY, labelW });
    P.push(`<g id="${id}"><rect x="${round1(x)}" y="${round1(yT)}" width="${round1(x2 - x)}" height="${round1(yB - yT)}" fill="${z.kind === "demand" ? th.demandFill : th.supplyFill}" stroke="${th.gold}" stroke-width="3" stroke-dasharray="8 8"/></g>`);
    // Nhãn để dành, vẽ SAU nến. Vẽ ở đây thì cây nến nào chồng lên là che mất chữ.
    if (z.label) {
      zoneLabels.push(
        plate(`${id}-plate`, labelX, labelY, labelW, ZONE_LABEL_FONT, th.panel) +
          `\n  <text x="${round1(labelX)}" y="${round1(labelY)}" fill="${th.gold}" font-family="Acumin Pro" font-size="${ZONE_LABEL_FONT}" font-weight="600" letter-spacing="2">${esc(z.label)}</text>`,
      );
    }
  });

  // ── nến, mỗi cây một nhóm có id để GSAP bám vào ──
  const candles: CandleCoord[] = win.map((c, k) => {
    const i = view.from + k;
    const up = c.c >= c.o;
    const x = scale.xOf(i);
    const yO = scale.yOf(c.o);
    const yC = scale.yOf(c.c);
    const bodyH = Math.max(MIN_BODY_H, Math.abs(yC - yO));
    return { i, t: c.t, x, yO, yH: scale.yOf(c.h), yL: scale.yOf(c.l), yC, bodyH, up };
  });
  for (const c of candles) {
    const col = c.up ? th.up : th.down;
    const top = Math.min(c.yO, c.yC);
    P.push(
      `<g id="cdl-${String(c.i).padStart(3, "0")}">` +
        `<line x1="${round1(c.x)}" y1="${round1(c.yH)}" x2="${round1(c.x)}" y2="${round1(c.yL)}" stroke="${col}" stroke-width="2"/>` +
        `<rect x="${round1(c.x - scale.bodyW / 2)}" y="${round1(top)}" width="${scale.bodyW}" height="${round1(c.bodyH)}" fill="${col}"/>` +
        `</g>`,
    );
  }

  P.push(...zoneLabels);

  // ── đường mức ──
  const levels = (a.levels ?? []).map((l) => {
    const y = scale.yOf(l.price);
    const col = l.color ?? th.textDim;
    P.push(`<line x1="${plot.x}" y1="${round1(y)}" x2="${axX}" y2="${round1(y)}" stroke="${col}" stroke-width="2" stroke-dasharray="${l.dash ?? "10 8"}"/>`);
    if (l.tag) {
      P.push(`<rect x="${axX + 1}" y="${round1(y - 19)}" width="${panel.priceAxisW - 2}" height="38" fill="${col}"/>`);
      P.push(`<text x="${axX + 12}" y="${round1(y + 9)}" fill="#000000" font-family="JetBrains Mono" font-size="24" font-weight="700">${fmtPrice(l.price)}</text>`);
    }
    return { price: l.price, y };
  });

  // ── mốc đánh dấu, nhãn tự lật khi gần mép phải ──
  const markers: MarkerCoord[] = (a.markers ?? []).map((m, n) => {
    const x = scale.xOf(m.i);
    const y = scale.yOf(m.price);
    const w = m.label ? m.label.length * MARKER_FONT * CHAR_W : 0;
    const flip = x + MARKER_GAP + w > axX;
    const labelX = clamp(flip ? x - MARKER_GAP : x + MARKER_GAP, plot.x, axX);
    const id = `mk-${n}`;
    P.push(`<g id="${id}"><circle cx="${round1(x)}" cy="${round1(y)}" r="11" fill="none" stroke="${th.gold}" stroke-width="4"/></g>`);
    if (m.label) {
      P.push(plate(`${id}-plate`, flip ? labelX - w : labelX, y + 10, w, MARKER_FONT, th.panel));
      P.push(`<text x="${round1(labelX)}" y="${round1(y + 10)}" fill="${th.gold}" font-family="Acumin Pro" font-size="${MARKER_FONT}" font-weight="600" text-anchor="${flip ? "end" : "start"}">${esc(m.label)}</text>`);
    }
    return { id, x, y, labelX, labelY: y + 10, labelAnchor: flip ? "end" : "start" };
  });

  // ── nhãn mã, khung thời gian và NĂM ──
  P.push(`<text x="${plot.x + 20}" y="${plot.y + 44}" fill="${th.textDim}" font-family="JetBrains Mono" font-size="26" font-weight="700" letter-spacing="2">${esc(input.symbol)} · ${esc(input.interval)} · ${yearLabel(win)}</text>`);
  P.push(`<line x1="${axX}" y1="${panel.y}" x2="${axX}" y2="${panel.y + panel.h}" stroke="${th.border}" stroke-width="1"/>`);
  P.push(`<line x1="${panel.x}" y1="${plot.y + plot.h}" x2="${panel.x + panel.w}" y2="${plot.y + plot.h}" stroke="${th.border}" stroke-width="1"/>`);

  return {
    svg: P.join("\n  "),
    scale,
    panel,
    coords: {
      plot,
      priceLo: scale.lo,
      priceHi: scale.hi,
      pitch: scale.pitch,
      bodyW: scale.bodyW,
      candles,
      zones,
      levels,
      markers,
      timeLabels,
      priceLabels,
    },
  };
}
