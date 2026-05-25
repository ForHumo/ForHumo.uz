"use client";

import { useState } from "react";
import { X, BookOpen, Clock, Heart, Bookmark, Share2, AlignLeft, AlignJustify, ChevronLeft, Star } from "lucide-react";
import { useNxPlayer } from "./nx-player-ctx";

// ─────────────────────────────────────────────────────────────────────────────
// Mock articles
// ─────────────────────────────────────────────────────────────────────────────
interface Article {
    id: string;
    title: string;
    author: string;
    avatar: string;
    category: string;
    readTime: number;
    date: string;
    image: string;
    excerpt: string;
    body: string[];
    likes: number;
    views: string;
    featured: boolean;
}

const ARTICLES: Article[] = [
    {
        id: "a1",
        title: "O'zbekistonda texnologiya startaplari: imkoniyatlar va to'siqlar",
        author: "Rustam Nazarov", avatar: "https://picsum.photos/seed/ra1/60/60",
        category: "Texnologiya", readTime: 6, date: "2025-05-22",
        image: "https://picsum.photos/seed/ri1/600/300",
        excerpt: "O'zbekiston startap ekotizimi so'nggi yillarda misli ko'rilmagan sur'atda rivojlanmoqda...",
        body: [
            "O'zbekiston startap ekotizimi so'nggi yillarda misli ko'rilmagan sur'atda rivojlanmoqda. 2020-yildan beri mamlakatda 200 dan ortiq texnologiya startapi ro'yxatdan o'tdi va ularning umumiy baholash qiymati 500 million dollardan oshdi.",
            "Asosiy imkoniyatlar qatorida katta aholi (35 million), o'sib borayotgan mobil internet penetratsiyasi (70% dan oshdi) va hukumatning raqamli iqtisodiyotni rivojlantirishga yo'naltirilgan siyosatini ko'rsatish mumkin.",
            "Biroq qiyinchiliklar ham mavjud. Malakali kadrlar yetishmasligi, rivojlanmagan venchur kapital ekotizimi va tartibga solish to'siqlari asosiy muammolar sifatida belgilanmoqda.",
            "IT Park O'zbekiston 2019-yilda tashkil etilgandan buyon 500 dan ortiq kompaniyaga preferensial soliq rejimi, subsidiyalangan ish joylari va mentorlik dasturlarini taqdim etdi.",
            "Muvaffaqiyatli misollar ko'p: Uzum Bank, Korzinka, Click va Payme kabi kompaniyalar millionlab foydalanuvchilarga xizmat ko'rsatib, bozorda mustahkam o'rin egalladi.",
            "Ekspertlarning fikricha, O'zbekiston 2030-yilga kelib Markaziy Osiyodagi yetakchi texnologiya markaziga aylanish salohiyatiga ega. Buning uchun ta'lim tizimini zamonaviylashtirish, xalqaro hamkorlikni kuchaytirish va mahalliy investorlar bazasini shakllantirish zarur.",
        ],
        likes: 2340, views: "18.4K", featured: true,
    },
    {
        id: "a2",
        title: "Sun'iy intellekt musiqaga qanday ta'sir qilmoqda",
        author: "Dilnoza Yusupova", avatar: "https://picsum.photos/seed/ra2/60/60",
        category: "Musiqa", readTime: 4, date: "2025-05-20",
        image: "https://picsum.photos/seed/ri2/600/300",
        excerpt: "GPT va boshqa AI tizimlari musiqa yaratish jarayonini tubdan o'zgartirmoqda...",
        body: [
            "Sun'iy intellekt texnologiyalari musiqa sanoatida inqilob qilmoqda. Suno, Udio va Musicgen kabi vositalar endi professional sifatli treklarni soniyalar ichida yarata oladi.",
            "Bu holat professional musiqachilarda qanday his-tuyg'u uyg'otmoqda? Ko'pchilik xavotirda, biroq tajribali mutaxassislar buni yangi imkoniyat sifatida ko'rmoqda.",
            "AI yordamida bir inson butun orkestr tovushini simulyatsiya qilishi, o'zi sevgan janrda yangi asarlar yaratishi va hatto o'tgan asrning bastakorlarining uslubida kompozitsiya tayyorlashi mumkin.",
            "O'zbekiston musiqachilari ham bu tendentsiyani sezmoqda. Bir necha yosh sozanda va qo'shiqchilar AI vositalaridan foydalanib, original asarlar yaratganini aytishdi.",
            "Mualliflik huquqi masalasi esa hali ochiq qolib kelmoqda. Kim AI tomonidan yaratilgan musiqani himoya qilishi mumkin — AI tizimi yaratuvchisimi, uni ishlatgan inson yo hech kimmi?",
        ],
        likes: 1890, views: "12.1K", featured: false,
    },
    {
        id: "a3",
        title: "Yaratuvchilar iqtisodiyoti: raqamli daromad manbalariga to'liq qo'llanma",
        author: "IT Academy UZ", avatar: "https://picsum.photos/seed/ra3/60/60",
        category: "Biznes", readTime: 8, date: "2025-05-18",
        image: "https://picsum.photos/seed/ri3/600/300",
        excerpt: "Content creator bo'lib qanday qilib barqaror daromad topish mumkin...",
        body: [
            "Yaratuvchilar iqtisodiyoti global ko'lamdagi katta kuchga aylandi. 2024-yil hisobotlariga ko'ra, dunyo bo'ylab 200 milliondan ortiq odam professional content creator sifatida faoliyat yuritadi.",
            "Asosiy daromad manbalari: reklama (AdSense, sponsorlik), obuna to'lovlari (Patreon analoglar), to'lovli kurslar va materiallar, live streaming sovg'alari, merchandise va brendlangan mahsulotlar.",
            "O'zbek yaratuvchilari uchun asosiy qiyinchilik — mahalliy to'lov tizimlari va xalqaro platformalarga kirish cheklanganligi. Biroq Click, Payme va Uzum kabi mahalliy yechimlar bu muammoni hal qilishga yordam bermoqda.",
            "Muvaffaqiyatli o'zbek yaratuvchilari tajribasidan: auditoriya bilan to'g'ri muloqot o'rnatish, kontentni izchil chiqarish va niche mavzuda ixtisoslashuv muhim omillar hisoblanadi.",
            "Humo Nexus platformasi yaratuvchilarga barcha daromad manbalarini bitta joyda birlashtirish imkonini beradi: to'lovli obunalar, virtual sovg'alar, Super Chat, kurs sotish va do'kon.",
        ],
        likes: 3120, views: "25.7K", featured: true,
    },
];

// ─────────────────────────────────────────────────────────────────────────────
// NxReader
// ─────────────────────────────────────────────────────────────────────────────
export function NxReader() {
    const { readerOpen, setReaderOpen, openShareSheet } = useNxPlayer();
    const [reading, setReading] = useState<Article | null>(null);
    const [fontSize, setFontSize] = useState<"sm" | "base" | "lg">("base");
    const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
    const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

    const toggleLike = (id: string) => {
        setLikedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    };
    const toggleSave = (id: string) => {
        setSavedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    };

    const fontSizeMap = { sm: "text-sm", base: "text-base", lg: "text-lg" };

    if (!readerOpen) return null;

    // Full article reading view
    if (reading) {
        return (
            <div className="fixed inset-0 z-[62] flex flex-col overflow-hidden"
                style={{ background: "rgba(6,10,24,0.99)" }}>
                {/* Reading header */}
                <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
                    style={{ borderBottom: "1px solid rgba(43,62,232,0.15)" }}>
                    <button onClick={() => setReading(null)}
                        className="w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0"
                        style={{ background: "rgba(43,62,232,0.12)" }}>
                        <ChevronLeft className="w-4 h-4 text-white" />
                    </button>
                    <p className="text-xs font-bold text-white flex-1 truncate">{reading.category}</p>
                    {/* Font size controls */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                        {(["sm", "base", "lg"] as const).map(size => (
                            <button key={size} onClick={() => setFontSize(size)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-xs font-black transition-all"
                                style={fontSize === size ? {
                                    background: "rgba(43,62,232,0.30)",
                                    color: "white",
                                } : {
                                    color: "rgba(140,160,210,0.50)",
                                }}>
                                {size === "sm" ? "A" : size === "base" ? "A" : "A"}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Article content */}
                <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                    <img src={reading.image} alt={reading.title} className="w-full object-cover" style={{ maxHeight: 220 }} />
                    <div className="px-5 py-5">
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full mb-3 inline-block"
                            style={{ background: "rgba(43,62,232,0.20)", color: "#2B3EE8" }}>
                            {reading.category}
                        </span>
                        <h1 className="text-xl font-black text-white leading-tight mb-4">{reading.title}</h1>

                        {/* Author row */}
                        <div className="flex items-center gap-3 mb-6 pb-4"
                            style={{ borderBottom: "1px solid rgba(43,62,232,0.15)" }}>
                            <img src={reading.avatar} alt={reading.author}
                                className="w-9 h-9 rounded-xl object-cover" />
                            <div className="flex-1">
                                <p className="text-xs font-bold text-white">{reading.author}</p>
                                <div className="flex items-center gap-2 text-[9px]" style={{ color: "rgba(80,100,150,0.70)" }}>
                                    <Clock className="w-2.5 h-2.5" />
                                    <span>{reading.readTime} daqiqa</span>
                                    <span>·</span>
                                    <span>{reading.date}</span>
                                    <span>·</span>
                                    <span>{reading.views} ko'rish</span>
                                </div>
                            </div>
                        </div>

                        {/* Body */}
                        <div className={`flex flex-col gap-5 ${fontSizeMap[fontSize]} leading-relaxed`}
                            style={{ color: "rgba(200,215,240,0.90)" }}>
                            {reading.body.map((para, i) => (
                                <p key={i}>{para}</p>
                            ))}
                        </div>

                        {/* Article actions */}
                        <div className="flex items-center gap-4 mt-8 pt-4"
                            style={{ borderTop: "1px solid rgba(43,62,232,0.15)" }}>
                            <button onClick={() => toggleLike(reading.id)}
                                className="flex items-center gap-1.5 text-sm font-bold">
                                <Heart className={`w-5 h-5 ${likedIds.has(reading.id) ? "fill-red-500" : ""}`}
                                    style={{ color: likedIds.has(reading.id) ? "#EF4444" : "rgba(140,160,210,0.60)" }} />
                                <span style={{ color: likedIds.has(reading.id) ? "#EF4444" : "rgba(140,160,210,0.70)" }}>
                                    {reading.likes + (likedIds.has(reading.id) ? 1 : 0)}
                                </span>
                            </button>
                            <button onClick={() => toggleSave(reading.id)} className="flex items-center gap-1.5">
                                <Bookmark className={`w-5 h-5 ${savedIds.has(reading.id) ? "fill-blue-500" : ""}`}
                                    style={{ color: savedIds.has(reading.id) ? "#2B3EE8" : "rgba(140,160,210,0.60)" }} />
                            </button>
                            <button onClick={() => openShareSheet(reading.title)} className="flex items-center gap-1.5 ml-auto">
                                <Share2 className="w-5 h-5" style={{ color: "rgba(140,160,210,0.60)" }} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="fixed inset-0 z-[55]"
                style={{ background: "rgba(5,8,24,0.80)", backdropFilter: "blur(8px)" }}
                onClick={() => setReaderOpen(false)} />

            <div
                className="fixed inset-x-0 bottom-0 z-[55] flex flex-col rounded-t-3xl overflow-hidden md:inset-x-auto md:inset-y-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[500px] md:max-h-[90vh] md:rounded-3xl"
                style={{
                    background: "rgba(8,12,32,0.98)",
                    border: "1px solid rgba(43,62,232,0.22)",
                    boxShadow: "0 32px 80px rgba(0,0,0,0.70)",
                    maxHeight: "92vh",
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                            style={{ background: "linear-gradient(135deg,#0EA5E9,#2B3EE8)" }}>
                            <BookOpen className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-white">Maqolalar</h2>
                            <p className="text-[9px]" style={{ color: "rgba(80,100,150,0.80)" }}>
                                Yaratuvchilarning uzoq shakldagi kontenti
                            </p>
                        </div>
                    </div>
                    <button onClick={() => setReaderOpen(false)}
                        className="w-8 h-8 flex items-center justify-center rounded-full"
                        style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 pb-6" style={{ scrollbarWidth: "none" }}>
                    {/* Featured article */}
                    {ARTICLES.filter(a => a.featured).slice(0, 1).map(article => (
                        <button key={article.id} onClick={() => setReading(article)}
                            className="w-full mb-4 rounded-2xl overflow-hidden text-left"
                            style={{ background: "rgba(11,18,40,0.70)", border: "1px solid rgba(43,62,232,0.20)" }}>
                            <div className="relative">
                                <img src={article.image} alt={article.title}
                                    className="w-full object-cover" style={{ height: 180 }} />
                                <div className="absolute inset-0"
                                    style={{ background: "linear-gradient(to top, rgba(8,12,32,0.95) 0%, transparent 60%)" }} />
                                <div className="absolute bottom-0 left-0 p-4">
                                    <span className="text-[8px] font-black px-2 py-0.5 rounded-full mb-2 inline-block"
                                        style={{ background: "linear-gradient(135deg,#2B3EE8,#8B5CF6)", color: "white" }}>
                                        {article.category}
                                    </span>
                                    <h3 className="text-sm font-black text-white leading-snug">{article.title}</h3>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 px-3 py-2.5">
                                <img src={article.avatar} alt={article.author}
                                    className="w-7 h-7 rounded-lg object-cover" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-bold text-white">{article.author}</p>
                                </div>
                                <div className="flex items-center gap-1 text-[9px]" style={{ color: "rgba(80,100,150,0.70)" }}>
                                    <Clock className="w-2.5 h-2.5" />
                                    <span>{article.readTime} daqiqa</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Heart className={`w-3.5 h-3.5 ${likedIds.has(article.id) ? "fill-red-500" : ""}`}
                                        style={{ color: likedIds.has(article.id) ? "#EF4444" : "rgba(140,160,210,0.50)" }} />
                                    <span className="text-[9px]" style={{ color: "rgba(80,100,150,0.60)" }}>
                                        {article.likes + (likedIds.has(article.id) ? 1 : 0)}
                                    </span>
                                </div>
                            </div>
                        </button>
                    ))}

                    {/* All articles */}
                    <p className="text-xs font-black text-white mb-3">Barcha maqolalar</p>
                    <div className="flex flex-col gap-3">
                        {ARTICLES.map(article => (
                            <button key={article.id} onClick={() => setReading(article)}
                                className="flex gap-3 p-3 rounded-2xl text-left transition-all duration-150"
                                style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.14)" }}>
                                <img src={article.image} alt={article.title}
                                    className="w-20 h-16 rounded-xl object-cover flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md"
                                        style={{ background: "rgba(43,62,232,0.15)", color: "#2B3EE8" }}>
                                        {article.category}
                                    </span>
                                    <h4 className="text-xs font-bold text-white mt-1 leading-snug line-clamp-2">{article.title}</h4>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span className="text-[9px]" style={{ color: "rgba(80,100,150,0.70)" }}>{article.author}</span>
                                        <span style={{ color: "rgba(80,100,150,0.40)" }}>·</span>
                                        <Clock className="w-2.5 h-2.5" style={{ color: "rgba(80,100,150,0.50)" }} />
                                        <span className="text-[9px]" style={{ color: "rgba(80,100,150,0.60)" }}>{article.readTime} daqiqa</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end justify-between flex-shrink-0">
                                    <button onClick={e => { e.stopPropagation(); toggleSave(article.id); }}>
                                        <Bookmark className={`w-4 h-4 ${savedIds.has(article.id) ? "fill-blue-500" : ""}`}
                                            style={{ color: savedIds.has(article.id) ? "#2B3EE8" : "rgba(140,160,210,0.40)" }} />
                                    </button>
                                    <span className="text-[8px]" style={{ color: "rgba(80,100,150,0.50)" }}>{article.views}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
