/**
 * File cảnh: mô tả các khung chart cần sinh cho một video.
 *
 * Mọi thứ khai bằng NGÀY, không khai bằng chỉ số, và không khai bằng giá. Chỉ số đổi
 * mỗi lần tải lại dữ liệu, còn giá gõ tay chính là thứ làm chart cũ nhìn như vẽ đại.
 * Biên vùng suy ra từ nến nền, mức giá suy ra từ nến của ngày đó.
 */

import { z } from "zod";
import { baseZone, findIndexByDate } from "./data.js";
import {
  DEFAULT_THEME,
  type Annotations,
  type Candle,
  type Panel,
  type Theme,
  type Viewport,
} from "./render.js";

const Day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "cần ngày dạng YYYY-MM-DD");
const Hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "cần màu dạng #RRGGBB");

export const ThemeSchema = z.object({
  panel: Hex,
  border: Hex,
  grid: Hex,
  axisText: Hex,
  up: Hex,
  down: Hex,
  gold: Hex,
  textDim: Hex,
  demandFill: z.string().min(1),
  supplyFill: z.string().min(1),
});

export const PanelSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number().positive(),
  h: z.number().positive(),
  priceAxisW: z.number().positive(),
  timeAxisH: z.number().positive(),
});

/** Lấy giá nào của cây nến làm mốc. */
const Pick = z.enum(["open", "high", "low", "close"]);

const ZoneSpec = z.object({
  baseFrom: Day,
  baseTo: Day,
  /** Ngày kết thúc ô, hoặc "end" để kéo tới mép phải. */
  to: z.union([Day, z.literal("end")]).default("end"),
  kind: z.enum(["demand", "supply"]),
  label: z.string().optional(),
});

const MarkerSpec = z.object({ date: Day, at: Pick.default("low"), label: z.string().optional() });

const LevelSpec = z.object({
  date: Day,
  at: Pick.default("close"),
  color: Hex.optional(),
  dash: z.string().optional(),
  tag: z.boolean().default(false),
});

const ShotSpec = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/, "id chỉ gồm chữ thường, số và gạch nối, bắt đầu bằng chữ"),
  fromDate: Day,
  toDate: Day,
  /** Ghi đè biên giá bằng giá của hai ngày, để camera zoom có kiểm soát. */
  priceLoDate: Day.optional(),
  priceHiDate: Day.optional(),
  padFrac: z.number().min(0).max(0.5).optional(),
  zones: ZoneSpec.array().default([]),
  markers: MarkerSpec.array().default([]),
  levels: LevelSpec.array().default([]),
});

export const SceneSchema = z.object({
  dataset: z.string().min(1),
  theme: z.string().min(1).optional(),
  interval: z.string().min(1),
  panel: PanelSchema,
  shots: ShotSpec.array().min(1),
});

export type Scene = z.infer<typeof SceneSchema>;
export type Shot = z.infer<typeof ShotSpec>;

export function parseScene(raw: unknown, where: string): Scene {
  const r = SceneSchema.safeParse(raw);
  if (!r.success) {
    const detail = r.error.issues.map((i) => `${i.path.join(".") || "(gốc)"}: ${i.message}`).join("; ");
    throw new Error(`${where}: sai định dạng — ${detail}`);
  }
  const ids = r.data.shots.map((s) => s.id);
  const dup = ids.find((id, i) => ids.indexOf(id) !== i);
  if (dup) throw new Error(`${where}: hai khung cùng id "${dup}"`);
  return r.data;
}

export function parseTheme(raw: unknown, where: string): Theme {
  const r = ThemeSchema.safeParse(raw);
  if (!r.success) {
    const detail = r.error.issues.map((i) => `${i.path.join(".") || "(gốc)"}: ${i.message}`).join("; ");
    throw new Error(`${where}: sai định dạng — ${detail}`);
  }
  return r.data;
}

const pick = (c: Candle, at: z.infer<typeof Pick>) => (at === "open" ? c.o : at === "high" ? c.h : at === "low" ? c.l : c.c);

/** Đổi một khung trong file cảnh sang tham số cho bộ vẽ. Ném lỗi có nêu id khung. */
export function resolveShot(
  shot: Shot,
  candles: readonly Candle[],
  panel: Panel,
): { view: Viewport; annotations: Annotations } {
  const at = (day: string) => {
    try {
      return findIndexByDate(candles, day);
    } catch (e) {
      throw new Error(`khung "${shot.id}": ${e instanceof Error ? e.message : e}`);
    }
  };

  const from = at(shot.fromDate);
  const to = at(shot.toDate) + 1;
  if (to <= from) throw new Error(`khung "${shot.id}": toDate ${shot.toDate} không sau fromDate ${shot.fromDate}`);

  const view: Viewport = { from, to, padFrac: shot.padFrac };
  if (shot.priceLoDate && shot.priceHiDate) {
    const lo = pick(candles[at(shot.priceLoDate)], "low");
    const hi = pick(candles[at(shot.priceHiDate)], "high");
    if (!(hi > lo)) throw new Error(`khung "${shot.id}": priceHiDate không cao hơn priceLoDate`);
    view.priceLo = lo;
    view.priceHi = hi;
  } else if (shot.priceLoDate || shot.priceHiDate) {
    throw new Error(`khung "${shot.id}": priceLoDate và priceHiDate phải khai cùng nhau`);
  }

  const annotations: Annotations = {
    zones: shot.zones.map((z) => {
      const bf = at(z.baseFrom);
      const bt = at(z.baseTo);
      if (bt < bf) throw new Error(`khung "${shot.id}": baseTo ${z.baseTo} trước baseFrom ${z.baseFrom}`);
      const { low, high } = baseZone(candles, bf, bt);
      return { from: bf, to: z.to === "end" ? ("end" as const) : at(z.to), low, high, kind: z.kind, label: z.label };
    }),
    markers: shot.markers.map((m) => {
      const i = at(m.date);
      return { i, price: pick(candles[i], m.at), label: m.label };
    }),
    levels: shot.levels.map((l) => {
      const i = at(l.date);
      return { price: pick(candles[i], l.at), color: l.color, dash: l.dash, tag: l.tag };
    }),
  };
  void panel;
  return { view, annotations };
}

export { DEFAULT_THEME };
