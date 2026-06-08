"use client";

import React, { useState } from "react";
import { Flag, Check } from "lucide-react";

type Target = "PRODUCT" | "REVIEW" | "REPLY" | "QUESTION" | "ANSWER";

export function ReportButton({ targetType, targetId }: { targetType: Target; targetId: string }) {
    const [done, setDone] = useState(false);
    const [busy, setBusy] = useState(false);

    async function report() {
        if (done || busy) return;
        setBusy(true);
        try {
            const res = await fetch("/api/market/report", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ targetType, targetId }),
            });
            if (res.ok) setDone(true);
        } finally { setBusy(false); }
    }

    return (
        <button onClick={report} disabled={busy || done} title="Shikoyat qilish"
            className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-white/30 hover:text-red-500 transition disabled:opacity-60">
            {done ? <Check size={11} /> : <Flag size={11} />} {done ? "Xabar berildi" : "Shikoyat"}
        </button>
    );
}
