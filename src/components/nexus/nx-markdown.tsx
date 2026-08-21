// Yengil Markdown parser — DM xabarlari uchun.
// Qo'llab-quvvatlaydi: **bold**, *italic*, `code`, ~~strike~~, [text](url), > quote, ```block```
// Butun kutubxona (react-markdown) foydalanmaymiz — bundle size + XSS xavfi.
// Barcha URL/text escape qilinadi, faqat tekshirilgan http(s) linklar aylanadi.

import React from "react";
import { EmojiText } from "@/lib/twemoji";

// Matn parchasini emoji bilan render qilish (system emoji o'rniga Twemoji SVG)
function textWithEmoji(s: string, key: string, size = 18): React.ReactNode {
    return <EmojiText key={key} text={s} size={size} />;
}

const URL_RE = /^https?:\/\/[^\s<>"']+$/i;

function escapeHtml(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Inline parse: matn ichida bold/italic/code/strike/link
function parseInline(text: string, key: string): React.ReactNode[] {
    const nodes: React.ReactNode[] = [];
    // Regex tartibi muhim — code birinchi (ichidagi *ni parse qilmaslik uchun)
    const re = /(`[^`\n]+?`)|(\*\*[^*\n]+?\*\*)|(\*[^*\n]+?\*)|(~~[^~\n]+?~~)|(\[[^\]\n]+?\]\([^)\n]+?\))/g;
    let last = 0;
    let m: RegExpExecArray | null;
    let i = 0;
    while ((m = re.exec(text)) !== null) {
        if (m.index > last) nodes.push(textWithEmoji(text.slice(last, m.index), `${key}-t${i}`));
        const tok = m[0];
        const k = `${key}-i${i++}`;
        if (tok.startsWith("`")) {
            nodes.push(
                <code key={k} className="px-1 py-0.5 rounded text-[0.85em]"
                    style={{ background: "rgba(0,0,0,0.30)", fontFamily: "monospace" }}>
                    {tok.slice(1, -1)}
                </code>
            );
        } else if (tok.startsWith("**")) {
            nodes.push(<strong key={k}>{textWithEmoji(tok.slice(2, -2), `${k}-e`)}</strong>);
        } else if (tok.startsWith("*")) {
            nodes.push(<em key={k}>{textWithEmoji(tok.slice(1, -1), `${k}-e`)}</em>);
        } else if (tok.startsWith("~~")) {
            nodes.push(<s key={k}>{textWithEmoji(tok.slice(2, -2), `${k}-e`)}</s>);
        } else if (tok.startsWith("[")) {
            const linkMatch = tok.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
            if (linkMatch) {
                const label = linkMatch[1];
                const url = linkMatch[2];
                if (URL_RE.test(url)) {
                    nodes.push(
                        <a key={k} href={url} target="_blank" rel="noopener noreferrer"
                            className="underline hover:opacity-80" style={{ color: "#00CEC8" }}>
                            {textWithEmoji(label, `${k}-e`)}
                        </a>
                    );
                } else {
                    nodes.push(textWithEmoji(tok, `${k}-e`));
                }
            } else {
                nodes.push(textWithEmoji(tok, `${k}-e`));
            }
        }
        last = m.index + tok.length;
    }
    if (last < text.length) nodes.push(textWithEmoji(text.slice(last), `${key}-tend`));
    return nodes;
}

export function NxMarkdown({ text }: { text: string }) {
    if (!text) return null;
    const lines = text.split("\n");
    const blocks: React.ReactNode[] = [];
    let i = 0;
    let key = 0;

    while (i < lines.length) {
        const line = lines[i];

        // Kod bloki ```lang ... ```
        if (line.startsWith("```")) {
            const langMatch = line.match(/^```(\w+)?$/);
            if (langMatch) {
                const contentLines: string[] = [];
                let j = i + 1;
                while (j < lines.length && !lines[j].startsWith("```")) {
                    contentLines.push(lines[j]);
                    j++;
                }
                blocks.push(
                    <pre key={key++} className="my-1 p-2 rounded overflow-x-auto text-[0.85em]"
                        style={{ background: "rgba(0,0,0,0.35)", fontFamily: "monospace" }}>
                        <code>{escapeHtml(contentLines.join("\n"))}</code>
                    </pre>
                );
                i = j + 1;
                continue;
            }
        }

        // Blockquote — > matn
        if (/^>\s?/.test(line)) {
            const quoteLines: string[] = [];
            while (i < lines.length && /^>\s?/.test(lines[i])) {
                quoteLines.push(lines[i].replace(/^>\s?/, ""));
                i++;
            }
            blocks.push(
                <blockquote key={key++} className="my-1 pl-2 py-0.5"
                    style={{ borderLeft: "3px solid rgba(0,206,200,0.60)", opacity: 0.85 }}>
                    {quoteLines.map((ql, qi) => (
                        <div key={qi}>{parseInline(ql, `q${key}-${qi}`)}</div>
                    ))}
                </blockquote>
            );
            continue;
        }

        // Oddiy satr — bo'sh bo'lsa <br>, aks holda inline parse
        if (line === "") {
            blocks.push(<br key={key++} />);
        } else {
            blocks.push(
                <div key={key++}>{parseInline(line, `l${key}`)}</div>
            );
        }
        i++;
    }
    return <>{blocks}</>;
}
