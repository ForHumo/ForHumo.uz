"use client";

// Belis /haqida sahifasi — ijara qoidalari, FAQ, aloqa.

import { Send, Instagram, ChevronRight, Shield, CalendarClock, Truck, MapPin, Sparkles, AlertTriangle } from "lucide-react";
import { BELIS, BELIS_SOCIAL, BELIS_GOLD_GRADIENT, BELIS_LOCATION } from "@/lib/belis-theme";
import { BelisLocationMap } from "./belis-location-map";
import { BelisLink } from "./belis-nav";

const FAQ = [
    {
        q: "Belis nima?",
        a: "Belis — Fotiha va Beshik to'y marosimlariga sarpo qutilarini ijaraga beruvchi studiya. Toshkent shahar va viloyatida ishlaymiz.",
    },
    {
        q: "Qanday ijaraga olsam bo'ladi?",
        a: "Katalogdan komplekt tanlang, marosim sanasini kiriting, ma'lumot qoldiring. @sevinch tez orada bog'lanadi, hujjatlar to'liq bo'lgach do'konga borib olib ketasiz yoki Yandex chaqirasiz.",
    },
    {
        q: "Sarpo qachon olib ketiladi va qaytariladi?",
        a: "Marosim kunidan 1 kun oldin olib ketiladi. Marosim tugagach eng ko'pi 3 kun ichida qaytariladi.",
    },
    {
        q: "To'lov qanday qilinadi?",
        a: "Do'konda naqd yoki karta orqali. Ikkita summa to'lanadi: (1) ijara puli, (2) zaklat (pasport garov). Sarpo butun qaytsa zaklat to'liq qaytariladi.",
    },
    {
        q: "Pasport majburiymi?",
        a: "Ha, pasport NUSXASI (rasmi) va shartnoma qoldiriladi. Asl pasport ushlab qolinmaydi — bu qonuniy taqiqlangan.",
    },
    {
        q: "Yandex kim to'laydi?",
        a: "Yandex kuryer haqini mijoz o'zi to'laydi. Belis faqat sarpo ijara pulini oladi. Kuryer mustaqil chaqiriladi.",
    },
    {
        q: "Sarpo buzilib qolsa yoki qaytmasa?",
        a: "Har quti uchun zaklat qoldirilgan. Buzilgan/singan qismning narxi zaklatdan ushlab qolinadi. Qaytmasa to'liq zaklat va shtraf undiriladi.",
    },
    {
        q: "Kechiktirilsa nima bo'ladi?",
        a: "Har kun kechikish uchun ijara pulining 30% shtraf hisoblanadi. 3 kundan ko'p kechiksangiz Belis bilan bog'laning.",
    },
];

const RULES = [
    { icon: <CalendarClock className="w-5 h-5" />, title: "1 kun oldin, 3 kun ichida", text: "Sarpo marosim kunidan 1 kun oldin olib ketiladi va marosim tugagach 3 kun ichida qaytariladi." },
    { icon: <Shield className="w-5 h-5" />, title: "Pasport nusxa + shartnoma", text: "Asl pasport ushlab qolinmaydi. Faqat rasm nusxasi va shartnoma imzo qoldiriladi." },
    { icon: <Truck className="w-5 h-5" />, title: "Yandex mijoz to'lovi", text: "Kuryerni mijoz o'zi chaqiradi va o'zi to'laydi. Ijara summasi bilan qo'shilmaydi." },
    { icon: <AlertTriangle className="w-5 h-5" />, title: "Zaklat va shtraf", text: "Har komplektga zaklat qoldiriladi. Butun qaytsa qaytariladi, buzilsa/kam qaytsa shtraf undiriladi." },
];

export function BelisAbout() {
    return (
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-10">
            {/* Hero */}
            <section className="text-center">
                <p style={{ fontFamily: "'Great Vibes', cursive", fontSize: 64, color: BELIS.gold, lineHeight: 1, margin: "0 0 8px" }}>
                    Belis
                </p>
                <p className="text-lg italic" style={{ color: BELIS.text2, fontFamily: "'Playfair Display', serif" }}>
                    Marosim uchun sarpo qutilari
                </p>
                <p className="text-[14px] mt-4 max-w-md mx-auto leading-relaxed" style={{ color: BELIS.text }}>
                    Belis Toshkent'da Fotiha va Beshik to&apos;y marosimlariga
                    to&apos;liq sarpo qutilarini ijaraga beradi. Bir marta sotib olmay,
                    kerakli kunga oling — arzon va oson.
                </p>
                <BelisLink href="/katalog"
                    className="mt-6 inline-flex items-center gap-2 h-12 px-6 rounded-2xl text-[14px] font-black"
                    style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold }}>
                    Katalogga o&apos;tish <ChevronRight className="w-4 h-4" />
                </BelisLink>
            </section>

            {/* Qanday ishlaydi */}
            <section>
                <h2 className="text-[20px] font-black mb-4" style={{ color: BELIS.text }}>Qanday ishlaydi</h2>
                <div className="space-y-2">
                    {[
                        { n: 1, title: "Ariza bering", text: "Katalogdan komplekt tanlang, marosim sanasini kiriting va ma'lumotni qoldiring." },
                        { n: 2, title: "Tasdiqlash", text: "@sevinch qo'ng'iroq qiladi, aniqlashtiradi va tasdiqlaydi." },
                        { n: 3, title: "Do'konga boring", text: "Marosim kunidan 1 kun oldin do'kondan olib keting yoki Yandex chaqiring." },
                        { n: 4, title: "Marosimda ishlating", text: "Sarpo qutilarini marosim davomida ishlating." },
                        { n: 5, title: "Qaytaring", text: "3 kun ichida butun qaytaring — zaklat qaytariladi." },
                    ].map(s => (
                        <div key={s.n} className="flex items-start gap-3 p-4 rounded-2xl"
                            style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}>
                            <span className="w-9 h-9 rounded-xl grid place-items-center flex-shrink-0 text-[13px] font-black"
                                style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold }}>
                                {s.n}
                            </span>
                            <div>
                                <p className="text-[14px] font-black" style={{ color: BELIS.text }}>{s.title}</p>
                                <p className="text-[12.5px] mt-0.5" style={{ color: BELIS.text2 }}>{s.text}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Muhim qoidalar */}
            <section>
                <h2 className="text-[20px] font-black mb-4" style={{ color: BELIS.text }}>Muhim qoidalar</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {RULES.map((r, i) => (
                        <div key={i} className="p-4 rounded-2xl"
                            style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}>
                            <span className="w-10 h-10 rounded-xl grid place-items-center mb-2"
                                style={{ background: BELIS.goldSoft, color: BELIS.goldDeep }}>
                                {r.icon}
                            </span>
                            <p className="text-[14px] font-black" style={{ color: BELIS.text }}>{r.title}</p>
                            <p className="text-[12.5px] mt-1" style={{ color: BELIS.text2 }}>{r.text}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Manzil */}
            <section>
                <h2 className="text-[20px] font-black mb-4" style={{ color: BELIS.text }}>Manzil</h2>
                <BelisLocationMap />
            </section>

            {/* FAQ */}
            <section>
                <h2 className="text-[20px] font-black mb-4" style={{ color: BELIS.text }}>Tez-tez so&apos;raladigan savollar</h2>
                <div className="space-y-2">
                    {FAQ.map((f, i) => (
                        <details key={i} className="rounded-2xl p-4 group"
                            style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}>
                            <summary className="cursor-pointer list-none flex items-center justify-between gap-3">
                                <span className="text-[14px] font-black" style={{ color: BELIS.text }}>{f.q}</span>
                                <ChevronRight className="w-4 h-4 flex-shrink-0 transition-transform group-open:rotate-90" style={{ color: BELIS.goldDeep }} />
                            </summary>
                            <p className="text-[13px] mt-3 leading-relaxed" style={{ color: BELIS.text2 }}>{f.a}</p>
                        </details>
                    ))}
                </div>
            </section>

            {/* Aloqa */}
            <section>
                <h2 className="text-[20px] font-black mb-4" style={{ color: BELIS.text }}>Aloqa</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <a href={BELIS_SOCIAL.telegramChannel} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-3 p-4 rounded-2xl"
                        style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}>
                        <span className="w-11 h-11 rounded-xl grid place-items-center" style={{ background: "#229ED9", color: "#fff" }}>
                            <Send className="w-5 h-5" />
                        </span>
                        <div>
                            <p className="text-[14px] font-black" style={{ color: BELIS.text }}>Telegram</p>
                            <p className="text-[12px]" style={{ color: BELIS.text2 }}>@Belis_Sarpo</p>
                        </div>
                    </a>
                    <a href={BELIS_SOCIAL.instagram} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-3 p-4 rounded-2xl"
                        style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}>
                        <span className="w-11 h-11 rounded-xl grid place-items-center text-white"
                            style={{ background: "linear-gradient(135deg,#f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)" }}>
                            <Instagram className="w-5 h-5" />
                        </span>
                        <div>
                            <p className="text-[14px] font-black" style={{ color: BELIS.text }}>Instagram</p>
                            <p className="text-[12px]" style={{ color: BELIS.text2 }}>@belis.sarpo</p>
                        </div>
                    </a>
                </div>
            </section>

            {/* Footer info */}
            <section className="text-center text-[11.5px] pt-4" style={{ color: BELIS.text3, borderTop: `1px solid ${BELIS.borderSoft}` }}>
                <p className="flex items-center justify-center gap-1 mb-1">
                    <MapPin className="w-3 h-3" /> Belis · {BELIS_LOCATION.address}
                </p>
                <p className="flex items-center justify-center gap-1">
                    <Sparkles className="w-3 h-3" /> For Humo tarkibida · CEO Sevinch
                </p>
            </section>
        </div>
    );
}
