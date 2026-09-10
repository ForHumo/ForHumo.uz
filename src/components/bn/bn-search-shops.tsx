// Qidiruv sahifasida do'kon va bozor natijalari (mahsulot ro'yxatidan yuqorida).
// Server komponent — client interaktivligi shart emas.

import { Store, MapPin, Package } from "lucide-react";
import { BnLink } from "@/components/bn/bn-nav";
import { BN } from "@/lib/bn-theme";

interface ShopHit {
    slug: string;
    name: string;
    logoUrl: string | null;
    city: string | null;
    marketName: string | null;
    productCount: number;
}
interface MarketHit {
    slug: string;
    name: string;
    city: string | null;
    coverUrl: string | null;
}

export function BnSearchShops({ shops, markets }: { shops: ShopHit[]; markets: MarketHit[] }) {
    return (
        <div className="mx-auto max-w-[1280px] px-4 pt-4 space-y-3">
            {shops.length > 0 && (
                <section>
                    <h3 className="text-[13px] font-black mb-2 flex items-center gap-1.5" style={{ color: BN.text2 }}>
                        <Store className="w-3.5 h-3.5" style={{ color: BN.gold }} />
                        Do&apos;konlar ({shops.length})
                    </h3>
                    <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
                        {shops.map(s => (
                            <BnLink
                                key={s.slug}
                                href={`/d/${s.slug}`}
                                className="flex-shrink-0 w-[220px] rounded-2xl p-3 transition-colors"
                                style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                            >
                                <div className="flex items-center gap-2.5">
                                    <span
                                        className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 grid place-items-center"
                                        style={{ background: BN.surfaceUp }}
                                    >
                                        {s.logoUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={s.logoUrl} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <Store className="w-5 h-5" style={{ color: BN.text3 }} />
                                        )}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[13px] font-bold truncate">{s.name}</div>
                                        <div className="text-[11px] truncate flex items-center gap-1" style={{ color: BN.text3 }}>
                                            {s.marketName || s.city || "Toshkent"}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 text-[11px] mt-2" style={{ color: BN.text3 }}>
                                    <Package className="w-3 h-3" />
                                    {s.productCount} ta mahsulot
                                </div>
                            </BnLink>
                        ))}
                    </div>
                </section>
            )}

            {markets.length > 0 && (
                <section>
                    <h3 className="text-[13px] font-black mb-2 flex items-center gap-1.5" style={{ color: BN.text2 }}>
                        <MapPin className="w-3.5 h-3.5" style={{ color: BN.gold }} />
                        Bozorlar ({markets.length})
                    </h3>
                    <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
                        {markets.map(m => (
                            <BnLink
                                key={m.slug}
                                href={`/m/${m.slug}`}
                                className="flex-shrink-0 w-[200px] rounded-2xl overflow-hidden transition-colors"
                                style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                            >
                                <div className="w-full h-20 relative" style={{ background: BN.surfaceUp }}>
                                    {m.coverUrl && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={m.coverUrl} alt="" className="w-full h-full object-cover" />
                                    )}
                                </div>
                                <div className="p-2.5">
                                    <div className="text-[13px] font-bold truncate">{m.name}</div>
                                    <div className="text-[11px] truncate" style={{ color: BN.text3 }}>
                                        {m.city ?? "Toshkent"}
                                    </div>
                                </div>
                            </BnLink>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
