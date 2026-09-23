import { describe, expect, test } from "vitest";
import { TemplateScriptSchema } from "./template-script-schema.js";

/** Script tối thiểu hợp lệ; từng test chỉ chồng thêm phần mình quan tâm. */
function makeScript(extra: Record<string, unknown> = {}) {
    return {
        version: "1.0",
        renderer: "hyperframes",
        metadata: {
            title: "Bài kiểm tra",
            source: { url: "https://vi.dụ/bai", domain: "vi.dụ", image: null },
            channel: "EVOSE",
        },
        voice: { provider: "omnivoice", speed: 1 },
        scenes: [
            { id: "s1", type: "hook", voiceText: "Mở đầu.", templateId: "evose-title-card", inputs: {} },
            { id: "s2", type: "body", voiceText: "Thân bài.", templateId: "evose-list", inputs: {} },
            { id: "s3", type: "outro", voiceText: "Kết.", templateId: "evose-logo-card", inputs: {} },
        ],
        ...extra,
    };
}

describe("brand.overlay", () => {
    test("script cũ không khai báo brand thì overlay vẫn BẬT", () => {
        // Đây là điều kiện để bộ frame-* cũ render lại ra đúng kết quả như trước.
        const parsed = TemplateScriptSchema.parse(makeScript());
        expect(parsed.brand.overlay).toBe(true);
    });

    test("đặt false thì tắt được overlay", () => {
        const parsed = TemplateScriptSchema.parse(makeScript({ brand: { overlay: false } }));
        expect(parsed.brand.overlay).toBe(false);
    });

    test("khai báo brand rỗng thì vẫn mặc định BẬT", () => {
        const parsed = TemplateScriptSchema.parse(makeScript({ brand: {} }));
        expect(parsed.brand.overlay).toBe(true);
    });

    test("overlay không phải boolean thì báo lỗi thay vì âm thầm bỏ qua", () => {
        expect(() => TemplateScriptSchema.parse(makeScript({ brand: { overlay: "false" } }))).toThrow();
    });
});

describe("ràng buộc scenes", () => {
    test("cảnh đầu phải là hook", () => {
        const bad = makeScript();
        bad.scenes[0].type = "body";
        expect(() => TemplateScriptSchema.parse(bad)).toThrow(/hook/);
    });

    test("cảnh cuối phải là outro", () => {
        const bad = makeScript();
        bad.scenes[2].type = "body";
        expect(() => TemplateScriptSchema.parse(bad)).toThrow(/outro/);
    });

    test("dưới 3 cảnh thì không hợp lệ", () => {
        const bad = makeScript();
        bad.scenes = bad.scenes.slice(0, 2);
        expect(() => TemplateScriptSchema.parse(bad)).toThrow();
    });
});

describe("voice.provider", () => {
    // Trường này không quyết định giọng đọc (TTS_PROVIDER trong .env.local mới
    // quyết định), nhưng script ghi "elevenlabs" cho khớp thực tế thì không được lỗi.
    test("nhận elevenlabs", () => {
        const r = TemplateScriptSchema.safeParse(makeScript({ voice: { provider: "elevenlabs", speed: 1 } }));
        expect(r.success).toBe(true);
    });

    test("script cũ ghi omnivoice vẫn render lại được", () => {
        expect(TemplateScriptSchema.safeParse(makeScript()).success).toBe(true);
    });
});
