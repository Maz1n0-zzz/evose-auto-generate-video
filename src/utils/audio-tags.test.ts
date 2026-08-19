import { describe, expect, test } from "vitest";
import { hasAudioTags, stripAudioTags } from "./audio-tags.js";

describe("stripAudioTags", () => {
    test("bỏ thẻ đứng đầu câu", () => {
        expect(stripAudioTags("[excited] Chuyện này thay đổi hết.")).toBe(
            "Chuyện này thay đổi hết.",
        );
    });

    test("bỏ nhiều thẻ và không để lại khoảng trắng đôi", () => {
        expect(stripAudioTags("[curious] Vì sao? [thoughtful] Vì máy không đo được.")).toBe(
            "Vì sao? Vì máy không đo được.",
        );
    });

    test("thẻ đứng trước dấu câu không để lại khoảng trắng lơ lửng", () => {
        expect(stripAudioTags("Nghe có vẻ mất công [sighs] đúng không?")).toBe(
            "Nghe có vẻ mất công đúng không?",
        );
    });

    test("thẻ hai chữ vẫn nhận", () => {
        expect(stripAudioTags("[long pause] Rồi sao nữa.")).toBe("Rồi sao nữa.");
    });

    test("GIỮ NGUYÊN ngoặc vuông chứa tiếng Việt — đó là nội dung thật", () => {
        // Nếu xoá cả cái này thì người viết mất chữ mà không hiểu vì sao.
        const t = "Theo báo cáo [Bộ Công Thương] công bố hôm qua.";
        expect(stripAudioTags(t)).toBe(t);
    });

    test("giữ nguyên ngoặc vuông chứa số", () => {
        const t = "Xem mục [3] trong tài liệu.";
        expect(stripAudioTags(t)).toBe(t);
    });

    test("câu không có thẻ thì không đổi", () => {
        const t = "Cùng một mô hình, cùng một công việc.";
        expect(stripAudioTags(t)).toBe(t);
    });
});

describe("hasAudioTags", () => {
    test("nhận ra có thẻ", () => {
        expect(hasAudioTags("[whispers] Nói nhỏ thôi.")).toBe(true);
    });

    test("ngoặc vuông tiếng Việt không tính là thẻ", () => {
        expect(hasAudioTags("Theo [Bộ Công Thương].")).toBe(false);
    });

    test("gọi nhiều lần vẫn ra kết quả đúng", () => {
        // Regex có cờ /g giữ lastIndex giữa các lần gọi — quên đặt lại là
        // lần gọi thứ hai trả về sai.
        const t = "[excited] Tuyệt vời.";
        expect(hasAudioTags(t)).toBe(true);
        expect(hasAudioTags(t)).toBe(true);
    });
});
