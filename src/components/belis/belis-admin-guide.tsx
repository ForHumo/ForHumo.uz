"use client";

// Belis admin qo'llanma — @sevinch uchun bosqichma-bosqich yordamchi.
// belis.uz/admin/qollanma sahifasida ko'rinadi.
// Screenshot yo'q — matn + ikonlar + link tugmalari bilan.

import {
    ShieldCheck, ChevronRight, Package, Calendar, Settings, MessageCircle,
    CheckCircle2, ClipboardList, AlertTriangle, Phone, RotateCw, Sparkles,
} from "lucide-react";
import { BELIS, BELIS_GOLD_GRADIENT } from "@/lib/belis-theme";
import { BelisLink } from "./belis-nav";

interface Section {
    n: number;
    icon: React.ReactNode;
    title: string;
    body: string;
    steps?: string[];
    tip?: string;
    link?: { href: string; label: string };
}

const SECTIONS: Section[] = [
    {
        n: 1,
        icon: <Sparkles className="w-4 h-4" />,
        title: "Xush kelibsiz, @sevinch",
        body: "Belis admin panelida siz mustaqil ravishda katalog to'ldirasiz, mijozlar bilan bog'lanasiz va bookinglarni boshqarasiz. Bu qo'llanmani doim ochib qo'yishingiz mumkin — chalkash joyda darhol qarab olasiz.",
    },
    {
        n: 2,
        icon: <Settings className="w-4 h-4" />,
        title: "Katalog to'ldirish (eng birinchi ish)",
        body: "42 quti bor lekin katalog rasm/tavsifsiz bo'sh. Katalog boshqaruv sahifasida har komplekt va qutini tahrirlaysiz.",
        steps: [
            "\"Katalog\" tugmasini bosing (admin panel yuqorisida)",
            "Fotiha komplektni bosing (allaqachon 1 komplekt seed qilingan)",
            "Rasmni almashtiring: karta bosing → yangi rasm yuklang",
            "Nom/tavsif/narxni real qiymatga o'zgartiring",
            "Har quti kartochkasini bosib alohida tahrirlang (14 dona)",
            "Yangi komplekt (masalan Beshik To'y) qo'shish uchun \"Yangi komplekt\" tugmasi",
        ],
        tip: "Har quti rasmi kvadrat (1:1) bo'lishi tavsiya etiladi. Oq yoki neytral fon eng zo'r.",
        link: { href: "/belis/admin/katalog", label: "Katalog boshqaruvi" },
    },
    {
        n: 3,
        icon: <ClipboardList className="w-4 h-4" />,
        title: "Yangi ariza kelganda",
        body: "Mijoz belis.uz'da booking bergach, siz push xabarnoma olasiz va admin panelning \"Yangi\" tabida ko'rinadi.",
        steps: [
            "Push xabarnoma keladi (\"Yangi Belis arizasi\") — bosing",
            "Mijoz ma'lumotini o'qing: ism, telefon, komplekt, marosim sanasi",
            "Telefon ikonasini bosib qo'ng'iroq qiling — aniqlashtiring",
            "Ariza haqiqiy bo'lsa \"Tasdiqlash\" tugmasi (yashil)",
            "Chalkash bo'lsa mijoz bilan chat ochib yozishing mumkin",
        ],
        tip: "Push kelmasa admin panelda \"Yangi\" tabini qo'lda tekshirib turing.",
        link: { href: "/belis/admin", label: "Adminga o'tish" },
    },
    {
        n: 4,
        icon: <Package className="w-4 h-4" />,
        title: "Mijoz kelib olib ketganda",
        body: "Pickup kunida (marosimdan 1 kun oldin) mijoz Belis do'koniga keladi.",
        steps: [
            "Ariza \"Tasdiqlangan\" tabida bo'lsin",
            "Mijoz do'konga kelganda pasportini so'rang, RASMINI oling (asl pasport MIJOZDA qoladi)",
            "To'lovni oling: ijara puli + zaklat",
            "Sarpo qutilarini komplektga tekshirib bering",
            "\"Olib ketildi\" tugmasini bosing — status yangilanadi",
        ],
        tip: "Pasport asl variantini ushlab qolish qonuniy taqiqlangan. Faqat rasmini oling.",
    },
    {
        n: 5,
        icon: <RotateCw className="w-4 h-4" />,
        title: "Sarpo qaytganda",
        body: "Marosim tugagach 3 kun ichida mijoz sarponi qaytaradi.",
        steps: [
            "Mijoz kelganda barcha qutilarni tekshirib chiqing",
            "Admin panelda \"Olib ketildi\" tabida shu bookingni toping",
            "\"Qaytdi\" tugmasini bosing",
            "Butun qaytgan bo'lsa — \"Butun qaytdi\" tanlang, zaklat to'liq qaytariladi",
            "Buzilgan/kam bo'lsa — \"Zarar/kam\" tanlang, zarar tavsifini yozing, shtraf summa",
            "\"Yozib qo'yish\" — status yangilanadi",
        ],
        tip: "Kechikkan bo'lsa cron avtomatik LATE ga o'tkazadi va mijozga eslatma yuboradi.",
    },
    {
        n: 6,
        icon: <MessageCircle className="w-4 h-4" />,
        title: "Mijoz bilan yozishuv",
        body: "Har booking ichida chat oynasi bor. Mijozga birdaniga savol berish yoki eslatma yuborish uchun.",
        steps: [
            "Admin karta'da \"Chat\" tugmasi",
            "Xabar yozing yoki rasm yuklang",
            "Mijoz Belis'ga kirsa xabaringizni ko'radi va push oladi",
            "Yangi javob kelsa \"Chat\" tugmasida qizil son ko'rinadi",
        ],
    },
    {
        n: 7,
        icon: <Calendar className="w-4 h-4" />,
        title: "Kalendar — kelasi hafta rejasi",
        body: "Har kunda nechta booking borligini bir qarashda ko'rish uchun kalendar.",
        steps: [
            "Admin panelda \"Kalendar\" tugmasi",
            "Har kunda rangli nuqtalar — status ko'rsatadi",
            "Kun bosilsa o'sha kunning barcha bookinglari chiqadi",
            "Oldingi/keyingi oyga o'tish oson",
        ],
        tip: "Kelasi hafta rejasi bo'yicha oldindan sarpo tayyorlash uchun ideal.",
        link: { href: "/belis/admin/kalendar", label: "Kalendarga o'tish" },
    },
    {
        n: 8,
        icon: <AlertTriangle className="w-4 h-4" />,
        title: "Muammo bo'lsa (yordam)",
        body: "Har qanday texnik muammo yoki savolda foundera (@abduvoris) yozing. Texnik: Telegram yoki WhatsApp'dan.",
        steps: [
            "Belis kodda muammo: @abduvoris yozing",
            "Mijoz nizoli holat: iloji boricha chatda yozishing, kerak bo'lsa foundera",
            "Push kelmayapti: brauzer sozlamasini tekshiring, PWA o'rnating",
        ],
    },
];

export function BelisAdminGuide() {
    return (
        <div className="max-w-3xl mx-auto px-4 py-6">
            {/* Header */}
            <div className="rounded-3xl p-6 mb-6"
                style={{ background: BELIS_GOLD_GRADIENT }}>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-3"
                    style={{ background: "rgba(58,53,32,0.15)", color: BELIS.onGold }}>
                    <ShieldCheck className="w-3 h-3" /> Admin qo'llanma
                </span>
                <h1 className="text-[24px] sm:text-[28px] font-black leading-tight" style={{ color: BELIS.onGold }}>
                    Belis'ni qanday boshqarish
                </h1>
                <p className="text-[13px] mt-2 opacity-90" style={{ color: BELIS.onGold }}>
                    8 bo&apos;lim · 5 daqiqada o&apos;qib chiqiladi
                </p>
            </div>

            {/* Sections */}
            <div className="space-y-3">
                {SECTIONS.map(s => (
                    <div key={s.n} className="rounded-2xl p-5"
                        style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}>
                        <div className="flex items-start gap-3 mb-3">
                            <span className="w-10 h-10 rounded-xl grid place-items-center flex-shrink-0"
                                style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold }}>
                                {s.icon}
                            </span>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10.5px] font-black uppercase tracking-widest" style={{ color: BELIS.text3 }}>
                                    Bo&apos;lim {s.n}
                                </p>
                                <h2 className="text-[16px] font-black" style={{ color: BELIS.text }}>{s.title}</h2>
                            </div>
                        </div>

                        <p className="text-[13.5px] leading-relaxed mb-3" style={{ color: BELIS.text2 }}>{s.body}</p>

                        {s.steps && (
                            <ol className="space-y-2 mb-3">
                                {s.steps.map((step, i) => (
                                    <li key={i} className="flex items-start gap-2 text-[13px]">
                                        <span className="w-5 h-5 rounded-full grid place-items-center text-[10px] font-black flex-shrink-0 mt-0.5"
                                            style={{ background: BELIS.goldSoft, color: BELIS.goldDeep }}>
                                            {i + 1}
                                        </span>
                                        <span style={{ color: BELIS.text }}>{step}</span>
                                    </li>
                                ))}
                            </ol>
                        )}

                        {s.tip && (
                            <div className="p-2.5 rounded-lg text-[12.5px] flex items-start gap-2"
                                style={{ background: BELIS.goldSoft, color: BELIS.onGold }}>
                                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                <span><b>Tavsiya:</b> {s.tip}</span>
                            </div>
                        )}

                        {s.link && (
                            <BelisLink href={s.link.href}
                                className="mt-3 inline-flex items-center gap-1.5 h-10 px-4 rounded-xl text-[13px] font-black"
                                style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold }}>
                                {s.link.label} <ChevronRight className="w-4 h-4" />
                            </BelisLink>
                        )}
                    </div>
                ))}
            </div>

            {/* Contact */}
            <div className="mt-6 p-5 rounded-2xl text-center"
                style={{ background: BELIS.surface, border: `1px solid ${BELIS.borderSoft}` }}>
                <p className="text-[13px]" style={{ color: BELIS.text2 }}>
                    Savol bo&apos;lsa <b>@abduvoris</b> (For Humo CEO) bilan bog&apos;laning.
                </p>
                <div className="mt-2 flex items-center gap-2 justify-center">
                    <a href="tel:+998947677650"
                        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[12px] font-black"
                        style={{ background: BELIS.goldSoft, color: BELIS.onGold }}>
                        <Phone className="w-3.5 h-3.5" /> +998 94 767 76 50
                    </a>
                </div>
            </div>
        </div>
    );
}
