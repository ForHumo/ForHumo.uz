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
