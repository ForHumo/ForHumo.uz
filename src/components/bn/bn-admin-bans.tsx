"use client";

// BN admin: faol banlar + termination so'rovlar. OWNER + MODERATOR ko'radi;
// terminate va lift lar OWNER huquqi (backend allaqachon tekshiradi).

import { useEffect, useState } from "react";
import {
    ShieldOff, Store, User, Loader2, ChevronRight, Ban, Undo2, X, Check, Clock,
} from "lucide-react";
import { BN } from "@/lib/bn-theme";

interface BanRow {
    id: string;
    scope: "PROFILE" | "SHOP";
    type: "TEMP" | "PERM";
    reason: string;
    publicReason: string | null;
    expiresAt: string | null;
    decidedBy: "AI" | "OWNER" | "MODERATOR";
    createdAt: string;
    profile: { id: string; username: string | null; humoId: string | null; name: string | null; image: string | null } | null;
    shop: { id: string; name: string; slug: string } | null;
}

interface TermReq {
    id: string;
    shopId: string;
    profileId: string;
    reason: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    createdAt: string;
    shop: { id: string; name: string; slug: string; status: string } | null;
    requestedBy: { id: string; username: string | null; humoId: string | null; name: string | null } | null;
}

export function BnAdminBans({ role }: { role: "OWNER" | "MODERATOR" }) {
    const [tab, setTab] = useState<"BANS" | "REQUESTS">("BANS");
    const [bans, setBans] = useState<BanRow[]>([]);
    const [reqs, setReqs] = useState<TermReq[]>([]);
    const [banStatus, setBanStatus] = useState<"ACTIVE" | "LIFTED" | "EXPIRED">("ACTIVE");
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);

    async function load() {
        setLoading(true);
        try {
            const [b, r] = await Promise.all([
                fetch(`/api/bn/admin/bans?status=${banStatus}`).then(r => r.ok ? r.json() : { bans: [] }),
                fetch(`/api/bn/admin/termination-requests?status=PENDING`).then(r => r.ok ? r.json() : { items: [] }),
            ]);
            setBans(b.bans ?? []);
            setReqs(r.items ?? []);
        } finally { setLoading(false); }
    }
    useEffect(() => { load(); }, [banStatus]);

    async function lift(id: string) {
        const reason = prompt("Sabab (ixtiyoriy):") ?? "";
        setBusy(id);
        try {
            const r = await fetch(`/api/bn/admin/ban/${id}/lift`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ reason }),
            });
            if (r.ok) setBans(prev => prev.filter(b => b.id !== id));
        } finally { setBusy(null); }
    }

    async function decide(id: string, decision: "APPROVE" | "REJECT") {
        if (decision === "APPROVE" && !confirm("Do'kon chiqarib yuboriladi (abadiy). Davom etamizmi?")) return;
        const note = prompt("Izoh (ixtiyoriy):") ?? "";
        setBusy(id);
        try {
            const r = await fetch(`/api/bn/admin/termination-requests/${id}`, {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ decision, note }),
            });
            if (r.ok) setReqs(prev => prev.filter(x => x.id !== id));
        } finally { setBusy(null); }
    }

    return (
        <div>
            <div className="flex items-center gap-1.5 mb-4">
                <button
                    onClick={() => setTab("BANS")}
                    className="h-9 px-3.5 rounded-xl text-[12.5px] font-bold flex items-center gap-1.5"
                    style={{
                        background: tab === "BANS" ? BN.gold : BN.surface,
                        color: tab === "BANS" ? BN.onGold : BN.text2,
                        border: `1px solid ${tab === "BANS" ? BN.gold : BN.border}`,
                    }}
                >
                    <Ban className="w-3.5 h-3.5" /> Banlar
                </button>
                <button
                    onClick={() => setTab("REQUESTS")}
                    className="h-9 px-3.5 rounded-xl text-[12.5px] font-bold flex items-center gap-1.5"
                    style={{
                        background: tab === "REQUESTS" ? BN.gold : BN.surface,
                        color: tab === "REQUESTS" ? BN.onGold : BN.text2,
                        border: `1px solid ${tab === "REQUESTS" ? BN.gold : BN.border}`,
                    }}
                >
                    <ShieldOff className="w-3.5 h-3.5" /> Chiqarib yuborish so&apos;rovlari
                    {reqs.length > 0 && (
                        <span className="ml-1 rounded-full px-1.5 py-0.5 text-[10px]" style={{ background: "#ef4444", color: "#fff" }}>
                            {reqs.length}
                        </span>
                    )}
                </button>
            </div>

            {tab === "BANS" && (
                <div>
                    <div className="flex items-center gap-1.5 mb-3">
                        {(["ACTIVE", "LIFTED", "EXPIRED"] as const).map(s => (
                            <button
                                key={s}
                                onClick={() => setBanStatus(s)}
                                className="h-8 px-3 rounded-lg text-[11.5px] font-bold"
                                style={{
                                    background: banStatus === s ? BN.surfaceUp : "transparent",
                                    color: banStatus === s ? "#fff" : BN.text3,
                                    border: `1px solid ${BN.border}`,
                                }}
                            >
                                {s}
                            </button>
                        ))}
                    </div>

                    {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto my-8" /> : bans.length === 0 ? (
                        <Empty text="Bu holatda ban yo'q" />
                    ) : (
                        <div className="space-y-2.5">
                            {bans.map(b => (
                                <div key={b.id} className="rounded-2xl p-4" style={{ background: BN.surface, border: `1px solid ${BN.border}` }}>
                                    <div className="flex items-start gap-3 mb-2">
                                        <div className="w-9 h-9 rounded-xl grid place-items-center" style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>
                                            {b.scope === "SHOP" ? <Store className="w-4 h-4" /> : <User className="w-4 h-4" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[14px] font-bold truncate">
                                                {b.shop ? b.shop.name : (b.profile?.name ?? b.profile?.username ?? "—")}
                                            </p>
                                            <p className="text-[11.5px]" style={{ color: BN.text3 }}>
                                                {b.scope === "SHOP" ? "SHOP ban" : "PROFILE ban"} · {b.type} · qaror: {b.decidedBy}
                                                {b.expiresAt && ` · tugaydi ${new Date(b.expiresAt).toLocaleDateString("uz-UZ")}`}
                                            </p>
                                        </div>
                                        <span className="text-[11px] font-bold px-2 py-1 rounded-lg" style={{ background: BN.surfaceUp, color: BN.text3 }}>
                                            {b.type}
                                        </span>
                                    </div>
                                    <p className="text-[13px] leading-relaxed mb-3" style={{ color: BN.text2 }}>
                                        {b.reason}
                                    </p>
                                    {banStatus === "ACTIVE" && (
                                        <button
                                            onClick={() => lift(b.id)}
                                            disabled={busy === b.id}
                                            className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-[12.5px] font-bold"
                                            style={{ background: BN.surfaceUp, color: "#34d399", border: `1px solid ${BN.border}` }}
                                        >
                                            {busy === b.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Undo2 className="w-3.5 h-3.5" />}
                                            Ban ni bekor qilish
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {tab === "REQUESTS" && (
                <div>
                    <p className="text-[12.5px] mb-3" style={{ color: BN.text3 }}>
                        MODERATOR yuborgan chiqarib yuborish so&apos;rovlari. Faqat OWNER hal qila oladi.
                    </p>
                    {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto my-8" /> : reqs.length === 0 ? (
                        <Empty text="Yangi so'rov yo'q" />
                    ) : (
                        <div className="space-y-2.5">
                            {reqs.map(r => (
                                <div key={r.id} className="rounded-2xl p-4" style={{ background: BN.surface, border: `1px solid ${BN.border}` }}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Store className="w-4 h-4" style={{ color: BN.text3 }} />
                                        <p className="text-[14px] font-bold flex-1">{r.shop?.name ?? "—"}</p>
                                        <span className="text-[10.5px] px-2 py-0.5 rounded-lg" style={{ background: "rgba(251,191,36,0.15)", color: "#fbbf24" }}>
                                            <Clock className="w-3 h-3 inline mr-1" /> PENDING
                                        </span>
                                    </div>
                                    <p className="text-[12px] mb-2" style={{ color: BN.text3 }}>
                                        Yubordi: <span style={{ color: BN.text2 }}>{r.requestedBy?.username ?? r.requestedBy?.humoId ?? "—"}</span> ·{" "}
                                        {new Date(r.createdAt).toLocaleDateString("uz-UZ")}
                                    </p>
                                    <p className="text-[13px] leading-relaxed mb-3" style={{ color: BN.text2 }}>
                                        {r.reason}
                                    </p>
                                    {role === "OWNER" && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => decide(r.id, "APPROVE")}
                                                disabled={busy === r.id}
                                                className="flex-1 h-10 rounded-xl text-[12.5px] font-bold flex items-center justify-center gap-1.5"
                                                style={{ background: "#ef4444", color: "#fff" }}
                                            >
                                                <Check className="w-4 h-4" /> Chiqarib yuborish
                                            </button>
                                            <button
                                                onClick={() => decide(r.id, "REJECT")}
                                                disabled={busy === r.id}
                                                className="flex-1 h-10 rounded-xl text-[12.5px] font-bold flex items-center justify-center gap-1.5"
                                                style={{ background: BN.surfaceUp, color: BN.text2, border: `1px solid ${BN.border}` }}
                                            >
                                                <X className="w-4 h-4" /> Rad
                                            </button>
                                        </div>
                                    )}
                                    {role !== "OWNER" && (
                                        <p className="text-[11.5px]" style={{ color: BN.text3 }}>
                                            Faqat OWNER hal qila oladi.
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function Empty({ text }: { text: string }) {
    return (
        <div className="p-8 rounded-2xl text-center text-[13px]"
            style={{ background: BN.surface, border: `1px solid ${BN.border}`, color: BN.text3 }}>
            {text}
        </div>
    );
}
