"use client";

// Agent inline tugmalar renderer (Telegram uslub) — bir xabar ostida qatorlar.
// Har tugma URL bo'lsa yangi tab'da ochadi, callbackData bo'lsa /messages/[id]/callback ga POST.

import { useState } from "react";
import { Loader2 } from "lucide-react";

export type AgentButton = {
    text: string;
    callbackData?: string;
    url?: string;
};

export function NxAgentButtons({
    buttons, messageId, mine,
}: {
    buttons: AgentButton[][];
    messageId: string;
    mine: boolean;
}) {
    const [busy, setBusy] = useState<string | null>(null);

    async function trigger(btn: AgentButton) {
        if (btn.url) {
            window.open(btn.url, "_blank", "noopener");
            return;
        }
        if (!btn.callbackData) return;
        const key = `${messageId}:${btn.callbackData}`;
        setBusy(key);
        try {
            await fetch(`/api/nexus/messages/${messageId}/callback`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messageId, callbackData: btn.callbackData }),
            }).catch(() => {});
        } finally {
            setTimeout(() => setBusy(null), 400);
        }
    }

    if (!Array.isArray(buttons) || buttons.length === 0) return null;

    return (
        <div className="mt-2 flex flex-col gap-1">
            {buttons.map((row, ri) => (
                <div key={ri} className="flex gap-1">
                    {row.map((btn, bi) => {
                        const key = `${messageId}:${btn.callbackData ?? bi}`;
                        const isBusy = busy === key;
                        return (
                            <button key={bi} type="button" disabled={isBusy}
                                onClick={() => trigger(btn)}
                                className="flex-1 min-w-0 py-1.5 px-2 rounded-md text-[11px] font-bold text-white truncate transition hover:brightness-110 active:scale-95 disabled:opacity-60"
                                style={{
                                    background: mine ? "rgba(255,255,255,0.14)" : "rgba(0,206,200,0.18)",
                                    border: `1px solid ${mine ? "rgba(255,255,255,0.20)" : "rgba(0,206,200,0.35)"}`,
                                }}>
                                {isBusy ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : btn.text}
                            </button>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}
