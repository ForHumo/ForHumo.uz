"use client";

// Founder tooli — mavjud do'konlarni tez kiritish (Sergeli digitizatsiya).
// Bozor + bo'lim (qator/blok) bir marta tanlanadi, keyin har do'kon: nom + tel +
// raqam → Qo'shish. Bozor/bo'lim saqlanadi, raqam avto-oshadi, ro'yxat to'planadi.

import { useEffect, useState } from "react";
import { Store, Plus, Check, Loader2, Building2 } from "lucide-react";
import { BN } from "@/lib/bn-theme";
import { bnToast } from "./bn-toast";

interface Market { slug: string; name: string; sections: string[] }
interface Added { id: string; name: string; section: string | null; no: string | null }

export function BnAdminAddShop() {
    const [markets, setMarkets] = useState<Market[]>([]);
    const [marketSlug, setMarketSlug] = useState("");
    const [section, setSection] = useState("");
    const [shopNo, setShopNo] = useState("");
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [legalType, setLegalType] = useState<"YATT" | "MCHJ">("YATT");
    const [legalName, setLegalName] = useState("");
    const [inn, setInn] = useState("");
    const [busy, setBusy] = useState(false);
    const [added, setAdded] = useState<Added[]>([]);

    useEffect(() => {
        (async () => {
            try {
                const r = await fetch("/api/bn/admin/shops");
                const d = await r.json();
                const ms = (d.markets ?? []) as Market[];
                setMarkets(ms);
                const sergeli = ms.find(m => m.slug.includes("sergeli")) ?? ms[0];
                if (sergeli) { setMarketSlug(sergeli.slug); if (sergeli.sections?.[0]) setSection(sergeli.sections[0]); }
            } catch { /* jim */ }
        })();
    }, []);

    const market = markets.find(m => m.slug === marketSlug);

    async function add() {
        if (name.trim().length < 2) { bnToast("Do'kon nomini kiriting", "error"); return; }
        setBusy(true);
        try {
            const r = await fetch("/api/bn/admin/shops", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    name: name.trim(),
                    marketSlug,
                    marketSection: section.trim() || null,
                    marketShopNo: shopNo.trim() || null,
                    phone: phone.trim() || null,
                    legalType,
                    legalName: legalName.trim() || null,
                    innNumber: inn.trim() || null,
                }),
            });
            const d = await r.json();
            if (!r.ok || !d?.ok) {
                bnToast(d?.error === "forbidden" ? "Ruxsat yo'q" : "Qo'shilmadi, qayta urining", "error");
                return;
            }
            setAdded(prev => [{ id: d.shop.id, name: d.shop.name, section: d.shop.marketSection, no: d.shop.marketShopNo }, ...prev]);
            bnToast(`${d.shop.name} qo'shildi`, "success");
            // Bozor/bo'lim saqlanadi, raqam avto-oshadi, nom/tel tozalanadi
            const nextNo = shopNo.trim() && /^\d+$/.test(shopNo.trim()) ? String(Number(shopNo.trim()) + 1) : shopNo;
            setShopNo(nextNo);
            setName(""); setPhone(""); setLegalName(""); setInn("");
        } catch {
            bnToast("Ulanish xatoligi", "error");
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="mx-auto max-w-[560px]">
            <div className="flex items-center gap-2 mb-4">
                <Store className="w-5 h-5" style={{ color: BN.gold }} />
                <h2 className="text-[17px] font-black">Do&apos;kon qo&apos;shish</h2>
            </div>

            <div className="rounded-2xl p-4 space-y-3.5" style={{ background: BN.surface, border: `1px solid ${BN.border}` }}>
                {/* Bozor */}
                <div>
                    <label className="text-[11px] font-black uppercase tracking-wider mb-1.5 block" style={{ color: BN.text3 }}>Bozor</label>
                    <div className="flex flex-wrap gap-1.5">
                        {markets.map(m => (
                            <button
                                key={m.slug}
                                onClick={() => { setMarketSlug(m.slug); if (m.sections?.[0]) setSection(m.sections[0]); }}
                                className="h-9 px-3 rounded-xl text-[12.5px] font-bold transition-colors"
                                style={{
                                    background: m.slug === marketSlug ? BN.goldSoft : BN.surfaceUp,
                                    border: `1px solid ${m.slug === marketSlug ? BN.gold : BN.border}`,
                                    color: m.slug === marketSlug ? BN.gold : BN.text2,
                                }}
                            >
                                {m.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Bo'lim (qator/blok) */}
                <div>
                    <label className="text-[11px] font-black uppercase tracking-wider mb-1.5 block" style={{ color: BN.text3 }}>Bo&apos;lim (qator / blok)</label>
                    {market?.sections && market.sections.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                            {market.sections.map(s => (
                                <button
                                    key={s}
                                    onClick={() => setSection(s)}
                                    className="h-8 px-2.5 rounded-lg text-[11.5px] font-bold transition-colors"
                                    style={{
                                        background: s === section ? BN.gold : BN.surfaceUp,
                                        color: s === section ? BN.onGold : BN.text3,
                                    }}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}
                    <input value={section} onChange={e => setSection(e.target.value)} placeholder="A blok / 12-qator"
                        className="w-full h-11 rounded-xl px-3.5 text-[14px]" style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}`, color: "#fff" }} />
                </div>

                {/* Nom + raqam */}
                <div className="grid grid-cols-[1fr_auto] gap-2">
                    <div>
                        <label className="text-[11px] font-black uppercase tracking-wider mb-1.5 block" style={{ color: BN.text3 }}>Do&apos;kon nomi</label>
                        <input value={name} onChange={e => setName(e.target.value)} placeholder="Jalol Motors"
                            onKeyDown={e => { if (e.key === "Enter") void add(); }}
                            className="w-full h-11 rounded-xl px-3.5 text-[14px]" style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}`, color: "#fff" }} />
                    </div>
                    <div className="w-24">
                        <label className="text-[11px] font-black uppercase tracking-wider mb-1.5 block" style={{ color: BN.text3 }}>Raqam</label>
                        <input value={shopNo} onChange={e => setShopNo(e.target.value)} placeholder="1"
                            className="w-full h-11 rounded-xl px-3.5 text-[14px] tabular-nums text-center" style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}`, color: "#fff" }} />
                    </div>
                </div>

                {/* Telefon */}
                <div>
                    <label className="text-[11px] font-black uppercase tracking-wider mb-1.5 block" style={{ color: BN.text3 }}>Telefon</label>
                    <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+998 90 000 00 00" inputMode="tel"
                        className="w-full h-11 rounded-xl px-3.5 text-[14px]" style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}`, color: "#fff" }} />
                </div>

                {/* Huquqiy shakl + STIR */}
                <div className="grid grid-cols-[auto_1fr] gap-2">
                    <div className="flex rounded-xl overflow-hidden self-end" style={{ border: `1px solid ${BN.border}`, height: 44 }}>
                        {(["YATT", "MCHJ"] as const).map(lt => (
                            <button key={lt} onClick={() => setLegalType(lt)}
                                className="px-3 text-[12.5px] font-bold"
                                style={{ background: legalType === lt ? BN.gold : BN.surfaceUp, color: legalType === lt ? BN.onGold : BN.text3 }}>
                                {lt}
                            </button>
                        ))}
                    </div>
                    <div>
                        <label className="text-[11px] font-black uppercase tracking-wider mb-1.5 block" style={{ color: BN.text3 }}>STIR (ixtiyoriy)</label>
                        <input value={inn} onChange={e => setInn(e.target.value.replace(/\D/g, "").slice(0, 9))} placeholder="123456789" inputMode="numeric"
                            className="w-full h-11 rounded-xl px-3.5 text-[14px] tabular-nums" style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}`, color: "#fff" }} />
                    </div>
                </div>

                <button onClick={add} disabled={busy || name.trim().length < 2}
                    className="w-full h-12 rounded-xl text-[15px] font-black flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ background: BN.gold, color: BN.onGold }}>
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-5 h-5" />}
                    Qo&apos;shish
                </button>
                <p className="text-[11px] text-center" style={{ color: BN.text3 }}>
                    Do&apos;kon <b>APPROVED</b> yaratiladi. Haqiqiy sotuvchi kelganда ega o&apos;tkaziladi.
                </p>
            </div>

            {/* Shu sessiyada qo'shilganlar */}
            {added.length > 0 && (
                <div className="mt-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Check className="w-4 h-4" style={{ color: BN.ok }} />
                        <span className="text-[13px] font-bold">Qo&apos;shildi: {added.length}</span>
                    </div>
                    <div className="space-y-1.5">
                        {added.map(a => (
                            <div key={a.id} className="flex items-center gap-2.5 rounded-xl p-2.5" style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}` }}>
                                <Building2 className="w-4 h-4 flex-shrink-0" style={{ color: BN.gold }} />
                                <span className="text-[13px] font-bold flex-1 truncate">{a.name}</span>
                                <span className="text-[11.5px]" style={{ color: BN.text3 }}>
                                    {[a.section, a.no ? `${a.no}-do'kon` : null].filter(Boolean).join(" · ")}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
