"use client";

// Bosma (PDF) hisobot — brauzer print (Ctrl+P) yoki "Yuklab olish" tugma.
// A4 optimallashtirilgan CSS + rangsiz asosda.

import { useEffect, useState } from "react";
import { Printer, ArrowLeft, Loader2 } from "lucide-react";
import { fmtPrice } from "@/lib/bn-theme";
import { BnLink } from "./bn-nav";

interface RankRow { productId: string; title: string; soldQty: number; revenue: number; orders: number }
interface UnsoldRow { productId: string; title: string; price: number; stock: number; views: number; daysSinceCreated: number }
interface CatRow { name: string; soldQty: number; revenue: number; products: number }

interface AnalyticsResp {
    shop: { name: string };
    period: { from: string; to: string };
    summary: { totalRevenue: number; totalOrders: number; totalItems: number; uniqueBuyers: number; avgOrder: number };
    categoryBreakdown: CatRow[];
    rankings: {
        topSold: RankRow[]; topRevenue: RankRow[]; lowSold: RankRow[]; lowRevenue: RankRow[]; unsold: UnsoldRow[];
    };
}

function isoDate(d: Date): string { return d.toISOString().slice(0, 10); }

export function BnSellerAnalyticsPrint({ shopName, shopCity, shopPhone }: {
    shopName: string; shopCity: string; shopPhone: string;
}) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [from, setFrom] = useState(isoDate(monthStart));
    const [to, setTo] = useState(isoDate(now));
    const [data, setData] = useState<AnalyticsResp | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        fetch(`/api/bn/seller/analytics?from=${from}&to=${to}`, { cache: "no-store" })
            .then(r => r.json())
            .then(j => setData(j))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [from, to]);

    return (
        <div className="min-h-screen bg-white text-black">
            <style jsx global>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; }
                    @page { size: A4; margin: 15mm 12mm; }
                }
            `}</style>

            {/* Tugmalar (bosmada yashirin) */}
            <div className="no-print sticky top-0 z-10 bg-white border-b border-neutral-200 px-4 py-3 flex items-center gap-2 flex-wrap">
                <BnLink href="/sotuvchi/tahlil"
                    className="h-9 px-3 rounded-lg inline-flex items-center gap-1.5 text-[13px] font-bold border border-neutral-300 hover:bg-neutral-50">
                    <ArrowLeft className="w-4 h-4" /> Tahlilga qaytish
                </BnLink>
                <input type="date" value={from} max={to} onChange={e => setFrom(e.target.value)}
                    className="h-9 px-2 rounded-lg text-[13px] border border-neutral-300" />
                <span className="text-neutral-500">—</span>
                <input type="date" value={to} min={from} max={isoDate(now)} onChange={e => setTo(e.target.value)}
                    className="h-9 px-2 rounded-lg text-[13px] border border-neutral-300" />
                <div className="flex-1" />
                <button onClick={() => window.print()}
                    className="h-9 px-3 rounded-lg inline-flex items-center gap-1.5 text-[13px] font-black bg-black text-white hover:bg-neutral-800">
                    <Printer className="w-4 h-4" /> Bosma / PDF saqlash
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="w-6 h-6 animate-spin text-neutral-500" />
                </div>
            ) : data && (
                <div className="max-w-[210mm] mx-auto p-8">
                    {/* Sarlavha */}
                    <div className="border-b-2 border-black pb-4 mb-6">
                        <div className="flex items-start justify-between mb-2">
                            <div>
                                <p className="text-[11px] uppercase tracking-widest text-neutral-500">Bozor Narxida — Sotuvchi hisoboti</p>
                                <h1 className="text-[28px] font-black leading-tight">{shopName}</h1>
                                <p className="text-[12px] text-neutral-600 mt-1">
                                    {shopCity} · {shopPhone}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] uppercase text-neutral-500">Davr</p>
                                <p className="text-[14px] font-bold">{data.period.from.slice(0, 10)}</p>
                                <p className="text-[14px] font-bold">— {data.period.to.slice(0, 10)}</p>
                            </div>
                        </div>
                    </div>

                    {/* KPI panel */}
                    <div className="grid grid-cols-4 gap-3 mb-6">
                        <PrintStat label="Tushum" value={fmtPrice(data.summary.totalRevenue)} />
                        <PrintStat label="Buyurtma" value={String(data.summary.totalOrders)} />
                        <PrintStat label="Sotildi (dona)" value={String(data.summary.totalItems)} />
                        <PrintStat label="Xaridor" value={String(data.summary.uniqueBuyers)} />
                    </div>

                    {data.summary.avgOrder > 0 && (
                        <p className="text-[12px] text-neutral-600 mb-6">
                            O'rtacha buyurtma summasi: <b>{fmtPrice(data.summary.avgOrder)}</b>
                        </p>
                    )}

                    {/* Kategoriya */}
                    {data.categoryBreakdown.length > 0 && (
                        <Section title="Kategoriyalar bo'yicha tushum">
                            <table className="w-full text-[12px] border-collapse">
                                <thead>
                                    <tr className="border-b border-black">
                                        <th className="text-left py-1.5 font-black">#</th>
                                        <th className="text-left py-1.5 font-black">Kategoriya</th>
                                        <th className="text-right py-1.5 font-black">Sotilgan dona</th>
                                        <th className="text-right py-1.5 font-black">Mahsulot</th>
                                        <th className="text-right py-1.5 font-black">Tushum</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.categoryBreakdown.map((c, i) => (
                                        <tr key={c.name} className="border-b border-neutral-200">
                                            <td className="py-1.5">{i + 1}</td>
                                            <td className="py-1.5">{c.name}</td>
                                            <td className="text-right py-1.5">{c.soldQty}</td>
                                            <td className="text-right py-1.5">{c.products}</td>
                                            <td className="text-right py-1.5 font-bold">{fmtPrice(c.revenue)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </Section>
                    )}

                    {/* Top sotilgan */}
                    <RankTable title="Eng ko'p sotilgan (top 20)" rows={data.rankings.topSold.slice(0, 20)} />
                    <RankTable title="Eng ko'p tushum keltirgan (top 20)" rows={data.rankings.topRevenue.slice(0, 20)} />
                    <RankTable title="Eng kam sotilgan (top 20)" rows={data.rankings.lowSold.slice(0, 20)} />

                    {/* Sotilmagan */}
                    {data.rankings.unsold.length > 0 && (
                        <Section title={`Umuman sotilmagan mahsulotlar (${data.rankings.unsold.length})`}>
                            <table className="w-full text-[12px] border-collapse">
                                <thead>
                                    <tr className="border-b border-black">
                                        <th className="text-left py-1.5 font-black">#</th>
                                        <th className="text-left py-1.5 font-black">Nomi</th>
                                        <th className="text-right py-1.5 font-black">Narx</th>
                                        <th className="text-right py-1.5 font-black">Zaxira</th>
                                        <th className="text-right py-1.5 font-black">Ko'rishlar</th>
                                        <th className="text-right py-1.5 font-black">Kun</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.rankings.unsold.slice(0, 50).map((p, i) => (
                                        <tr key={p.productId} className="border-b border-neutral-200">
                                            <td className="py-1.5">{i + 1}</td>
                                            <td className="py-1.5">{p.title}</td>
                                            <td className="text-right py-1.5">{fmtPrice(p.price)}</td>
                                            <td className="text-right py-1.5">{p.stock}</td>
                                            <td className="text-right py-1.5">{p.views}</td>
                                            <td className="text-right py-1.5">{p.daysSinceCreated}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </Section>
                    )}

                    <div className="border-t-2 border-black pt-3 mt-8 flex items-center justify-between text-[10px] text-neutral-500">
                        <span>Hisobot avtomatik yaratildi — bozornarxida.uz</span>
                        <span>{new Date().toISOString().slice(0, 16).replace("T", " ")}</span>
                    </div>
                </div>
            )}
        </div>
    );
}

function PrintStat({ label, value }: { label: string; value: string }) {
    return (
        <div className="border-2 border-black rounded p-3">
            <p className="text-[10px] uppercase tracking-widest text-neutral-500">{label}</p>
            <p className="text-[16px] font-black leading-tight mt-1">{value}</p>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="mb-6" style={{ pageBreakInside: "avoid" }}>
            <h2 className="text-[14px] font-black uppercase tracking-widest border-b border-black pb-1 mb-2">{title}</h2>
            {children}
        </div>
    );
}

function RankTable({ title, rows }: { title: string; rows: RankRow[] }) {
    if (rows.length === 0) return null;
    return (
        <Section title={title}>
            <table className="w-full text-[12px] border-collapse">
                <thead>
                    <tr className="border-b border-black">
                        <th className="text-left py-1.5 font-black">#</th>
                        <th className="text-left py-1.5 font-black">Nomi</th>
                        <th className="text-right py-1.5 font-black">Sotilgan</th>
                        <th className="text-right py-1.5 font-black">Buyurtma</th>
                        <th className="text-right py-1.5 font-black">Tushum</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r, i) => (
                        <tr key={r.productId} className="border-b border-neutral-200">
                            <td className="py-1.5">{i + 1}</td>
                            <td className="py-1.5">{r.title}</td>
                            <td className="text-right py-1.5">{r.soldQty}</td>
                            <td className="text-right py-1.5">{r.orders}</td>
                            <td className="text-right py-1.5 font-bold">{fmtPrice(r.revenue)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </Section>
    );
}
