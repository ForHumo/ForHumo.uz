"use client";

// Full-screen post composer (C-23) + Markdown toolbar (C-24).
// Uzun postlar uchun (masalan owner e'lonlari). Bold/italic/code/link/list/quote,
// jadval qo'yish, sponsored URL (agar kanal sponsoredEnabled=true).

import { useRef, useState } from "react";
import {
    X, Send, Bold, Italic, Code, Link as LinkIcon, List, Quote, Loader2,
    Sparkles, Eye, Edit3, Radio,
} from "lucide-react";
import { NxMarkdown } from "./nx-markdown";

type Props = {
    open: boolean;
    channelId: string;
    channelName: string;
    channelType: "CHANNEL" | "GROUP";
    sponsoredEnabled: boolean;
    isOwner: boolean;
    onClose: () => void;
    onSent: () => void;
};

function wrapSelection(el: HTMLTextAreaElement, prefix: string, suffix = prefix): { text: string; caret: number } {
    const s = el.selectionStart, e = el.selectionEnd;
    const before = el.value.slice(0, s);
    const sel = el.value.slice(s, e) || "matn";
    const after = el.value.slice(e);
    return { text: before + prefix + sel + suffix + after, caret: (before + prefix + sel).length };
}
function insertPrefix(el: HTMLTextAreaElement, linePrefix: string): { text: string; caret: number } {
    const s = el.selectionStart;
    const before = el.value.slice(0, s);
    const after = el.value.slice(s);
    const nl = before.lastIndexOf("\n");
    const insertPos = nl + 1;
    const newValue = before.slice(0, insertPos) + linePrefix + before.slice(insertPos) + after;
    return { text: newValue, caret: s + linePrefix.length };
}

export function NxChannelFullscreenComposer({
    open, channelId, channelName, channelType, sponsoredEnabled, isOwner, onClose, onSent,
}: Props) {
    const [text, setText] = useState("");
    const [sponsored, setSponsored] = useState(false);
    const [sponsoredUrl, setSponsoredUrl] = useState("");
    const [preview, setPreview] = useState(false);
    const [busy, setBusy] = useState(false);
    const taRef = useRef<HTMLTextAreaElement>(null);

    if (!open) return null;

    function apply(fn: (el: HTMLTextAreaElement) => { text: string; caret: number }) {
        const el = taRef.current;
        if (!el) return;
        const r = fn(el);
        setText(r.text);
        requestAnimationFrame(() => {
            el.focus();
            el.setSelectionRange(r.caret, r.caret);
        });
    }

    async function send() {
        if (!text.trim() || busy) return;
        setBusy(true);
        try {
            const r = await fetch(`/api/nexus/channels/${channelId}/messages`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: text.trim(),
                    ...(sponsored && sponsoredEnabled && isOwner ? { sponsored: true, sponsoredUrl: sponsoredUrl.trim() || undefined } : {}),
                }),
            });
            if (r.ok) {
                setText("");
                setSponsored(false);
                setSponsoredUrl("");
                onSent();
                onClose();
            } else {
                const d = await r.json().catch(() => ({}));
                alert(d?.error ?? "Yuborilmadi");
            }
        } finally { setBusy(false); }
    }

    const canSend = !!text.trim() && !busy;
    const maxLen = 4000;

    return (
        <div className="fixed inset-0 z-[400] flex flex-col" style={{ background: "rgba(5,8,24,0.99)" }}>
            <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
                style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(43,62,232,0.12)" }}>
                    <X className="w-4 h-4 text-white" />
                </button>
                <div className="flex-1 min-w-0 text-center px-3">
                    <p className="text-sm font-black text-white truncate">
                        {channelType === "CHANNEL" ? "Yangi e'lon" : "Yangi xabar"}
                    </p>
                    <p className="text-[10px]" style={{ color: "rgba(140,160,210,0.7)" }}>
                        {channelName}
                    </p>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={() => setPreview(p => !p)}
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={preview
                            ? { background: "rgba(0,206,200,0.20)", border: "1px solid #00CEC8" }
                            : { background: "rgba(43,62,232,0.12)" }}>
                        {preview ? <Edit3 className="w-4 h-4 text-white" /> : <Eye className="w-4 h-4 text-white" />}
                    </button>
                    <button onClick={send} disabled={!canSend}
                        className="h-8 px-4 rounded-full text-sm font-black flex items-center gap-1.5 disabled:opacity-40"
                        style={{ background: "linear-gradient(135deg, #2B3EE8, #00CEC8)", color: "white" }}>
                        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        Yuborish
                    </button>
                </div>
            </div>

            {/* Markdown toolbar */}
            {!preview && (
                <div className="flex items-center gap-1 px-3 py-2 flex-shrink-0 overflow-x-auto"
                    style={{ borderBottom: "1px solid rgba(43,62,232,0.10)", scrollbarWidth: "none" }}>
                    <ToolbarBtn onClick={() => apply(el => wrapSelection(el, "**"))} title="Bold" icon={<Bold className="w-4 h-4" />} />
                    <ToolbarBtn onClick={() => apply(el => wrapSelection(el, "*"))} title="Italic" icon={<Italic className="w-4 h-4" />} />
                    <ToolbarBtn onClick={() => apply(el => wrapSelection(el, "`"))} title="Code" icon={<Code className="w-4 h-4" />} />
                    <ToolbarBtn onClick={() => apply(el => wrapSelection(el, "[", "](url)"))} title="Link" icon={<LinkIcon className="w-4 h-4" />} />
                    <div className="w-px h-6" style={{ background: "rgba(43,62,232,0.20)" }} />
                    <ToolbarBtn onClick={() => apply(el => insertPrefix(el, "- "))} title="Ro'yxat" icon={<List className="w-4 h-4" />} />
                    <ToolbarBtn onClick={() => apply(el => insertPrefix(el, "> "))} title="Iqtibos" icon={<Quote className="w-4 h-4" />} />
                    <div className="flex-1" />
                    <span className="text-[10px] flex-shrink-0" style={{ color: "rgba(140,160,210,0.7)" }}>
                        {text.length}/{maxLen}
                    </span>
                </div>
            )}

            {/* Content area */}
            <div className="flex-1 overflow-y-auto p-4">
                {preview ? (
                    <div className="max-w-2xl mx-auto">
                        <div className="rounded-2xl p-4"
                            style={{ background: "rgba(11,18,40,0.55)", border: "1px solid rgba(43,62,232,0.20)" }}>
                            {text.trim() ? (
                                <div className="text-sm text-white whitespace-pre-wrap">
                                    <NxMarkdown text={text} />
                                </div>
                            ) : (
                                <p className="text-sm italic" style={{ color: "rgba(140,160,210,0.6)" }}>
                                    Preview bo&apos;sh
                                </p>
                            )}
                        </div>
                        {sponsored && (
                            <div className="mt-3 p-2 rounded-lg flex items-center gap-2"
                                style={{ background: "rgba(245,179,1,0.10)", border: "1px solid rgba(245,179,1,0.30)" }}>
                                <Sparkles className="w-3.5 h-3.5" style={{ color: "#F5B301" }} />
                                <p className="text-[11px]" style={{ color: "rgba(230,220,180,0.95)" }}>
                                    Sponsored — reklama badge chiqadi
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="max-w-2xl mx-auto">
                        <textarea ref={taRef} value={text}
                            onChange={e => setText(e.target.value.slice(0, maxLen))}
                            placeholder={channelType === "CHANNEL"
                                ? "Uzun e'lon yozing. Markdown qo'llab-quvvatlanadi:\n\n**qalin**, *kursiv*, `kod`, [havola](url), - ro'yxat, > iqtibos"
                                : "Xabar yozing..."}
                            className="w-full min-h-[50vh] rounded-xl p-4 text-sm resize-y focus:outline-none"
                            style={{
                                background: "rgba(11,18,40,0.55)",
                                border: "1px solid rgba(43,62,232,0.20)",
                                color: "white",
                                lineHeight: 1.6,
                                fontFamily: "system-ui",
                            }}
                            autoFocus
                        />
                        {sponsoredEnabled && isOwner && channelType === "CHANNEL" && (
                            <div className="mt-4 p-3 rounded-xl"
                                style={{ background: "rgba(11,18,40,0.55)", border: "1px solid rgba(43,62,232,0.14)" }}>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={sponsored}
                                        onChange={e => setSponsored(e.target.checked)} />
                                    <Radio className="w-4 h-4" style={{ color: "#F5B301" }} />
                                    <span className="text-sm font-bold text-white">Sponsored post</span>
                                </label>
                                {sponsored && (
                                    <input value={sponsoredUrl}
                                        onChange={e => setSponsoredUrl(e.target.value.slice(0, 500))}
                                        placeholder="Reklama URL (ixtiyoriy) — https://..."
                                        className="mt-2 w-full h-10 rounded-lg px-3 text-xs focus:outline-none"
                                        style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.30)", color: "white" }}
                                    />
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function ToolbarBtn({ onClick, title, icon }: { onClick: () => void; title: string; icon: React.ReactNode }) {
    return (
        <button type="button" onClick={onClick} title={title}
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 hover:bg-white/[0.05]"
            style={{ background: "rgba(11,18,40,0.55)", border: "1px solid rgba(43,62,232,0.14)", color: "rgba(200,214,247,0.9)" }}>
            {icon}
        </button>
    );
}
