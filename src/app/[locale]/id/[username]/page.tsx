import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import Image from "next/image";
import { Pencil, ShieldCheck, Shield, ShieldAlert, ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

// ── Country code → flag emoji ──────────────────────────────────────────────────
function countryFlag(code: string): string {
    return code.toUpperCase().split("").map(c =>
        String.fromCodePoint(c.charCodeAt(0) + 127397)
    ).join("");
}

const COUNTRY_NAMES: Record<string, { uz: string; ru: string; en: string }> = {
    UZ: { uz: "O'zbekiston", ru: "Узбекистан", en: "Uzbekistan" },
    RU: { uz: "Rossiya", ru: "Россия", en: "Russia" },
    KZ: { uz: "Qozog'iston", ru: "Казахстан", en: "Kazakhstan" },
    KG: { uz: "Qirg'iziston", ru: "Кыргызстан", en: "Kyrgyzstan" },
    TJ: { uz: "Tojikiston", ru: "Таджикистан", en: "Tajikistan" },
    TM: { uz: "Turkmaniston", ru: "Туркменистан", en: "Turkmenistan" },
    AZ: { uz: "Ozarbayjon", ru: "Азербайджан", en: "Azerbaijan" },
    GE: { uz: "Gruziya", ru: "Грузия", en: "Georgia" },
    TR: { uz: "Turkiya", ru: "Турция", en: "Turkey" },
    DE: { uz: "Germaniya", ru: "Германия", en: "Germany" },
    FR: { uz: "Frantsiya", ru: "Франция", en: "France" },
    GB: { uz: "Britaniya", ru: "Великобритания", en: "United Kingdom" },
    US: { uz: "AQSH", ru: "США", en: "USA" },
    KR: { uz: "Janubiy Koreya", ru: "Южная Корея", en: "South Korea" },
    JP: { uz: "Yaponiya", ru: "Япония", en: "Japan" },
    CN: { uz: "Xitoy", ru: "Китай", en: "China" },
    IN: { uz: "Hindiston", ru: "Индия", en: "India" },
    AE: { uz: "BAA", ru: "ОАЭ", en: "UAE" },
    SA: { uz: "Saudiya Arabistoni", ru: "Саудовская Аравия", en: "Saudi Arabia" },
};

function getCountryName(code: string, locale: string): string {
    const entry = COUNTRY_NAMES[code];
    if (!entry) return code;
    return locale === "ru" ? entry.ru : locale === "en" ? entry.en : entry.uz;
}

// ── Level icon ─────────────────────────────────────────────────────────────────
function LevelIcon({ level }: { level: number }) {
    if (level >= 2) return <ShieldCheck size={13} className="text-emerald-400" />;
    if (level >= 1) return <Shield      size={13} className="text-blue-400"    />;
    return             <ShieldAlert  size={13} className="text-amber-400"   />;
}

// ── Metadata ──────────────────────────────────────────────────────────────────
export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string; username: string }>;
}): Promise<Metadata> {
    const { username } = await params;
    const profile = await prisma.userProfile.findUnique({
        where: { username },
        select: { name: true, bio: true, image: true },
    });
    return {
        title: profile ? `${profile.name ?? "@" + username} • Humo ID` : "Humo ID",
        description: profile?.bio ?? `@${username} — Humo ID`,
        openGraph: { images: profile?.image ? [profile.image] : [] },
    };
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default async function PublicProfilePage({
    params,
}: {
    params: Promise<{ locale: string; username: string }>;
}) {
    const { locale, username } = await params;
    const t = await getTranslations("HumoID");

    // Public fields only — no email, phone, location, birthday
    const profile = await prisma.userProfile.findUnique({
        where: { username },
        select: {
            name: true, firstName: true, lastName: true,
            username: true, humoId: true, country: true,
            image: true, coverImage: true, bio: true,
            level: true, createdAt: true,
        },
    });

    if (!profile) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
                <p className="text-4xl font-black opacity-20">@{username}</p>
                <h1 className="text-xl font-bold text-foreground">{t("profile_not_found")}</h1>
                <p className="text-sm text-muted-foreground">{t("profile_not_found_desc")}</p>
                <Link href="/id" className="mt-2 text-sm font-semibold text-primary hover:underline">
                    ← {t("back_to_id")}
                </Link>
            </div>
        );
    }

    // Check if own profile (via JWT username claim)
    const session = await getServerSession(authOptions);
    const isOwn = (session?.user as { username?: string } | undefined)?.username === username;

    const displayName = profile.name || `@${username}`;
    const joinDate    = new Intl.DateTimeFormat(
        locale === "ru" ? "ru-RU" : locale === "en" ? "en-US" : "uz-UZ",
        { day: "numeric", month: "long", year: "numeric" }
    ).format(new Date(profile.createdAt));

    const levelColors = [
        "from-amber-500/20  to-amber-600/10  border-amber-500/30  text-amber-400",
        "from-blue-500/20   to-blue-600/10   border-blue-500/30   text-blue-400",
        "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-400",
    ];
    const level = profile.level ?? 0;

    return (
        <div className="min-h-screen py-8 px-4">
            <div className="max-w-xl mx-auto">

                {/* Back */}
                <Link href="/id"
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5">
                    <ArrowLeft size={15} />
                    {t("back_to_id")}
                </Link>

                {/* Cover banner */}
                <div className={`relative w-full h-36 sm:h-44 rounded-2xl overflow-hidden mb-0
                    ${!profile.coverImage ? "bg-gradient-to-br from-blue-600 via-blue-700 to-slate-800" : ""}`}>
                    {profile.coverImage && (
                        <Image
                            src={profile.coverImage}
                            alt="Cover"
                            fill
                            className="object-cover"
                        />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                </div>

                {/* Avatar row — overlaps cover */}
                <div className="-mt-10 sm:-mt-12 px-3 sm:px-4 flex items-end justify-between mb-4">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-4 border-background shadow-2xl flex-shrink-0 bg-blue-600">
                        {profile.image ? (
                            <Image
                                src={profile.image}
                                alt={displayName}
                                width={96}
                                height={96}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-3xl font-black text-white">
                                {displayName.slice(0, 1).toUpperCase()}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2 mb-1">
                        <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full
                            bg-gradient-to-r border backdrop-blur-sm ${levelColors[level] ?? levelColors[0]}`}>
                            <LevelIcon level={level} />
                            {t(`level_${level}` as "level_0" | "level_1" | "level_2")}
                        </span>
                        {isOwn && (
                            <Link href="/id/edit"
                                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full
                                    bg-card border border-border hover:bg-accent transition-colors">
                                <Pencil size={11} />
                                {t("edit_title")}
                            </Link>
                        )}
                    </div>
                </div>

                {/* Profile info */}
                <div className="px-1 space-y-4">

                    {/* Name + username */}
                    <div>
                        <h1 className="text-2xl font-black text-foreground tracking-tight">{displayName}</h1>
                        <p className="text-sm text-muted-foreground font-mono mt-0.5">@{username}</p>
                    </div>

                    {/* Bio */}
                    {profile.bio && (
                        <p className="text-sm text-foreground/80 leading-relaxed">{profile.bio}</p>
                    )}

                    {/* Meta row: country + since */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        {profile.country && (
                            <span className="flex items-center gap-1.5">
                                <span className="text-base">{countryFlag(profile.country)}</span>
                                {getCountryName(profile.country, locale)}
                            </span>
                        )}
                        <span>{t("member_since")} {joinDate}</span>
                    </div>

                    {/* Humo ID number */}
                    {profile.humoId && (
                        <div className="inline-flex items-center gap-2 bg-muted/60 border border-border/60 rounded-xl px-4 py-2.5">
                            <div className="relative w-4 h-4 flex-shrink-0">
                                <Image src="/logos/humo-id.png" alt="Humo ID" fill className="object-contain" />
                            </div>
                            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                                {t("humo_id_number")}
                            </span>
                            <span className="font-mono font-bold text-foreground tracking-widest text-sm">
                                {profile.humoId}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
