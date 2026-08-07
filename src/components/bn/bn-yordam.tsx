"use client";

import { useState } from "react";
import {
    ChevronDown, ShoppingBag, CreditCard, Truck, Store, Shield,
    HelpCircle, MessageCircle, ChevronRight, Search,
} from "lucide-react";
import { BnLink } from "./bn-nav";
import { BnBackButton } from "./bn-back-button";
import { BN } from "@/lib/bn-theme";

interface FAQ { q: string; a: string; }
interface Section { title: string; icon: typeof ShoppingBag; color: string; items: FAQ[]; }

const SECTIONS: Section[] = [
    {
        title: "Buyurtma va xarid",
        icon: ShoppingBag,
        color: "#60a5fa",
        items: [
            {
                q: "Buyurtmani qanday beraman?",
                a: "Mahsulotni tanlaysiz → Savatga qo'shasiz → Savatda 'Buyurtmani rasmiylashtirish' tugmasini bosasiz. Yetkazish yoki olib ketish variantini tanlab, manzil va telefonni kiritasiz, to'lov qilasiz. Buyurtma sotuvchiga tushadi.",
            },
            {
                q: "Buyurtmamni qayerdan ko'raman?",
                a: "'Buyurtmalarim' sahifasida barcha buyurtmalar ro'yxati va holati (qabul kutilmoqda, tayyorlanmoqda, yo'lda, yetkazildi) ko'rinadi. Har bir buyurtmaga bosib tafsilotini ochish mumkin.",
            },
            {
                q: "Bir vaqtning o'zida bir necha do'kondan xarid qila olamanmi?",
                a: "Ha. Savatda turli sotuvchilardan mahsulotlar bo'lishi mumkin — checkoutda ular alohida buyurtmalarga bo'linadi.",
            },
            {
                q: "Buyurtmani bekor qilsam bo'ladimi?",
                a: "Sotuvchi hali qabul qilmagan bo'lsa yoki 'tayyorlanmoqda' holatida — ha, bekor qilinadi va mablag' darhol qaytariladi. Yuborilgandan keyin bekor qilish faqat sotuvchi orqali.",
            },
        ],
    },
    {
        title: "To'lov va xavfsizlik",
        icon: CreditCard,
        color: "#34d399",
        items: [
            {
                q: "Qanday to'lov usullari bor?",
                a: "Payme, Click va bank kartasi (VISA/MasterCard). To'lov shlyuz orqali xavfsiz amalga oshiriladi — biz karta ma'lumotini saqlamaymiz.",
            },
            {
                q: "Mablag' xavfsizmi?",
                a: "Ha. BN eskrow tizimidan foydalanadi — to'lovingiz buyurtma yakunlanguncha platformada ushlab turiladi va faqat siz mahsulotni qabul qilgandan keyin sotuvchiga o'tadi.",
            },
            {
                q: "Naqd to'lash mumkinmi?",
                a: "Ba'zi sotuvchilarda 'olib ketishda naqd' varianti bor. Mahsulot sahifasida bu variant ko'rsatiladi.",
            },
            {
                q: "Chekni qayerdan olaman?",
                a: "Har buyurtma tafsiloti sahifasida elektron chek yuklab olish tugmasi bor. Qog'oz chek sotuvchidan mahsulotni qabul qilishda beriladi.",
            },
        ],
    },
    {
        title: "Yetkazish va olib ketish",
        icon: Truck,
        color: "#fbbf24",
        items: [
            {
                q: "Toshkent bo'yicha qancha vaqtda yetkazasiz?",
                a: "1-3 ish kuni ichida (sotuvchidan va vaqtdan qarab). Ba'zi sotuvchilar shu kunning o'zida yetkazishi mumkin.",
            },
            {
                q: "Viloyatlarga yetkaziladimi?",
                a: "Ha. Yetkazish narxi va muddati sotuvchi elonida ko'rsatiladi. Umuman 3-7 ish kuni.",
            },
            {
                q: "'Ko'rib qabul qilish' nima?",
                a: "Sotuvchi bunday variantni yoqgan bo'lsa — kuryer sizga mahsulotni topshirganda 24 soat davomida uni sinash va yoqmasa qaytarish huquqiga egasiz. Mablag' to'liq qaytariladi.",
            },
            {
                q: "Do'kondan o'zim olib ketsam?",
                a: "Mahsulot sahifasidagi 'Olib ketish' variantini tanlaysiz — do'kon manzili va ish soati beriladi. Manzilga borib buyurtma raqamini ko'rsatasiz.",
            },
        ],
    },
    {
        title: "Sotuvchi bo'lish",
        icon: Store,
        color: "#f472b6",
        items: [
            {
                q: "BN'da qanday sotuvchi bo'laman?",
                a: "'Sotuvchi bo'lish' sahifasidan ariza to'ldirasiz — do'kon nomi, bozor, manzil, telefon. Admin 1-2 ish kunida ko'rib chiqadi. Tasdiqlandan keyin sotuvchi kabinetidan mahsulot joylashingiz mumkin.",
            },
            {
                q: "Sotuvdan qancha komissiya olinadi?",
                a: "Har buyurtmadan platforma komissiyasi ushlanadi. Qolgan mablag' buyurtma COMPLETED bo'lganda hisobingizga o'tkaziladi. Aniq foiz sotuvchi shartnomasida.",
            },
            {
                q: "Mahsulot rasmini AI bilan tavsiflay olamanmi?",
                a: "Ha. Mahsulot qo'shish formasida 'AI bilan yozish' tugmasi bor — rasmni yuklaysiz va Humo AI mahsulot nomi, tavsifi va tegishli xususiyatlarni tavsiya qiladi.",
            },
            {
                q: "Ko'k tasdiq belgisini qanday olaman?",
                a: "Do'koningiz sifat va faollik ko'rsatkichlariga qarab tier'ga o'tadi: NEW → TRUSTED → VERIFIED → PREMIUM. VERIFIED tier'dan boshlab ko'k tasdiq belgisi va yuqori chiqadigan reyting olasiz.",
            },
        ],
    },
    {
        title: "Sifat va shikoyat",
        icon: Shield,
        color: "#a78bfa",
        items: [
            {
                q: "Mahsulot rasmga o'xshamasa?",
                a: "'Ko'rib qabul qilish' yoqilgan bo'lsa — rad etasiz va mablag' qaytariladi. Bo'lmasa, buyurtma tafsilotidan 'Shikoyat' yuborasiz — admin 3 ish kunida hal qiladi.",
            },
            {
                q: "Firibgar sotuvchini qanday xabar beraman?",
                a: "Mahsulot yoki do'kon sahifasidagi uch nuqta menyusidan 'Shikoyat qilish' → sabab tanlaysiz. Admin panel darhol xabar oladi va AI-moderatsiya avtomatik tekshiradi.",
            },
            {
                q: "Sharh qoldirish uchun nima kerak?",
                a: "Faqat buyurtma COMPLETED bo'lgan xaridor sharh qoldira oladi. Bir mahsulot uchun bir marta sharh — o'zgartirish mumkin.",
            },
        ],
    },
];

export function BnYordamPage() {
    const [q, setQ] = useState("");
    const [openIdx, setOpenIdx] = useState<string | null>(null);

    const filter = (item: FAQ) => {
        if (!q.trim()) return true;
        const s = q.toLowerCase();
        return item.q.toLowerCase().includes(s) || item.a.toLowerCase().includes(s);
    };

    return (
        <div className="mx-auto max-w-[860px] px-4 pt-4 pb-16">
            <BnBackButton fallbackHref="/" />

            <nav className="flex items-center gap-1.5 text-[12px] mt-4 mb-3" style={{ color: BN.text3 }}>
                <BnLink href="/" className="hover:opacity-70">Bosh sahifa</BnLink>
                <ChevronRight className="w-3 h-3" />
                <span>Yordam</span>
            </nav>

            <header className="mb-6">
                <div className="flex items-center gap-3 mb-3">
                    <div
                        className="w-11 h-11 rounded-2xl grid place-items-center"
                        style={{ background: "rgba(96,165,250,0.15)", color: "#60a5fa" }}
                    >
                        <HelpCircle className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-[26px] font-black tracking-tight leading-tight">Yordam markazi</h1>
                        <p className="text-[13px]" style={{ color: BN.text3 }}>
                            Tez-tez so'raladigan savollarga javob
                        </p>
                    </div>
                </div>

                {/* Qidiruv */}
                <div
                    className="relative flex items-center rounded-2xl px-4 py-3"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                    <Search className="w-4 h-4 mr-2" style={{ color: BN.text3 }} />
                    <input
                        type="text" value={q} onChange={(e) => setQ(e.target.value)}
                        placeholder="Savolingizni yozing..."
                        className="flex-1 bg-transparent outline-none text-[15px]"
                        style={{ color: "#fff" }}
                    />
                </div>
            </header>

            <div className="space-y-6">
                {SECTIONS.map((sec, si) => {
                    const items = sec.items.filter(filter);
                    if (items.length === 0) return null;
                    const Icon = sec.icon;
                    return (
                        <section key={si}>
                            <div className="flex items-center gap-2 mb-3">
                                <div
                                    className="w-8 h-8 rounded-xl grid place-items-center"
                                    style={{ background: `${sec.color}22`, color: sec.color }}
                                >
                                    <Icon className="w-4 h-4" />
                                </div>
                                <h2 className="text-[18px] font-bold">{sec.title}</h2>
                            </div>
                            <div className="space-y-2">
                                {items.map((it, i) => {
                                    const key = `${si}-${i}`;
                                    const open = openIdx === key;
                                    return (
                                        <button
                                            key={key}
                                            onClick={() => setOpenIdx(open ? null : key)}
                                            className="w-full text-left rounded-2xl transition-colors"
                                            style={{
                                                background: open ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
                                                border: "1px solid rgba(255,255,255,0.06)",
                                            }}
                                        >
                                            <div className="flex items-start justify-between gap-3 px-4 py-3">
                                                <span className="text-[15px] font-semibold flex-1">{it.q}</span>
                                                <ChevronDown
                                                    className="w-4 h-4 flex-shrink-0 transition-transform mt-1"
                                                    style={{
                                                        color: BN.text3,
                                                        transform: open ? "rotate(180deg)" : "rotate(0)",
                                                    }}
                                                />
                                            </div>
                                            {open && (
                                                <div
                                                    className="px-4 pb-4 text-[14px] leading-[1.7]"
                                                    style={{ color: "rgba(255,255,255,0.75)" }}
                                                >
                                                    {it.a}
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </section>
                    );
                })}

                {SECTIONS.every(s => s.items.filter(filter).length === 0) && (
                    <div className="text-center py-16" style={{ color: BN.text3 }}>
                        <HelpCircle className="w-12 h-12 mx-auto mb-3 opacity-40" />
                        <p className="text-[15px]">Bu so'rov bo'yicha topilmadi</p>
                    </div>
                )}
            </div>

            {/* Aloqa bloki */}
            <div
                className="mt-10 rounded-3xl p-5 flex items-center gap-4"
                style={{ background: "linear-gradient(135deg, rgba(96,165,250,0.12), rgba(167,139,250,0.12))" }}
            >
                <div
                    className="w-12 h-12 rounded-2xl grid place-items-center flex-shrink-0"
                    style={{ background: "rgba(96,165,250,0.2)", color: "#60a5fa" }}
                >
                    <MessageCircle className="w-5 h-5" />
                </div>
                <div className="flex-1">
                    <div className="text-[15px] font-bold mb-0.5">Javob topmadingizmi?</div>
                    <div className="text-[13px]" style={{ color: BN.text3 }}>
                        Bizga yozing — Telegram orqali javob beramiz
                    </div>
                </div>
                <a
                    href="https://t.me/forhumo"
                    target="_blank" rel="noopener noreferrer"
                    className="rounded-2xl px-4 py-2 text-[13px] font-semibold"
                    style={{ background: "#60a5fa", color: "#000" }}
                >
                    Yozing
                </a>
            </div>
        </div>
    );
}
