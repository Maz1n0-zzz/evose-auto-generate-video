/**
 * Thẻ cảm xúc trong `voiceText` — dạng `[excited]`, `[laughs]`, `[whispers]`.
 *
 * Model `eleven_v3` của ElevenLabs đọc các thẻ này như chỉ dẫn diễn xuất và
 * KHÔNG phát âm chúng. Nhưng cùng một `voiceText` còn được dùng cho hai việc
 * khác, ở đó thẻ là rác:
 *
 *   - `script.txt` (CapCut bắt phụ đề) → thẻ sẽ hiện lên màn hình.
 *   - TTS không phải ElevenLabs (OmniVoice) → máy ĐỌC TO chữ "excited".
 *
 * Vì vậy chỉ giữ thẻ đúng một chỗ: lúc gửi cho ElevenLabs. Mọi chỗ khác gọi
 * `stripAudioTags` trước.
 */

/**
 * Chỉ khớp thẻ viết bằng CHỮ CÁI ASCII (`[excited]`, `[long pause]`), tối đa
 * 24 ký tự. Nhờ vậy ngoặc vuông chứa tiếng Việt hoặc số — vốn là nội dung thật
 * người viết muốn đọc lên — sẽ không bị xoá nhầm.
 */
const AUDIO_TAG = /\[[a-zA-Z][a-zA-Z ]{1,23}\]/g;

/** Bỏ thẻ cảm xúc và dọn khoảng trắng thừa do việc bỏ thẻ để lại. */
export function stripAudioTags(text: string): string {
    return text
        .replace(AUDIO_TAG, " ")
        // gộp khoảng trắng liên tiếp thành một
        .replace(/[ \t]{2,}/g, " ")
        // thẻ đứng trước dấu câu để lại khoảng trắng lơ lửng: "xong . " → "xong."
        .replace(/\s+([,.!?;:])/g, "$1")
        .trim();
}

/** Có chứa thẻ cảm xúc nào không — dùng để cảnh báo khi provider không hiểu thẻ. */
export function hasAudioTags(text: string): boolean {
    AUDIO_TAG.lastIndex = 0;
    return AUDIO_TAG.test(text);
}
