"use client";

// DM composer uchun ixcham Markdown toolbar (Bold/Italic/Code/Link).
// Input yoki textarea uchun ishlaydi — wrapSelection helper bilan.

import { Bold, Italic, Code, Link as LinkIcon } from "lucide-react";

export function wrapSelectionInInput(
    el: HTMLInputElement | HTMLTextAreaElement,
    prefix: string, suffix: string = prefix,
    fallback = "matn",
): { value: string; caret: number } {
    const s = el.selectionStart ?? el.value.length;
    const e = el.selectionEnd ?? el.value.length;
    const before = el.value.slice(0, s);
    const sel = el.value.slice(s, e) || fallback;
    const after = el.value.slice(e);
    return { value: before + prefix + sel + suffix + after, caret: (before + prefix + sel).length };
}

export function NxDmMarkdownToolbar({
    inputRef, onChange, onClose,
}: {
    inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
    onChange: (v: string) => void;
    onClose?: () => void;
}) {
    function apply(fn: (el: HTMLInputElement | HTMLTextAreaElement) => { value: string; caret: number }) {
        const el = inputRef.current;
        if (!el) return;
        const r = fn(el);
        onChange(r.value);
        requestAnimationFrame(() => {
            try {
                el.focus();
                el.setSelectionRange(r.caret, r.caret);
            } catch { /* ignore */ }
        });
        onClose?.();
    }
    return (
        <div className="flex items-center gap-1 p-1.5 rounded-full"
            style={{ background: "rgba(8,12,32,0.98)", border: "1px solid rgba(43,62,232,0.30)", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
            <Btn onClick={() => apply(el => wrapSelectionInInput(el, "**"))} title="Bold" icon={<Bold className="w-3.5 h-3.5" />} />
            <Btn onClick={() => apply(el => wrapSelectionInInput(el, "*"))} title="Italic" icon={<Italic className="w-3.5 h-3.5" />} />
            <Btn onClick={() => apply(el => wrapSelectionInInput(el, "`"))} title="Code" icon={<Code className="w-3.5 h-3.5" />} />
            <Btn onClick={() => apply(el => wrapSelectionInInput(el, "[", "](url)"))} title="Link" icon={<LinkIcon className="w-3.5 h-3.5" />} />
        </div>
    );
}

function Btn({ onClick, title, icon }: { onClick: () => void; title: string; icon: React.ReactNode }) {
    return (
        <button type="button" onClick={onClick} title={title}
            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/[0.10]"
            style={{ color: "rgba(200,214,247,0.9)" }}>
            {icon}
        </button>
    );
}
