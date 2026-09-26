"use client";

// Humo AI javoblari uchun markdown renderer — kod bloklari (til yorlig'i + nusxa),
// ro'yxat/sarlavha/bold/link. Monoxrom qora temaga moslangan (hardcoded emas, T bilan mos).
// Faqat AI xabarlari uchun; user xabari oddiy matn qoladi.

import { memo, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, Check } from "lucide-react";

function CodeBlock({ lang, code }: { lang: string; code: string }) {
    const [copied, setCopied] = useState(false);
    function copy() {
        navigator.clipboard?.writeText(code).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        }).catch(() => {});
    }
    return (
        <div className="my-2 rounded-xl overflow-hidden border" style={{ borderColor: "rgba(255,255,255,0.1)", background: "#0a0a0a" }}>
            <div className="flex items-center justify-between px-3 py-1.5 text-[11px]"
                style={{ background: "rgba(255,255,255,0.04)", color: "var(--muted-foreground)" }}>
                <span className="font-mono">{lang || "kod"}</span>
                <button onClick={copy} className="flex items-center gap-1 hover:text-white transition-colors">
                    {copied ? <><Check className="w-3 h-3" /> Nusxa olindi</> : <><Copy className="w-3 h-3" /> Nusxa</>}
                </button>
            </div>
            <pre className="p-3 overflow-x-auto text-[12.5px] leading-relaxed" style={{ color: "#e8e8e8" }}>
                <code className="font-mono whitespace-pre">{code}</code>
            </pre>
        </div>
    );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function codeRenderer({ className, children }: any) {
    const match = /language-(\w+)/.exec(className || "");
    const text = String(children ?? "").replace(/\n$/, "");
    if (match || text.includes("\n")) {
        return <CodeBlock lang={match?.[1] || ""} code={text} />;
    }
    return (
        <code className="px-1 py-0.5 rounded text-[0.85em] font-mono" style={{ background: "rgba(255,255,255,0.08)" }}>
            {children}
        </code>
    );
}

const COMPONENTS = {
    code: codeRenderer,
    pre: ({ children }: { children?: ReactNode }) => <>{children}</>,
    a: ({ children, href }: { children?: ReactNode; href?: string }) => (
        <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2" style={{ color: "#8ab4ff" }}>{children}</a>
    ),
    ul: ({ children }: { children?: ReactNode }) => <ul className="list-disc pl-5 my-1.5 space-y-0.5">{children}</ul>,
    ol: ({ children }: { children?: ReactNode }) => <ol className="list-decimal pl-5 my-1.5 space-y-0.5">{children}</ol>,
    li: ({ children }: { children?: ReactNode }) => <li className="leading-relaxed">{children}</li>,
    h1: ({ children }: { children?: ReactNode }) => <h1 className="text-base font-black mt-2 mb-1">{children}</h1>,
    h2: ({ children }: { children?: ReactNode }) => <h2 className="text-[15px] font-black mt-2 mb-1">{children}</h2>,
    h3: ({ children }: { children?: ReactNode }) => <h3 className="text-sm font-bold mt-2 mb-1">{children}</h3>,
    p: ({ children }: { children?: ReactNode }) => <p className="my-1 leading-relaxed">{children}</p>,
    strong: ({ children }: { children?: ReactNode }) => <strong className="font-bold">{children}</strong>,
    blockquote: ({ children }: { children?: ReactNode }) => (
        <blockquote className="border-l-2 pl-3 my-1.5 italic" style={{ borderColor: "rgba(255,255,255,0.2)", color: "var(--muted-foreground)" }}>{children}</blockquote>
    ),
    table: ({ children }: { children?: ReactNode }) => (
        <div className="my-2 overflow-x-auto"><table className="w-full text-[12.5px] border-collapse">{children}</table></div>
    ),
    th: ({ children }: { children?: ReactNode }) => <th className="border px-2 py-1 text-left font-bold" style={{ borderColor: "rgba(255,255,255,0.12)" }}>{children}</th>,
    td: ({ children }: { children?: ReactNode }) => <td className="border px-2 py-1" style={{ borderColor: "rgba(255,255,255,0.12)" }}>{children}</td>,
    hr: () => <hr className="my-2" style={{ borderColor: "rgba(255,255,255,0.1)" }} />,
};

export const AiMarkdown = memo(function AiMarkdown({ children }: { children: string }) {
    return (
        <div className="ai-md text-sm break-words">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
                {children}
            </ReactMarkdown>
        </div>
    );
});
