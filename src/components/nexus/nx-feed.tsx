"use client";

import { Mic2, Eye, Heart, BadgeCheck } from "lucide-react";
import { NxRow } from "./nx-row";
import { VideoCard, ShortCard, LiveCard, MusicCard, BookCard } from "./nx-cards";
import { useNxPlayer, type NxShort, type NxTrack, type NxVideo } from "./nx-player-ctx";


// ─────────────────────────────────────────────────────────────────────────────
// Demo audio URL lari — SoundHelix (bepul, ochiq lisenziya)
// ─────────────────────────────────────────────────────────────────────────────
const AUDIO_SRCS = Array.from({ length: 8 }, (_, i) =>
    `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${i + 1}.mp3`
);

// Demo video URL lari — Google public test bucket
const SHORTS_VIDEO_SRCS = [
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4",
];

// ─────────────────────────────────────────────────────────────────────────────
// NxFeed — barcha content rowlar
// ─────────────────────────────────────────────────────────────────────────────
export function NxFeed() {
    const { openShorts, playQueue, setExploreOpen, setReaderOpen, setPodcastsOpen, setSuggestionsOpen } = useNxPlayer();

    const SHORTS_DATA: NxShort[] = Array.from({ length: 10 }, (_, i) => ({
        image:    `https://picsum.photos/seed/short${i + 30}/400/711`,
        author:   `@creator_${i + 1}`,
        views:    `${(i + 1) * 120}K`,
        likes:    `${(i + 1) * 18}K`,
        duration: `0:${String(15 + i * 5).padStart(2, "0")}`,
        videoSrc: SHORTS_VIDEO_SRCS[i % SHORTS_VIDEO_SRCS.length],
    }));

    const MUSIC_TRACKS: NxTrack[] = [
        "Bahor Ohangi", "Tun Yulduzi", "Sevgi Qo'shig'i", "Uzoq Yo'l",
        "Yurak Tori", "Osmon Osti", "Erkin Qush", "Yangi Kun",
    ].map((title, i) => ({
        title,
        artist: ["Madina", "Sardor", "Kamola", "Bobur", "Dilnoza", "Jasur", "Zulfiya", "Islom"][i],
        image:  `https://picsum.photos/seed/music${i + 50}/400/400`,
        duration: `${3 + i % 2}:${String(20 + i * 5 % 40).padStart(2, "0")}`,
        durationSec: (3 + i % 2) * 60 + (20 + i * 5 % 40),
        src: AUDIO_SRCS[i % AUDIO_SRCS.length],
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
            <NxRow title="G. Videolar" onSeeAll={() => setExploreOpen(true)}>
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
            <NxRow title="Kinolar" accent="linear-gradient(180deg,#F59E0B,#EF4444)" onSeeAll={() => setExploreOpen(true)}>
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
            <NxRow title="Musiqa" accent="linear-gradient(180deg,#10B981,#00CEC8)" onSeeAll={() => playQueue(MUSIC_TRACKS, 0)}>
                {MUSIC_TRACKS.map((track, i) => (
                    <MusicCard key={i}
                        title={track.title}
                        artist={track.artist}
                        image={track.image}
                        duration={track.duration}
                        listens={`${(i + 1) * 450}K`}
                        track={track}
                        allTracks={MUSIC_TRACKS}
                        trackIndex={i}
                    />
                ))}
            </NxRow>

            {/* ── Kitoblar ──────────────────────────────────────────── */}
            <NxRow title="Kitoblar & Audiokitoblar" accent="linear-gradient(180deg,#F59E0B,#D97706)" onSeeAll={() => setReaderOpen(true)}>
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

            {/* ── Podkastlar ────────────────────────────────────────── */}
            <NxRow title="Podkastlar" accent="linear-gradient(180deg,#F59E0B,#D97706)" onSeeAll={() => setPodcastsOpen(true)}>
                {[
                    { title: "Startup UZ",          host: "Bobur Alimov",    ep: "82-epizod",  dur: "1s 24d", listens: "48K",  image: "pod1"  },
                    { title: "AI va Texnologiya",   host: "Sardor Dev",      ep: "55-epizod",  dur: "58d",    listens: "31K",  image: "pod2"  },
                    { title: "Kitob Tavsiyalari",   host: "Dilnoza Yusup",   ep: "120-epizod", dur: "42d",    listens: "22K",  image: "pod3"  },
                    { title: "Sog'liq Siri",        host: "Dr. Karimov",     ep: "38-epizod",  dur: "1s 05d", listens: "67K",  image: "pod4"  },
                    { title: "Marketing Secrets",   host: "Kamola F.",       ep: "17-epizod",  dur: "34d",    listens: "15K",  image: "pod5"  },
                    { title: "Pul va Investitsiya", host: "Jasur N.",        ep: "29-epizod",  dur: "1s 12d", listens: "39K",  image: "pod6"  },
                ].map((p, i) => {
                    const vid: NxVideo = {
                        title: p.title, author: p.host,
                        avatar: `https://api.dicebear.com/9.x/avataaars/svg?seed=${p.host}`,
                        image: `https://picsum.photos/seed/${p.image}/400/400`,
                        views: p.listens, duration: p.dur,
                    };
                    return (
                        <PodcastCard key={i} title={p.title} host={p.host} ep={p.ep} dur={p.dur} listens={p.listens}
                            image={`https://picsum.photos/seed/${p.image}/400/400`} video={vid} />
                    );
                })}
            </NxRow>

            {/* ── Tavsiya etilgan kreatorlar ─────────────────────────── */}
            <NxRow title="Top Kreatorlar" accent="linear-gradient(180deg,#00CEC8,#2B3EE8)" onSeeAll={() => setSuggestionsOpen(true)}>
                {[
                    { name: "Humo Official",  handle: "@humo",         subs: "845K", cat: "Tech",   verified: true  },
                    { name: "Madina Ergash",  handle: "@madina_music",  subs: "420K", cat: "Musiqa", verified: true  },
                    { name: "Sardor Dev",     handle: "@sardor_dev",    subs: "230K", cat: "Ta'lim", verified: false },
                    { name: "Tech UZ",        handle: "@tech_uz",       subs: "180K", cat: "Tech",   verified: true  },
                    { name: "Sport Live",     handle: "@sport_live_uz", subs: "560K", cat: "Sport",  verified: true  },
                    { name: "Film Lab",       handle: "@filmlab",       subs: "95K",  cat: "Kino",   verified: false },
                    { name: "AI Hub UZ",      handle: "@ai_hub_uz",     subs: "78K",  cat: "AI",     verified: false },
                ].map((c, i) => (
                    <CreatorCard key={i} name={c.name} handle={c.handle} subs={c.subs} cat={c.cat} verified={c.verified} seed={c.handle.replace("@", "")} />
                ))}
            </NxRow>

        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// PodcastCard
// ─────────────────────────────────────────────────────────────────────────────
function PodcastCard({ title, host, ep, dur, listens, image, video }: {
    title: string; host: string; ep: string; dur: string; listens: string; image: string; video: NxVideo;
}) {
    const { openVideo } = useNxPlayer();
    return (
        <div
            onClick={() => openVideo(video)}
            className="nx-press flex-shrink-0 w-40 cursor-pointer group"
        >
            <div className="relative w-40 h-40 rounded-2xl overflow-hidden mb-2"
                style={{ border: "1px solid rgba(43,62,232,0.20)" }}>
                <img src={image} alt={title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0" style={{ background: "rgba(5,8,24,0.20)" }} />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    style={{ background: "rgba(5,8,24,0.55)" }}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)" }}>
                        <Mic2 className="w-5 h-5 text-white" />
                    </div>
                </div>
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-lg text-[9px] font-black text-white"
                    style={{ background: "rgba(245,158,11,0.85)" }}>PODCAST</div>
                <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-bold"
                    style={{ background: "rgba(5,8,24,0.80)" }}>{dur}</div>
            </div>
            <p className="text-xs font-black text-white line-clamp-2 leading-snug mb-0.5 group-hover:text-[#F59E0B] transition-colors">{title}</p>
            <p className="text-[10px] font-medium" style={{ color: "rgba(100,120,170,0.75)" }}>{host}</p>
            <div className="flex items-center gap-2 mt-1">
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
                    style={{ background: "rgba(245,158,11,0.12)", color: "rgba(245,158,11,0.85)" }}>{ep}</span>
                <span className="flex items-center gap-0.5 text-[9px]" style={{ color: "rgba(80,100,150,0.70)" }}>
                    <Eye className="w-2.5 h-2.5" />{listens}
                </span>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// CreatorCard
// ─────────────────────────────────────────────────────────────────────────────
function CreatorCard({ name, handle, subs, cat, verified, seed }: {
    name: string; handle: string; subs: string; cat: string; verified: boolean; seed: string;
}) {
    const { openChannel } = useNxPlayer();
    return (
        <div
            onClick={() => openChannel(name)}
            className="nx-press flex-shrink-0 w-36 cursor-pointer group"
        >
            <div className="relative w-36 h-36 rounded-2xl overflow-hidden mb-2"
                style={{
                    border: "1px solid rgba(43,62,232,0.20)",
                    background: "linear-gradient(135deg,rgba(43,62,232,0.15),rgba(0,206,200,0.10))",
                }}>
                <img
                    src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}`}
                    alt={name}
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    style={{ background: "linear-gradient(to top, rgba(43,62,232,0.50), transparent)" }} />
            </div>
            <div className="flex items-center gap-1 mb-0.5">
                <p className="text-xs font-black text-white truncate group-hover:text-[#00CEC8] transition-colors">{name}</p>
                {verified && <BadgeCheck className="w-3 h-3 flex-shrink-0" style={{ color: "#00CEC8" }} />}
            </div>
            <p className="text-[10px]" style={{ color: "rgba(80,100,150,0.75)" }}>{handle}</p>
            <div className="flex items-center gap-2 mt-1">
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
                    style={{ background: "rgba(43,62,232,0.12)", color: "rgba(120,150,220,0.85)" }}>{subs}</span>
                <span className="text-[9px]" style={{ color: "rgba(80,100,150,0.70)" }}>{cat}</span>
            </div>
        </div>
    );
}
