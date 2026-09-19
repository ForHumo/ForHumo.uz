"use client";

// "Qo'ng'iroqlar" — BN qo'ng'iroqlari tarixi (mahsulot bo'yicha). Kabinet MoneyTab'da.
// Qo'ng'iroq yo'q bo'lsa yashirin.

import { useEffect, useState } from "react";
import { PhoneIncoming, PhoneOutgoing, PhoneMissed, Video, User } from "lucide-react";
import { BN } from "@/lib/bn-theme";
import { BnLink } from "./bn-nav";

interface CallItem {
    id: string;
    kind: "AUDIO" | "VIDEO";
    dir: "in" | "out";
    missed: boolean;
    status: string;
    duration: number;
    createdAt: string;
    peer: { name: string | null; username: string | null; image: string | null } | null;
    product: { title: string; image: string | null; slug: string; shopSlug: string | null } | null;
}

function timeAgo(iso: string): string {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return "hozir";
    if (s < 3600) return `${Math.floor(s / 60)} daq`;
    if (s < 86400) return `${Math.floor(s / 3600)} soat`;
    if (s < 7 * 86400) return `${Math.floor(s / 86400)} kun`;
    return new Date(iso).toLocaleDateString("uz-UZ", { day: "2-digit", month: "short" });
}

function fmtDur(s: number): string {
    if (s <= 0) return "";
    const m = Math.floor(s / 60), ss = s % 60;
    return `${m}:${String(ss).padStart(2, "0")}`;
}

export function BnCallsCard() {
    const [calls, setCalls] = useState<CallItem[] | null>(null);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const r = await fetch("/api/bn/calls");
                const d = await r.json();
                if (alive) setCalls((d.calls ?? []) as CallItem[]);
            } catch { if (alive) setCalls([]); }
        })();
        return () => { alive = false; };
    }, []);

    if (!calls || calls.length === 0) return null;

    return (
        <div className="rounded-2xl p-4 mb-4" style={{ background: BN.surface, border: `1px solid ${BN.border}` }}>
            <div className="flex items-center gap-2 mb-3">
                <PhoneIncoming className="w-[18px] h-[18px]" style={{ color: BN.gold }} />
                <h3 className="text-[15px] font-black">Qo&apos;ng&apos;iroqlar</h3>
                <span className="ml-auto text-[12px] font-bold" style={{ color: BN.text3 }}>{calls.length}</span>
            </div>

            <div className="space-y-1.5">
                {calls.map(c => {
                    const name = c.peer?.name || (c.peer?.username ? `@${c.peer.username}` : "Foydalanuvchi");
                    const DirIcon = c.missed ? PhoneMissed : c.dir === "in" ? PhoneIncoming : PhoneOutgoing;
                    const dirColor = c.missed ? BN.err : c.dir === "in" ? BN.ok : BN.text3;
                    const href = c.product?.shopSlug ? `/d/${c.product.shopSlug}/${c.product.slug}` : null;
                    const inner = (
                        <div className="flex items-center gap-3 rounded-xl p-2.5" style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}` }}>
                            <div className="w-10 h-10 rounded-full overflow-hidden grid place-items-center flex-shrink-0" style={{ background: BN.surface }}>
                                {c.peer?.image ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={c.peer.image} alt="" className="w-full h-full object-cover" />
                                ) : <User className="w-5 h-5" style={{ color: BN.text3 }} />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <DirIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: dirColor }} />
                                    <span className="text-[13px] font-bold truncate">{name}</span>
                                    {c.kind === "VIDEO" && <Video className="w-3.5 h-3.5 flex-shrink-0" style={{ color: BN.text3 }} />}
                                </div>
                                {c.product && (
                                    <div className="text-[11.5px] truncate" style={{ color: BN.text3 }}>{c.product.title}</div>
                                )}
                            </div>
                            <div className="text-right flex-shrink-0">
                                <div className="text-[11px]" style={{ color: BN.text3 }}>{timeAgo(c.createdAt)}</div>
                                <div className="text-[11px] tabular-nums" style={{ color: c.missed ? BN.err : BN.text3 }}>
                                    {c.missed ? "javobsiz" : fmtDur(c.duration) || "—"}
                                </div>
                            </div>
                        </div>
                    );
                    return href ? (
                        <BnLink key={c.id} href={href} className="block transition-opacity hover:opacity-90">{inner}</BnLink>
                    ) : <div key={c.id}>{inner}</div>;
                })}
            </div>
        </div>
    );
}
