import { z } from "zod";

/**
 * Script schema for the HyperFrames template pipeline. Each scene names a
 * vendored template under templates/<templateId>/ and supplies `inputs` matching that template's
 * data-composition-variables. The agent only fills text — the template owns the
 * visual design. inputs are kept loose here; each template validates its own.
 */

const SfxSpec = z.object({
  name: z.string().min(1),
  volume: z.number().min(0).max(1).default(0.4),
  startOffsetSec: z.number().default(0),
});
export type TplSfxSpecType = z.infer<typeof SfxSpec>;

const TemplateScene = z.object({
  id: z.string().min(1),
  type: z.enum(["hook", "body", "outro"]),
  /** Spoken narration (Vietnamese, spelled-out numbers — see skill rules). */
  voiceText: z.string(),
  /** Độ dài cảnh câm (giây). Chỉ dùng khi voiceText là chuỗi rỗng. */
  silentSec: z.number().min(0.5).max(15).default(3),
  /** Nối thêm bấy nhiêu giây lặng sau lời đọc, để cảnh đứng lâu hơn. */
  padSec: z.number().min(0).max(10).default(0),
  /** Folder name under templates/, e.g. "frame-bold-poster". */
  templateId: z.string().min(1),
  /** Text slots for the template's data-composition-variables. */
  inputs: z.record(z.string(), z.unknown()).default({}),
  /** Optional SFX override (else picked per scene.type + voiceText keywords). */
  sfx: SfxSpec.optional(),
});
export type TemplateSceneType = z.infer<typeof TemplateScene>;

export const TemplateScriptSchema = z.object({
  version: z.literal("1.0"),
  /** Discriminator: marks this as a HyperFrames-template script. */
  renderer: z.literal("hyperframes"),
  metadata: z.object({
    title: z.string().min(1),
    source: z.object({
      url: z.string(),
      domain: z.string(),
      image: z.string().url().nullable(),
    }),
    channel: z.string().min(1),
  }),
  voice: z.object({
    /** Không quyết định giọng đọc — TTS_PROVIDER trong .env.local mới quyết định. */
    provider: z.enum(["omnivoice", "elevenlabs"]).default("elevenlabs"),
    speed: z.number().min(0.5).max(2.0),
  }),
  /** Output aspect for every scene (templates render a matching composition). */
  aspect: z.enum(["9:16", "16:9", "1:1"]).default("9:16"),
  /**
   * Lớp hoàn thiện thương hiệu.
   *
   * `overlay` mặc định BẬT để mọi script cũ (bộ `frame-*`, vốn dựa vào overlay
   * để có nhận diện trên từng cảnh) render lại vẫn ra đúng kết quả như trước.
   * Bộ `evose-*` nền sáng thì đặt `false`: nhận diện chỉ nằm ở cảnh mở và cảnh
   * kết, giống video mẫu. Nhạc nền không chịu ảnh hưởng của cờ này.
   */
  brand: z
    .object({
      overlay: z.boolean().default(true),
      /**
       * Kiểu overlay. `dark` là lớp chữ trắng trên dải tối — hợp bộ `frame-*`
       * nền tối. `light` là chữ navy trên dải giấy mờ — dùng cho bộ `evose-*`
       * nền sáng, vì dải tối đặt lên nền giấy sẽ thành hai vệt đen chắn ngang.
       */
      style: z.enum(["dark", "light"]).default("dark"),
    })
    .default({ overlay: true, style: "dark" }),
  scenes: z
    .array(TemplateScene)
    .min(3)
    .max(12)
    .refine((s) => s[0]?.type === "hook", { message: "scenes[0] must be type=hook" })
    .refine((s) => s[s.length - 1]?.type === "outro", { message: "last scene must be type=outro" }),
});

export type TemplateScript = z.infer<typeof TemplateScriptSchema>;
