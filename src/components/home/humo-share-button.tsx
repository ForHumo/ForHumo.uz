"use client";

// Universal share tugma - Web Share API + copyToClipboard + Telegram/WhatsApp/SMS.

import { useState } from "react";
import { createPortal } from "react-dom";
import { Share2, Copy, Check, X, Send } from "lucide-react";

interface Props {
    url: string;
    title?: string;
    text?: string;
    small?: boolean;
}

export function HumoShareButton({ url, title, text, small }: Props) {
    const [open, setOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const fullUrl = url.startsWith("http") ? url : `https://forhumo.uz${url}`;
    const shareText = text || title || "Ko'rib chiqing";

    const tryNativeShare = async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nav: any = navigator;
        if (nav.share) {
            try {
                await nav.share({ title, text: shareText, url: fullUrl });
                return;
            } catch { /* user cancelled */ }
        }
        setOpen(true);
    };

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(fullUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { /* skip */ }
    };

    const btnClass = small
        ? "h-8 px-2.5 rounded-lg inline-flex items-center gap-1 text-[11.5px] font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800"
        : "h-10 px-3 rounded-xl inline-flex items-center gap-1.5 text-[13px] font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800";

    return (
        <>
            <button onClick={tryNativeShare} className={btnClass}>
                <Share2 className={small ? "w-3.5 h-3.5" : "w-4 h-4"} />
                Ulash
            </button>
            {open && createPortal(
                <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4"
                    style={{ background: "rgba(0,0,0,0.6)" }}
                    onClick={() => setOpen(false)}>
                    <div onClick={e => e.stopPropagation()}
                        className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                        <div className="p-4 flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800">
                            <Share2 className="w-4 h-4 text-neutral-500" />
                            <p className="text-[13.5px] font-black flex-1">Ulashing</p>
                            <button onClick={() => setOpen(false)}
                                className="w-8 h-8 rounded-lg grid place-items-center hover:bg-neutral-100 dark:hover:bg-neutral-800">
                                <X className="w-4 h-4 text-neutral-500" />
                            </button>
                        </div>

                        <div className="p-4 grid grid-cols-4 gap-2">
                            <a href={`https://t.me/share/url?url=${encodeURIComponent(fullUrl)}&text=${encodeURIComponent(shareText)}`}
                                target="_blank" rel="noopener noreferrer"
                                className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800">
                                <span className="w-11 h-11 rounded-full grid place-items-center bg-blue-500 text-white">
                                    <Send className="w-5 h-5" />
                                </span>
                                <span className="text-[10.5px] font-bold">Telegram</span>
                            </a>
                            <a href={`https://wa.me/?text=${encodeURIComponent(shareText + " " + fullUrl)}`}
                                target="_blank" rel="noopener noreferrer"
                                className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800">
                                <span className="w-11 h-11 rounded-full grid place-items-center bg-green-500 text-white text-[10px] font-black">WA</span>
                                <span className="text-[10.5px] font-bold">WhatsApp</span>
                            </a>
                            <a href={`sms:?body=${encodeURIComponent(shareText + " " + fullUrl)}`}
                                className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800">
                                <span className="w-11 h-11 rounded-full grid place-items-center bg-neutral-500 text-white text-[10px] font-black">SMS</span>
                                <span className="text-[10.5px] font-bold">Xabar</span>
                            </a>
                            <button onClick={copy}
                                className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800">
                                <span className="w-11 h-11 rounded-full grid place-items-center bg-purple-500 text-white">
                                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                </span>
                                <span className="text-[10.5px] font-bold">{copied ? "Ok" : "Nusxa"}</span>
                            </button>
                        </div>

                        <div className="p-3 border-t border-neutral-200 dark:border-neutral-800">
                            <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-[11px] text-neutral-600 dark:text-neutral-400 break-all">
                                {fullUrl}
                            </div>
                        </div>
                    </div>
                </div>,
                document.body,
            )}
        </>
    );
}
