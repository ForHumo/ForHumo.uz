"use client";

import { NxRow } from "./nx-row";
import { VideoCard, ShortCard, LiveCard, MusicCard, BookCard } from "./nx-cards";
import { useNxPlayer, type NxShort } from "./nx-player-ctx";

// ─────────────────────────────────────────────────────────────────────────────
// NxFeed — barcha content rowlar
// ─────────────────────────────────────────────────────────────────────────────
export function NxFeed() {
    const { openShorts } = useNxPlayer();

    const SHORTS_DATA: NxShort[] = Array.from({ length: 10 }, (_, i) => ({
        image:    `https://picsum.photos/seed/short${i + 30}/400/711`,
        author:   `@creator_${i + 1}`,
        views:    `${(i + 1) * 120}K`,
        likes:    `${(i + 1) * 18}K`,
        duration: `0:${String(15 + i * 5).padStart(2, "0")}`,
    }));

    return (
        <div className="pb-32">

            {/* ── Jonli Efirlar ─────────────────────────────────────── */}
            <NxRow title="Hozir Jonli" accent="linear-gradient(180deg,#EF4444,#F97316)">
                {[
                    { title: "Nexus Launch Event 2026",     author: "Humo Official",  viewers: "18.5K", category: "Tech"     },
                    { title: "Pro Gaming Tournament Final",  author: "eSport UZ",      viewers: "9.2K",  category: "Gaming"   },
                    { title: "Milliy Kuy Festivali",         author: "Madina Ergash",  viewers: "5.8K",  category: "Musiqa"   },
                    { title: "Kod yozish — React Native",   author: "Dev Sardor",     viewers: "3.1K",  category: "Dasturlash"},
                    { title: "Xalqaro Musobaqalar Sharhi",  author: "Sport Media",    viewers: "12K",   category: "Sport"    },
                ].map((s, i) => (
                    <LiveCard key={i}
                        title={s.title}
                        image={`https://picsum.photos/seed/live${i + 10}/800/450`}
                        author={s.author}
                        viewers={s.viewers}
                        category={s.category}
                    />
                ))}
            </NxRow>

            {/* ── G. Videolar ───────────────────────────────────────── */}
            <NxRow title="G. Videolar" onSeeAll={() => {}}>
                {Array.from({ length: 7 }, (_, i) => (
                    <VideoCard key={i}
                        title={[
                            "Nexus Arxitekturasi: Zamonaviy Super-App qanday quriladi",
                            "O'zbekiston 2026 — Texnologiya bo'yicha qayerda turibmiz",
                            "React 19 yangiliklari va amaliy misollar",
                            "Musiqa yaratish: Sifatli audio uchun bepul vositalar",
                            "Kino ssenariy yozish asoslari — To'liq qo'llanma",
                            "Humo ekotizimi — Barcha mahsulotlar bitta joyda",
                            "AI agentlar va kreator iqtisodiyoti kelajagi",
                        ][i]}
                        image={`https://picsum.photos/seed/vid${i + 20}/800/450`}
                        views={`${(i + 1) * 85}K`}
                        duration={`${10 + i * 3}:${String(i * 7 % 60).padStart(2, "0")}`}
                        author={["Nexus Dev", "Tech UZ", "Sardor", "Madina", "Kamol", "Humo", "AI Studio"][i]}
                        avatar={`https://api.dicebear.com/9.x/avataaars/svg?seed=author${i}`}
                    />
                ))}
            </NxRow>

            {/* ── Shorts / Reels ────────────────────────────────────── */}
            <NxRow title="Shorts" accent="linear-gradient(180deg,#8B5CF6,#6366F1)" onSeeAll={() => openShorts(SHORTS_DATA, 0)}>
                {SHORTS_DATA.map((s, i) => (
                    <ShortCard key={i}
                        image={s.image}
                        author={s.author}
                        views={s.views}
                        likes={s.likes}
                        duration={s.duration}
                        onClick={() => openShorts(SHORTS_DATA, i)}
                    />
                ))}
            </NxRow>

            {/* ── Kinolar ───────────────────────────────────────────── */}
            <NxRow title="Kinolar" accent="linear-gradient(180deg,#F59E0B,#EF4444)" onSeeAll={() => {}}>
                {Array.from({ length: 6 }, (_, i) => (
                    <VideoCard key={i}
                        title={[
                            "Abadiyat Soyasida",
                            "Ko'k Osmon Ostida",
                            "Yolg'iz Qadam",
                            "Toshkent Tuni",
                            "Shamol Bilan",
                            "Ikki Dunyo",
                        ][i]}
                        image={`https://picsum.photos/seed/cinema${i + 40}/800/450`}
                        views={`${(i + 1) * 1.2}M`}
                        duration={`2s ${18 + i * 8}d`}
                        author="Humo Cinema"
                        avatar={`https://api.dicebear.com/9.x/avataaars/svg?seed=cinema${i}`}
                    />
                ))}
            </NxRow>

            {/* ── Musiqa ────────────────────────────────────────────── */}
            <NxRow title="Musiqa" accent="linear-gradient(180deg,#10B981,#00CEC8)" onSeeAll={() => {}}>
                {Array.from({ length: 8 }, (_, i) => (
                    <MusicCard key={i}
                        title={["Bahor Ohangi", "Tun Yulduzi", "Sevgi Qo'shig'i", "Uzoq Yo'l", "Yurak Tori", "Osmon Osti", "Erkin Qush", "Yangi Kun"][i]}
                        artist={["Madina", "Sardor", "Kamola", "Bobur", "Dilnoza", "Jasur", "Zulfiya", "Islom"][i]}
                        image={`https://picsum.photos/seed/music${i + 50}/400/400`}
                        duration={`${3 + i % 2}:${String(20 + i * 5 % 40).padStart(2, "0")}`}
                        listens={`${(i + 1) * 450}K`}
                    />
                ))}
            </NxRow>

            {/* ── Kitoblar ──────────────────────────────────────────── */}
            <NxRow title="Kitoblar & Audiokitoblar" accent="linear-gradient(180deg,#F59E0B,#D97706)" onSeeAll={() => {}}>
                {[
                    { title: "Raqamli Ozodlik",       author: "A. Karimov",   rating: "4.8", pages: "6s",   type: "ebook"  as const },
                    { title: "AI va Biznes Kelajagi",  author: "M. Toshmatov", rating: "4.9", pages: "8s",   type: "audio"  as const },
                    { title: "Kreator Iqtisodiyoti",   author: "S. Ergashev",  rating: "4.7", pages: "5s",   type: "ebook"  as const },
                    { title: "O'zbek Texnologiyasi",   author: "B. Qodirov",   rating: "4.6", pages: "7s",   type: "audio"  as const },
                    { title: "Dasturchi Orzusi",       author: "J. Rahimov",   rating: "4.9", pages: "10s",  type: "ebook"  as const },
                    { title: "Muvaffaqiyat Formulasi", author: "D. Xasanova",  rating: "4.5", pages: "4s",   type: "audio"  as const },
                ].map((b, i) => (
                    <BookCard key={i}
                        title={b.title}
                        author={b.author}
                        image={`https://picsum.photos/seed/book${i + 60}/400/600`}
                        rating={b.rating}
                        pages={b.pages}
                        type={b.type}
                    />
                ))}
            </NxRow>

        </div>
    );
}
