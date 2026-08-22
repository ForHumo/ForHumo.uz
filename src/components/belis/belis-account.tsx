"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useLocale } from "next-intl";
import { Loader2, User, LogIn, Package, Settings } from "lucide-react";
import { BELIS, BELIS_GOLD_GRADIENT } from "@/lib/belis-theme";
import { BelisLink } from "./belis-nav";

interface OrderLite {
    id: string; code: string; status: string; total: number | string; currency: string; createdAt: string;
    items: Array<{ productName: string; quantity: number }>;
}

export function BelisAccount() {
    const { data: session, status } = useSession();
    const [orders, setOrders] = useState<OrderLite[]>([]);
    const [loading, setLoading] = useState(true);
    const locale = useLocale();

    useEffect(() => {
        if (status !== "authenticated") { setLoading(false); return; }
        fetch("/api/belis/orders").then(r => r.ok ? r.json() : null)
            .then(d => setOrders(d?.items ?? []))
            .finally(() => setLoading(false));
    }, [status]);

    const fmt = (n: number | string, cur: string) =>
        `${new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "uz-UZ").format(Number(n))} ${cur === "USD" ? "$" : "so'm"}`;

    if (status === "loading") return <div className="text-center py-20"><Loader2 className="w-6 h-6 animate-spin inline" style={{ color: BELIS.gold }} /></div>;

    if (status !== "authenticated") {
        return (
            <div className="max-w-md mx-auto px-4 py-16 text-center">
                <User className="w-14 h-14 mx-auto mb-3" strokeWidth={1.25} style={{ color: BELIS.gold }} />
                <p style={{ fontFamily: "'Playfair Display', serif", color: BELIS.gold, fontSize: 24, margin: "0 0 8px" }}>Kabinet</p>
                <p className="text-sm mb-6" style={{ color: BELIS.text2 }}>
                    Buyurtmalaringizni ko&apos;rish va yangi buyurtma qilish uchun Humo ID bilan kiring
                </p>
                <button onClick={() => signIn("google")}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-black transition hover:brightness-110"
                    style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold, fontFamily: "'Montserrat', sans-serif" }}>
                    <LogIn className="w-4 h-4" strokeWidth={1.5} /> Google bilan kirish
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto px-4 py-6">
            <div className="mb-6 p-5 rounded-2xl flex items-center gap-3"
                style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}>
                {session?.user?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={session.user.image} alt="" className="w-14 h-14 rounded-full object-cover" style={{ border: `2px solid ${BELIS.gold}` }} />
                ) : (
                    <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: BELIS.gold, color: BELIS.onGold }}>
                        <User className="w-6 h-6" />
                    </div>
                )}
                <div>
                    <p className="text-lg font-bold" style={{ color: BELIS.text, fontFamily: "'Playfair Display', serif" }}>
                        {session?.user?.name ?? "Foydalanuvchi"}
                    </p>
                    <p className="text-xs" style={{ color: BELIS.text2 }}>{session?.user?.email}</p>
                </div>
            </div>

            <div className="flex items-center gap-2 mb-4">
                <Package className="w-4 h-4" strokeWidth={1.5} style={{ color: BELIS.gold }} />
                <p className="text-sm font-black uppercase tracking-widest" style={{ color: BELIS.text2 }}>Buyurtmalar</p>
            </div>

            {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin" style={{ color: BELIS.gold }} /></div>
            ) : orders.length === 0 ? (
                <div className="text-center py-10 rounded-2xl"
                    style={{ background: BELIS.surface, border: `1px dashed ${BELIS.border}` }}>
                    <p className="text-sm mb-3" style={{ color: BELIS.text2 }}>Buyurtmalaringiz hali yo&apos;q</p>
                    <BelisLink href="/belis/katalog" className="text-xs font-bold hover:underline" style={{ color: BELIS.gold }}>
                        Katalogni ochish →
                    </BelisLink>
                </div>
            ) : (
                <div className="space-y-3">
                    {orders.map(o => (
                        <BelisLink key={o.id} href={`/belis/buyurtma/${o.id}` as never}
                            className="block p-4 rounded-2xl transition hover:brightness-105"
                            style={{ background: BELIS.surface, border: `1px solid ${BELIS.borderSoft}` }}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs uppercase tracking-widest" style={{ color: BELIS.text2 }}>{o.code}</p>
                                    <p className="text-sm mt-0.5" style={{ color: BELIS.text }}>
                                        {o.items.length} ta mahsulot · {new Date(o.createdAt).toLocaleDateString(locale === "ru" ? "ru-RU" : "uz-UZ")}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-base font-black" style={{ color: BELIS.gold }}>{fmt(o.total, o.currency)}</p>
                                    <p className="text-[10px] mt-0.5" style={{ color: BELIS.text3 }}>{o.status}</p>
                                </div>
                            </div>
                        </BelisLink>
                    ))}
                </div>
            )}

            {/* Admin havolasi (Belis admin bo'lsa) */}
            {(session?.user?.email && ["sevinch", "abduvoris"].some(u => (session?.user?.email ?? "").toLowerCase().includes(u))) && (
                <BelisLink href="/belis/admin"
                    className="mt-6 flex items-center gap-2 justify-center p-3 rounded-xl text-xs font-bold transition hover:brightness-105"
                    style={{ background: BELIS.surface, border: `1px solid ${BELIS.gold}`, color: BELIS.gold, fontFamily: "'Montserrat', sans-serif" }}>
                    <Settings className="w-3.5 h-3.5" strokeWidth={1.5} /> Admin panel
                </BelisLink>
            )}
        </div>
    );
}
