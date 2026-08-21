// Twemoji helper — emoji character'ni Apple-uslub SVG URL'ga aylantirish.
// CDN: jsdelivr twemoji@latest (Twitter open-source, CC-BY 4.0).
//
// Foydalanish:
//   <img src={twemojiUrl("❤️")} alt="❤️" />
//   yoki: renderEmoji("❤️") → JSX element

import React from "react";

// Emoji character(lar)ni Twemoji hex codepoint sequence'ga aylantirish.
// Masalan: "❤️" -> "2764" (VS16 U+FE0F o'chirilgan)
//          "👍🏽" -> "1f44d-1f3fd"
export function toCodePoint(rune: string): string {
    const points: string[] = [];
    let i = 0;
    while (i < rune.length) {
        const code = rune.codePointAt(i);
        if (code == null) break;
        // ZWJ (200D) — birlashtiruvchi, olib tashlanmaydi
        // VS-16 (FE0F) — presentation selector, Twemoji URL'da chiqarib tashlanadi
        if (code !== 0xFE0F) points.push(code.toString(16));
        i += code > 0xFFFF ? 2 : 1;
    }
    return points.join("-");
}

// Twemoji SVG URL — jsdelivr CDN (bepul, no rate limit)
export function twemojiUrl(rune: string): string {
    return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${toCodePoint(rune)}.svg`;
}

// React element sifatida render qilish (klaviaturaga emas, faqat vizual)
export function Emoji({ char, size = 16, className }: { char: string; size?: number; className?: string }) {
    return React.createElement("img", {
        src: twemojiUrl(char),
        alt: char,
        draggable: false,
        loading: "lazy",
        className,
        style: {
            display: "inline-block",
            width: size,
            height: size,
            verticalAlign: "-0.15em",
        },
    });
}

// Emoji-picking regex — Extended_Pictographic (u belgisi) + ZWJ ketma-ketliklari.
// \p{Extended_Pictographic} — barcha emoji; keyin ixtiyoriy tone modifier + ZWJ + emoji.
// Bu regex 99% zamonaviy emojilarni to'g'ri ushlaydi (family, professional, flags).
const EMOJI_REGEX = /(?:\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic}|\p{Emoji_Modifier})*)+/gu;

// Matnni bo'lib, emojilarni Twemoji SVG bilan almashtiradi. String qismlarni saqlaydi.
// Xabar body'sida ishlatish: <EmojiText text={m.text} size={18} />
export function EmojiText({ text, size = 18, className }: { text: string | null | undefined; size?: number; className?: string }) {
    if (!text) return null;
    const parts: (string | React.ReactElement)[] = [];
    let last = 0;
    let m: RegExpExecArray | null;
    EMOJI_REGEX.lastIndex = 0;
    let key = 0;
    while ((m = EMOJI_REGEX.exec(text)) !== null) {
        if (m.index > last) parts.push(text.slice(last, m.index));
        parts.push(React.createElement(Emoji, { key: `e${key++}`, char: m[0], size, className }));
        last = m.index + m[0].length;
    }
    if (last < text.length) parts.push(text.slice(last));
    return React.createElement(React.Fragment, null, ...parts);
}
