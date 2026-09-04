"use client";

// Belis komplekt detail — 14 quti ro'yxati + "Ijaraga olish" tugmasi (wizard ochadi).

import { useEffect, useState } from "react";
import { ChevronLeft, Package, Loader2, Calendar, Shield, MapPin } from "lucide-react";
import { BELIS, BELIS_GOLD_GRADIENT, BELIS_LOCATION } from "@/lib/belis-theme";
import { BelisLink } from "./belis-nav";
import { BelisBookingWizard } from "./belis-booking-wizard";

interface Item {
    id: string;
    slug: string;
    kind: string;
    nameUz: string;
    images: string[];
    dailyRentUzs: number;
    deposit: number;
    copyCount: number;
}

interface Detail {
    id: string;
    slug: string;
    kind: "FOTIHA" | "BESHIK_TOY" | "CUSTOM";
    nameUz: string;
    descriptionUz?: string | null;
    images: string[];
    dailyRentUzs: number;
    deposit: number;
    itemsCount: number;
    copyCount: number;
    items: Item[];
}

function fmtSom(n: number): string {
    return `${n.toLocaleString("uz-UZ")} so'm`;
}

export function BelisKomplektDetail({ slug }: { slug: string }) {
    const [data, setData] = useState<Detail | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [wizardOpen, setWizardOpen] = useState(false);
    const [imgIdx, setImgIdx] = useState(0);

    useEffect(() => {
        fetch(`/api/belis/komplektlar/${slug}`, { cache: "no-store" })
            .then(r => r.json())
            .then(d => {
                if (d?.error) setError(d.error);
                else setData(d as Detail);
            })
            .catch(() => setError("network"));
    }, [slug]);

    if (error === "not_found") {
        return (
            <div className="max-w-2xl mx-auto px-4 py-16 text-center">
                <p className="text-[15px]" style={{ color: BELIS.text2 }}>Komplekt topilmadi</p>
                <BelisLink href="/katalog" className="mt-3 inline-block text-[13px] font-black" style={{ color: BELIS.goldDeep }}>Katalogga qaytish</BelisLink>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: BELIS.gold }} />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-6">
            <BelisLink href="/katalog" className="inline-flex items-center gap-1 text-[13px] font-black mb-4"
                style={{ color: BELIS.text2 }}>
                <ChevronLeft className="w-4 h-4" /> Katalog
            </BelisLink>

            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6 mb-6">
                {/* Rasm gallereya */}
                <div>
                    <div className="rounded-2xl overflow-hidden aspect-[4/3]"
                        style={{ background: BELIS.surfaceUp, border: `1px solid ${BELIS.border}` }}>
                        {data.images[imgIdx] && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={data.images[imgIdx]} alt={data.nameUz} className="w-full h-full object-cover" />
                        )}
                    </div>
                    {data.images.length > 1 && (
                        <div className="flex gap-2 mt-3 overflow-x-auto">
                            {data.images.map((img, i) => (
                                <button key={i} onClick={() => setImgIdx(i)}
                                    className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0"
                                    style={{ border: `2px solid ${imgIdx === i ? BELIS.gold : "transparent"}` }}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={img} alt="" className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Ma'lumot + narx + CTA */}
                <div>
                    <h1 className="text-[26px] font-black tracking-tight leading-tight" style={{ color: BELIS.text }}>
                        {data.nameUz}
                    </h1>
                    <p className="text-[13px] mt-1 mb-4" style={{ color: BELIS.text2 }}>
                        {data.itemsCount} ta quti · {data.copyCount} nusxa mavjud
                    </p>

                    {data.descriptionUz && (
                        <p className="text-[13.5px] leading-relaxed mb-4" style={{ color: BELIS.text2 }}>{data.descriptionUz}</p>
                    )}

                    <div className="rounded-2xl p-4 mb-4" style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}>
                        <div className="flex items-baseline justify-between mb-1">
                            <span className="text-[11px] uppercase tracking-widest" style={{ color: BELIS.text3 }}>Kunlik ijara</span>
                            <span className="text-[20px] font-black" style={{ color: BELIS.goldDeep }}>{fmtSom(data.dailyRentUzs)}</span>
                        </div>
                        <div className="flex items-baseline justify-between text-[12px]" style={{ color: BELIS.text2 }}>
                            <span>Zaklat</span>
                            <span className="font-black">{fmtSom(data.deposit)}</span>
                        </div>
                    </div>

                    <button onClick={() => setWizardOpen(true)}
                        className="w-full h-13 rounded-2xl text-[15px] font-black flex items-center justify-center gap-2 py-4"
                        style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold, boxShadow: "0 6px 20px rgba(212,175,55,0.35)" }}>
                        <Calendar className="w-5 h-5" /> Ijaraga olish
                    </button>

                    {/* Ma'lumotlar */}
                    <div className="mt-4 space-y-2 text-[12.5px]" style={{ color: BELIS.text2 }}>
                        <div className="flex items-start gap-2">
                            <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: BELIS.goldDeep }} />
                            <span>Pasport nusxasi garov sifatida qoldiriladi (asl pasport qaytariladi)</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <Calendar className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: BELIS.goldDeep }} />
                            <span>Marosim kunidan 1 kun oldin olib ketiladi, 3 kun ichida qaytariladi</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: BELIS.goldDeep }} />
                            <span>Do&apos;kon: {BELIS_LOCATION.address} · Yandex chaqirish mumkin (mijoz to&apos;laydi)</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Qutilar ro'yxati */}
            <section className="mt-8">
                <div className="flex items-center gap-2 mb-4">
                    <Package className="w-5 h-5" style={{ color: BELIS.goldDeep }} />
                    <h2 className="text-[18px] font-black" style={{ color: BELIS.text }}>Komplekt ichida</h2>
                    <span className="text-[12px]" style={{ color: BELIS.text3 }}>({data.items.length} ta)</span>
                </div>
                {data.items.length === 0 ? (
                    <div className="p-8 rounded-2xl text-center text-[13px]" style={{ background: BELIS.surface, color: BELIS.text3, border: `1px solid ${BELIS.border}` }}>
                        Alohida qutilar hali ro&apos;yxatga olinmagan
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {data.items.map(it => (
                            <div key={it.id} className="rounded-xl overflow-hidden"
                                style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}>
                                <div className="aspect-square" style={{ background: BELIS.surfaceUp }}>
                                    {it.images[0] && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={it.images[0]} alt={it.nameUz} className="w-full h-full object-cover" />
                                    )}
                                </div>
                                <div className="p-2">
                                    <p className="text-[11.5px] font-black line-clamp-1" style={{ color: BELIS.text }}>{it.nameUz}</p>
                                    <p className="text-[10px] tabular-nums" style={{ color: BELIS.text3 }}>{fmtSom(it.dailyRentUzs)}/kun</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {wizardOpen && (
                <BelisBookingWizard
                    komplektSlug={data.slug}
                    komplektName={data.nameUz}
                    onClose={() => setWizardOpen(false)}
                />
            )}
        </div>
    );
}
