"use client";

// Belis home — hero + komplektlar preview + qanday ishlaydi + social.

import { useEffect, useState } from "react";
import {
    Home as HomeIcon, CalendarClock, Sparkles, ArrowRight, ChevronRight,
    Loader2, Package, Shield, Truck, MapPin, MessageCircle, Instagram,
} from "lucide-react";
import { BELIS, BELIS_GOLD_GRADIENT, BELIS_SOCIAL, BELIS_LOCATION } from "@/lib/belis-theme";
import { BelisLink } from "./belis-nav";

interface Komplekt {
    id: string;
    slug: string;
    kind: "FOTIHA" | "BESHIK_TOY" | "CUSTOM";
    nameUz: string;
    images: string[];
    dailyRentUzs: number;
    itemsCount: number;
    copyCount: number;
}

const KIND_LABEL: Record<Komplekt["kind"], string> = {
    FOTIHA: "Fotiha",
    BESHIK_TOY: "Beshik to'y",
    CUSTOM: "Maxsus",
};

function fmtSom(n: number): string {
    return `${n.toLocaleString("uz-UZ")} so'm`;
}

export function BelisHome() {
    const [rows, setRows] = useState<Komplekt[] | null>(null);

    useEffect(() => {
        fetch("/api/belis/komplektlar", { cache: "no-store" })
            .then(r => r.json())
            .then(d => setRows(Array.isArray(d?.komplektlar) ? d.komplektlar.slice(0, 6) : []))
            .catch(() => setRows([]));
    }, []);

    return (
        <div className="max-w-6xl mx-auto px-4 py-6 space-y-10">
            {/* Hero */}
            <section className="relative rounded-3xl overflow-hidden p-6 sm:p-10"
                style={{ background: BELIS_GOLD_GRADIENT }}>
                <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full pointer-events-none"
                    style={{ background: "radial-gradient(circle, rgba(255,255,255,0.35) 0%, transparent 70%)" }} />
                <div className="relative max-w-lg">
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-3"
                        style={{ background: "rgba(58,53,32,0.15)", color: BELIS.onGold }}>
                        <Sparkles className="w-3 h-3" /> Belis · Sarpo qutilari
                    </div>
                    <h1 className="text-[28px] sm:text-[38px] font-black leading-tight tracking-tight mb-3"
                        style={{ color: BELIS.onGold }}>
                        Marosim uchun sarpo qutilari ijaraga
                    </h1>
                    <p className="text-[14px] sm:text-[15px] mb-5 opacity-90" style={{ color: BELIS.onGold }}>
                        Fotiha va Beshik to&apos;y uchun to&apos;liq to&apos;plamlar.
                        Marosim kunidan 1 kun oldin oling, 3 kun ichida qaytarib bering.
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <BelisLink href="/katalog"
                            className="h-12 px-6 rounded-2xl text-[14px] font-black flex items-center gap-2"
                            style={{ background: BELIS.text, color: BELIS.goldSoft }}>
                            <Package className="w-4 h-4" /> Katalog
                            <ArrowRight className="w-4 h-4" />
                        </BelisLink>
                        <BelisLink href="/kabinet"
                            className="h-12 px-6 rounded-2xl text-[14px] font-black flex items-center gap-2"
                            style={{ background: "rgba(255,255,255,0.35)", color: BELIS.onGold }}>
                            <CalendarClock className="w-4 h-4" /> Mening arizalarim
                        </BelisLink>
                    </div>
                </div>
            </section>

            {/* Komplektlar preview */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[20px] font-black" style={{ color: BELIS.text }}>Mavjud komplektlar</h2>
                    <BelisLink href="/katalog" className="text-[13px] font-black flex items-center gap-0.5" style={{ color: BELIS.goldDeep }}>
                        Barchasi <ChevronRight className="w-3.5 h-3.5" />
                    </BelisLink>
                </div>
                {rows === null && (
                    <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: BELIS.gold }} /></div>
                )}
                {rows && rows.length === 0 && (
                    <div className="text-center py-12 rounded-2xl"
                        style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}>
                        <Package className="w-10 h-10 mx-auto mb-3 opacity-60" style={{ color: BELIS.gold }} />
                        <p className="text-[13.5px]" style={{ color: BELIS.text2 }}>Tez orada komplektlar qo&apos;shiladi</p>
                    </div>
                )}
                {rows && rows.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {rows.map(k => (
                            <BelisLink key={k.id} href={`/k/${k.slug}` as never}
                                className="group rounded-2xl overflow-hidden transition-transform active:scale-[0.98]"
                                style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}>
                                <div className="relative aspect-[4/3] overflow-hidden" style={{ background: BELIS.surfaceUp }}>
                                    {k.images[0] && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={k.images[0]} alt={k.nameUz}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                    )}
                                    <span className="absolute top-3 left-3 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest"
                                        style={{ background: BELIS.goldSoft, color: BELIS.onGold }}>
                                        {KIND_LABEL[k.kind]}
                                    </span>
                                </div>
                                <div className="p-4">
                                    <p className="text-[14.5px] font-black line-clamp-1" style={{ color: BELIS.text }}>{k.nameUz}</p>
                                    <p className="text-[11.5px] mt-0.5" style={{ color: BELIS.text3 }}>{k.itemsCount} ta quti</p>
                                    <div className="mt-2 flex items-center justify-between">
                                        <span className="text-[14px] font-black" style={{ color: BELIS.goldDeep }}>{fmtSom(k.dailyRentUzs)}/kun</span>
                                        <ChevronRight className="w-4 h-4" style={{ color: BELIS.gold }} />
                                    </div>
                                </div>
                            </BelisLink>
                        ))}
                    </div>
                )}
            </section>

            {/* Qanday ishlaydi */}
            <section>
                <h2 className="text-[20px] font-black mb-4" style={{ color: BELIS.text }}>Qanday ishlaydi</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Step n={1} title="Ariza bering" text="Marosim sanasini tanlang, pasport nusxasi va aloqa qoldiring." icon={<CalendarClock className="w-5 h-5" />} />
                    <Step n={2} title="Sarpo oling" text="Marosimdan 1 kun oldin do'kondan olib keting yoki Yandex chaqiring." icon={<Package className="w-5 h-5" />} />
                    <Step n={3} title="3 kunda qaytaring" text="Marosim tugagach 3 kun ichida butun holida qaytaring — zaklat qaytariladi." icon={<HomeIcon className="w-5 h-5" />} />
                </div>
            </section>

            {/* Muhim ma'lumot */}
            <section>
                <div className="rounded-2xl p-5"
                    style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[13px]" style={{ color: BELIS.text2 }}>
                        <Info icon={<Shield className="w-4 h-4" />} title="Pasport nusxasi">
                            Asl pasport ushlab qolinmaydi (qonuniy taqiqlangan). Faqat nusxa va shartnoma.
                        </Info>
                        <Info icon={<MapPin className="w-4 h-4" />} title="Manzil">
                            Belis do&apos;koni · {BELIS_LOCATION.address}. Toshkent shahar va viloyat bo&apos;ylab yetkazish (Yandex).
                        </Info>
                        <Info icon={<Truck className="w-4 h-4" />} title="Yandex to'lovi">
                            Kuryerni mijoz o&apos;zi chaqiradi va to&apos;laydi. Ijara summasi bilan qo&apos;shilmaydi.
                        </Info>
                        <Info icon={<Sparkles className="w-4 h-4" />} title="Zaklat va shtraf">
                            Har komplektga zaklat qoldiriladi. Butun qaytsa — to&apos;liq qaytariladi. Buzilsa/kam qaytsa shtraf ijara pulidan qimmatga tushadi.
                        </Info>
                    </div>
                </div>
            </section>

            {/* Aloqa */}
            <section>
                <h2 className="text-[20px] font-black mb-4" style={{ color: BELIS.text }}>Aloqa</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <a href={BELIS_SOCIAL.telegramChannel} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-3 p-4 rounded-2xl transition-colors"
                        style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}>
                        <span className="w-11 h-11 rounded-xl grid place-items-center" style={{ background: "#229ED9", color: "#fff" }}>
                            <MessageCircle className="w-5 h-5" />
                        </span>
                        <div>
                            <p className="text-[14px] font-black" style={{ color: BELIS.text }}>Telegram</p>
                            <p className="text-[12px]" style={{ color: BELIS.text2 }}>Yangi qutilar va promo</p>
                        </div>
                    </a>
                    <a href={BELIS_SOCIAL.instagram} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-3 p-4 rounded-2xl transition-colors"
                        style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}>
                        <span className="w-11 h-11 rounded-xl grid place-items-center text-white"
                            style={{ background: "linear-gradient(135deg,#f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)" }}>
                            <Instagram className="w-5 h-5" />
                        </span>
                        <div>
                            <p className="text-[14px] font-black" style={{ color: BELIS.text }}>Instagram</p>
                            <p className="text-[12px]" style={{ color: BELIS.text2 }}>Fotolar va marosim video</p>
                        </div>
                    </a>
                </div>
            </section>
        </div>
    );
}

function Step({ n, title, text, icon }: { n: number; title: string; text: string; icon: React.ReactNode }) {
    return (
        <div className="rounded-2xl p-4" style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}>
            <div className="flex items-center gap-2 mb-2">
                <span className="w-9 h-9 rounded-xl grid place-items-center flex-shrink-0"
                    style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold }}>
                    {icon}
                </span>
                <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: BELIS.text3 }}>Qadam {n}</span>
            </div>
            <p className="text-[14px] font-black" style={{ color: BELIS.text }}>{title}</p>
            <p className="text-[12.5px] mt-1" style={{ color: BELIS.text2 }}>{text}</p>
        </div>
    );
}

function Info({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
    return (
        <div className="flex items-start gap-2.5">
            <span className="w-9 h-9 rounded-xl grid place-items-center flex-shrink-0"
                style={{ background: BELIS.goldSoft, color: BELIS.goldDeep }}>{icon}</span>
            <div>
                <p className="text-[13px] font-black" style={{ color: BELIS.text }}>{title}</p>
                <p className="text-[12px] mt-0.5" style={{ color: BELIS.text2 }}>{children}</p>
            </div>
        </div>
    );
}
