"use client";

import { useEffect, useState } from "react";
import { Download, Loader2, Check, AlertCircle, Clock } from "lucide-react";

interface Status { lastExportAt: string | null; nextAvailableAt: string | null; ready: boolean }

export function DataExportPanel() {
    const [status, setStatus] = useState<Status | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [downloadedAt, setDownloadedAt] = useState<Date | null>(null);

    async function loadStatus() {
        setLoading(true);
        try {
            const r = await fetch("/api/user/export/status");
            if (r.ok) setStatus(await r.json());
        } finally { setLoading(false); }
    }
    useEffect(() => { loadStatus(); }, []);

    async function download() {
        if (busy) return;
        setBusy(true); setError(null);
        try {
            const r = await fetch("/api/user/export");
            if (!r.ok) {
                const d = await r.json().catch(() => ({}));
                setError(d?.error || "Eksport bajarilmadi");
                setBusy(false);
                return;
            }
            const blob = await r.blob();
            const cd = r.headers.get("content-disposition") || "";
            const nameMatch = cd.match(/filename="([^"]+)"/);
            const name = nameMatch?.[1] || `forhumo-export-${new Date().toISOString().slice(0, 10)}.json`;

            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = name;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            setDownloadedAt(new Date());
            loadStatus();
        } catch {
            setError("Tarmoq xatosi");
        } finally { setBusy(false); }
    }

    const nextAt = status?.nextAvailableAt ? new Date(status.nextAvailableAt) : null;
    const ready = status?.ready ?? true;

    return (
        <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/50 dark:bg-black/20 p-5 mt-4">
            <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-500 flex items-center justify-center">
                    <Download className="w-5 h-5" />
                </div>
                <div className="flex-1">
                    <div className="font-black text-base">Ma'lumotlarni yuklab olish</div>
                    <div className="text-xs opacity-70 mt-0.5">
                        Barcha profil, DM, kanal a'zoliklar, postlar va boshqa ma'lumotlaringiz JSON tarzida.
                        Media fayllar URL sifatida (brauzerda ochib yuklab olasiz). 7 kunda 1 marta.
                    </div>
                </div>
            </div>

            {loading && <div className="text-center py-2 opacity-60"><Loader2 className="w-4 h-4 animate-spin mx-auto" /></div>}

            {!loading && !ready && nextAt && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-500 text-xs font-bold flex items-start gap-2 mb-3">
                    <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>Keyingi eksport: <strong>{nextAt.toLocaleString()}</strong></span>
                </div>
            )}

            {downloadedAt && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 text-xs font-bold flex items-start gap-2 mb-3">
                    <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>Yuklab olindi — {downloadedAt.toLocaleTimeString()}</span>
                </div>
            )}

            {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-500 text-xs font-bold flex items-start gap-2 mb-3">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                </div>
            )}

            <button onClick={download} disabled={busy || !ready}
                className="w-full h-11 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Tayyorlanmoqda...</> : <><Download className="w-4 h-4" /> JSON yuklab olish</>}
            </button>
        </div>
    );
}
