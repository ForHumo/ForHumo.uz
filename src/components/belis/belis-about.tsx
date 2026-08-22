"use client";

import { useTranslations } from "next-intl";
import { MapPin, Send, Instagram, Globe } from "lucide-react";
import { BELIS, BELIS_LOCATION, BELIS_SOCIAL, BELIS_GOLD_GRADIENT } from "@/lib/belis-theme";

const FAQ = [
    {
        q: "Belis nima?",
        a: "Belis — nafis sarpo qutilari va sovg'a to'plamlari studiyasi. Har bir mahsulot mehr va e'tibor bilan tayyorlanadi.",
    },
    {
        q: "Buyurtmani qanday berish mumkin?",
        a: "Katalogdan yoqqan mahsulotni tanlab, savatga qo'shing va checkout'da yetkazish va to'lov usulini tanlang. Yoki bizning Telegram bot orqali ham buyurtma berishingiz mumkin.",
    },
    {
        q: "Yetkazib berish qanday amalga oshiriladi?",
        a: "Toshkent bo'ylab — Yandex Delivery orqali. Viloyatlarga — BTS Express. Belis manziliga kelib olib ketish ham mumkin (bepul).",
    },
    {
        q: "To'lov qanday?",
        a: "Karta orqali o'tkazma yoki naqd (o'zi olib ketishda). Yaqin kelajakda Payme/Click ham qo'shiladi.",
    },
    {
        q: "Qaytarish qoidasi qanday?",
        a: "Sarpo qutilari va sovg'a to'plamlari individual tayyorlangani uchun qaytarish qabul qilinmaydi. Faqat mahsulot buzilgan yoki noto'g'ri yuborilgan holda o'zgartiriladi.",
    },
];

export function BelisAbout() {
    const t = useTranslations("belis");
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${BELIS_LOCATION.lat},${BELIS_LOCATION.lng}`;

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            {/* Hero */}
            <div className="text-center mb-10">
                <p style={{ fontFamily: "'Great Vibes', cursive", fontSize: 64, color: BELIS.gold, lineHeight: 1, margin: "0 0 8px" }}>
                    Belis
                </p>
                <p className="text-lg italic" style={{ color: BELIS.text2, fontFamily: "'Playfair Display', serif" }}>
                    Siz uchun, mehr bilan…
                </p>
                <p className="text-sm mt-4 max-w-md mx-auto" style={{ color: BELIS.text, lineHeight: 1.7 }}>
                    Har bir sarpo — alohida hikoya. Har bir sovg'a — samimiy his.
                    Belis'da biz nafis to'plamlarni g'amxo'rlik bilan tayyorlaymiz.
                </p>
            </div>

            {/* Manzil */}
            <div className="mb-8 p-5 rounded-2xl"
                style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}>
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center"
                        style={{ background: BELIS.gold }}>
                        <MapPin className="w-4 h-4" strokeWidth={1.5} style={{ color: BELIS.onGold }} />
                    </div>
                    <div className="flex-1">
                        <p className="text-xs uppercase tracking-widest mb-1" style={{ color: BELIS.text2 }}>{t("about.location")}</p>
                        <p className="text-sm font-bold mb-1" style={{ color: BELIS.text }}>Toshkent shahri</p>
                        <p className="text-xs mb-3" style={{ color: BELIS.text3 }}>{BELIS_LOCATION.dms}</p>
                        <a href={mapUrl} target="_blank" rel="noopener"
                            className="inline-flex items-center gap-1.5 text-xs font-bold hover:underline"
                            style={{ color: BELIS.gold, fontFamily: "'Montserrat', sans-serif" }}>
                            Xaritada ochish →
                        </a>
                    </div>
                </div>
            </div>

            {/* Aloqa */}
            <div className="mb-8">
                <p className="text-xs uppercase tracking-widest text-center mb-4" style={{ color: BELIS.text2, fontFamily: "'Montserrat', sans-serif", fontWeight: 500 }}>
                    {t("about.contacts")}
                </p>
                <div className="grid grid-cols-3 gap-3">
                    <a href={BELIS_SOCIAL.telegramChannel} target="_blank" rel="noopener"
                        className="p-4 rounded-2xl text-center transition hover:brightness-105"
                        style={{ background: BELIS.surface, border: `1px solid ${BELIS.borderSoft}` }}>
                        <Send className="w-5 h-5 mx-auto mb-1.5" strokeWidth={1.5} style={{ color: BELIS.gold }} />
                        <p className="text-xs font-bold" style={{ color: BELIS.text }}>@belisuz</p>
                    </a>
                    <a href={BELIS_SOCIAL.instagram} target="_blank" rel="noopener"
                        className="p-4 rounded-2xl text-center transition hover:brightness-105"
                        style={{ background: BELIS.surface, border: `1px solid ${BELIS.borderSoft}` }}>
                        <Instagram className="w-5 h-5 mx-auto mb-1.5" strokeWidth={1.5} style={{ color: BELIS.gold }} />
                        <p className="text-xs font-bold" style={{ color: BELIS.text }}>belis.uz</p>
                    </a>
                    <a href={BELIS_SOCIAL.telegramBot} target="_blank" rel="noopener"
                        className="p-4 rounded-2xl text-center transition hover:brightness-110"
                        style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold }}>
                        <Globe className="w-5 h-5 mx-auto mb-1.5" strokeWidth={1.5} />
                        <p className="text-xs font-bold">Bot</p>
                    </a>
                </div>
            </div>

            {/* FAQ */}
            <div>
                <p className="text-xs uppercase tracking-widest text-center mb-4" style={{ color: BELIS.text2, fontFamily: "'Montserrat', sans-serif", fontWeight: 500 }}>
                    {t("about.faq")}
                </p>
                <div className="space-y-2">
                    {FAQ.map((f, i) => (
                        <details key={i} className="p-4 rounded-2xl group"
                            style={{ background: BELIS.surface, border: `1px solid ${BELIS.borderSoft}` }}>
                            <summary className="cursor-pointer text-sm font-bold flex items-center justify-between list-none"
                                style={{ color: BELIS.text, fontFamily: "'Playfair Display', serif" }}>
                                {f.q}
                                <span className="text-lg group-open:rotate-45 transition" style={{ color: BELIS.gold }}>+</span>
                            </summary>
                            <p className="text-xs mt-2 pt-2 border-t leading-relaxed" style={{ borderColor: BELIS.borderSoft, color: BELIS.text2 }}>
                                {f.a}
                            </p>
                        </details>
                    ))}
                </div>
            </div>
        </div>
    );
}
