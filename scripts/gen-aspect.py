#!/usr/bin/env python3
"""Sinh index.html (16:9) từ compositions/portrait.html (9:16) cho template evose-*.

HyperFrames chọn file theo tỉ lệ khung (xem ASPECT_ENTRY trong
src/render/template-composer.ts): 9:16 → compositions/portrait.html,
16:9 → index.html. Hai file phải cùng tồn tại.

Template evose-* được viết để DÙNG CHUNG một file: toàn bộ hình học nằm trong
object GEO trong <script>, chọn theo data-width/data-height lúc chạy. Vì vậy
bản 16:9 chỉ khác bản 9:16 đúng 4 chỗ khai báo kích thước khung — và script
này dùng được cho MỌI template evose-*, không cần bảng riêng cho từng cái.

    python3 scripts/gen-aspect.py templates/evose-node-diagram
    python3 scripts/gen-aspect.py templates/evose-*        # nhiều template
"""
import io
import os
import re
import sys

PORTRAIT_W, PORTRAIT_H = 1080, 1920
LANDSCAPE_W, LANDSCAPE_H = 1920, 1080

SUBS = [
    ('content="width=%d, height=%d"' % (PORTRAIT_W, PORTRAIT_H),
     'content="width=%d, height=%d"' % (LANDSCAPE_W, LANDSCAPE_H)),
    ('html,body{width:%dpx;height:%dpx;}' % (PORTRAIT_W, PORTRAIT_H),
     'html,body{width:%dpx;height:%dpx;}' % (LANDSCAPE_W, LANDSCAPE_H)),
    ('#root{width:%dpx;height:%dpx;}' % (PORTRAIT_W, PORTRAIT_H),
     '#root{width:%dpx;height:%dpx;}' % (LANDSCAPE_W, LANDSCAPE_H)),
    ('data-width="%d" data-height="%d"' % (PORTRAIT_W, PORTRAIT_H),
     'data-width="%d" data-height="%d"' % (LANDSCAPE_W, LANDSCAPE_H)),
]

BANNER = (
    "<!-- SINH TỰ ĐỘNG bởi scripts/gen-aspect.py — ĐỪNG SỬA TRỰC TIẾP.\n"
    "     Sửa compositions/portrait.html rồi chạy lại script. -->\n"
)


def check_css_comments(html, path):
    """Bắt lỗi comment CSS đóng sớm.

    Viết một đường dẫn có ký tự đại diện trong comment CSS (dạng sao + gạch
    chéo) sẽ ĐÓNG comment ngay tại đó. Phần chữ còn lại thành CSS rác và trình
    duyệt nuốt luôn khối quy tắc kế tiếp — thường là :root, tức mất sạch biến
    màu. Frame render ra trắng trơn và KHÔNG có thông báo lỗi nào, nên phải
    chặn ở đây.
    """
    for m in re.finditer(r"<style[^>]*>(.*?)</style>", html, re.S | re.I):
        css, base = m.group(1), m.start(1)
        i, in_comment, start = 0, False, 0
        while i < len(css) - 1:
            two = css[i:i + 2]
            if not in_comment and two == "/*":
                in_comment, start, i = True, i, i + 2
            elif in_comment and two == "*/":
                in_comment, i = False, i + 2
            elif not in_comment and two == "*/":
                line = html.count("\n", 0, base + i) + 1
                raise SystemExit(
                    "%s dòng %d: gặp dấu đóng comment CSS khi không ở trong "
                    "comment.\nGần như chắc chắn là một comment đã bị đóng sớm "
                    "(hay gặp khi gõ đường dẫn có ký tự đại diện). Hậu quả: "
                    "khối quy tắc ngay sau đó bị nuốt và frame render ra "
                    "trắng trơn, không báo lỗi." % (path, line)
                )
            else:
                i += 1
        if in_comment:
            line = html.count("\n", 0, base + start) + 1
            raise SystemExit("%s dòng %d: comment CSS chưa được đóng." % (path, line))


def build(tpl_dir):
    src = os.path.join(tpl_dir, "compositions", "portrait.html")
    dst = os.path.join(tpl_dir, "index.html")
    if not os.path.isfile(src):
        raise SystemExit("Không thấy %s" % src)

    s = io.open(src, encoding="utf-8").read()
    check_css_comments(s, src)
    for a, b in SUBS:
        if a not in s:
            raise SystemExit(
                "%s: không tìm thấy %r.\n"
                "Template phải giữ nguyên 4 khai báo khung chuẩn — xem "
                "evose-node-diagram làm mẫu." % (src, a)
            )
        s = s.replace(a, b)

    io.open(dst, "w", encoding="utf-8").write(BANNER + s)
    print("OK  %s -> %s" % (src, dst))


def main(argv):
    dirs = argv or ["."]
    for d in dirs:
        build(d.rstrip("/"))


if __name__ == "__main__":
    main(sys.argv[1:])
