import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import Image from "next/image";
import { Pencil, ShieldCheck, Shield, ShieldAlert, CheckCircle2, HelpCircle, Headphones } from "lucide-react";
import type { Metadata } from "next";
import { CopyLinkButton, QRButton, DeleteAccountButton, LastLoginInfo } from "@/components/ui/profile-actions";

export async function generateMetadata(): Promise<Metadata> {
    return { title: "Humo ID" };
}

// ── Country code → flag emoji ──────────────────────────────────────────────────
function countryFlag(code: string): string {
    return code.toUpperCase().split("").map(c =>
        String.fromCodePoint(c.charCodeAt(0) + 127397)
    ).join("");
}

// ── Services list ─────────────────────────────────────────────────────────────
const SERVICES = [
    { key: "id",      label: "Humo ID",      href: "/id",          logo: "/logos/humo-id.png"       },
    { key: "ai",      label: "Humo AI",       href: "/ai",          logo: "/logos/humo-ai-white.png" },
    { key: "nexus",   label: "Humo Nexus",    href: "/nexus",       logo: "/logos/humo-nexus.png"    },
    { key: "esport",  label: "Humo eSport",   href: "/esport",      logo: "/logos/humo-esport.png"   },
    { key: "market",  label: "Humo Market",   href: "/coming-soon", logo: "/logos/humo-market.png"   },
    { key: "pay",     label: "For Pay",       href: "/pay", logo: "/logos/for-pay.png"       },
    { key: "support", label: "Humo Support",  href: "/support", logo: "/logos/humo-support.png"  },
];

// ── Profile completeness ──────────────────────────────────────────────────────
function calcCompleteness(profile: {
    firstName?: string | null; lastName?: string | null; bio?: string | null;
    username?: string | null; birthday?: Date | null; phone?: string | null;
    location?: string | null; coverImage?: string | null; image?: string | null;
    emailVerified?: boolean;
}): number {
    const checks = [
        !!profile.firstName,
        !!profile.lastName,
        !!profile.bio,
        !!profile.username,
        !!profile.birthday,
        !!profile.phone,
        !!profile.location,
        !!profile.coverImage,
        !!profile.image,
        !!profile.emailVerified,
    ];
    return Math.round(checks.filter(Boolean).length / checks.length * 100);
}

// ── Level config ──────────────────────────────────────────────────────────────
function LevelIcon({ level }: { level: number }) {
    if (level >= 2) return <ShieldCheck size={14} className="text-emerald-400" />;
    if (level >= 1) return <Shield      size={14} className="text-blue-400"    />;
    return             <ShieldAlert  size={14} className="text-amber-400"   />;
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default async function HumoIdPage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    const session = await getServerSession(authOptions);
    const t = await getTranslations("HumoID");

    const profile = session?.user?.email
        ? await prisma.userProfile.findUnique({
              where: { email: session.user.email },
          })
        : null;

    const displayName  = profile?.name  || session?.user?.name  || "—";
    const displayImage = profile?.image || session?.user?.image || null;
    const username     = profile?.username ?? null;
    const level        = profile?.level ?? 0;
    const joinDate     = profile?.createdAt
        ? new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(new Date(profile.createdAt))
        : "—";

    const levelColors = [
        "from-amber-500/20  to-amber-600/10  border-amber-500/30  text-amber-400",
        "from-blue-500/20   to-blue-600/10   border-blue-500/30   text-blue-400",
        "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-400",
    ];

    const completeness = profile ? calcCompleteness(profile) : 0;
    const profileUrl   = username
        ? `https://forhumo.uz/${locale}/id/${username}`
        : null;

    return (
        <div className="min-h-screen py-10 px-4">
            <div className="max-w-2xl mx-auto space-y-5">

                {/* ── ID Card ──────────────────────────────────────────────── */}
                <div className="relative overflow-hidden rounded-3xl
                    bg-gradient-to-br from-blue-700 via-blue-800 to-slate-900
                    p-5 sm:p-7 text-white shadow-2xl shadow-blue-900/40">

                    {/* Cover photo as card background */}
                    {profile?.coverImage && (
                        <Image
                            src={profile.coverImage}
                            alt="Cover"
                            fill
                            className="object-cover object-center"
                            unoptimized
                        />
                    )}

                    {/* Dark overlay so text stays readable */}
                    <div className={`absolute inset-0 ${
                        profile?.coverImage
                            ? "bg-gradient-to-br from-blue-900/80 via-blue-900/70 to-slate-900/85"
                            : ""
                    }`} />

                    {/* Dot-grid watermark */}
                    <div className="absolute inset-0 opacity-[0.06]"
                        style={{
                            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
                            backgroundSize: "24px 24px",
                        }}
                    />

                    {/* Glow blobs */}
                    <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-blue-400/20 blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-cyan-400/15 blur-3xl pointer-events-none" />

                    {/* Top row: logos + level badge */}
                    <div className="relative flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2.5">
                            <div className="relative w-8 h-8">
                                <Image src="/logo.png" alt="For Humo" fill className="object-contain" />
                            </div>
                            <span className="text-sm font-bold tracking-widest uppercase opacity-70">
                                For Humo
                            </span>
                            <span className="text-sm opacity-40 font-light">·</span>
                            <div className="relative w-8 h-8">
                                <Image src="/logos/humo-id.png" alt="Humo ID" fill className="object-contain" />
                            </div>
                            <span className="text-sm font-bold tracking-widest uppercase opacity-70">
                                Humo ID
                            </span>
                        </div>
                        <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full
                            bg-gradient-to-r border backdrop-blur-sm ${levelColors[level] ?? levelColors[0]}`}>
                            <LevelIcon level={level} />
                            {t(`level_${level}` as "level_0" | "level_1" | "level_2")}
                        </span>
                    </div>

                    {/* Avatar + name */}
                    <div className="relative flex items-center gap-5">
                        <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl flex-shrink-0">
                            {displayImage ? (
                                <Image
                                    src={displayImage}
                                    alt={displayName}
                                    fill
                                    className="object-cover"
                                    referrerPolicy="no-referrer"
                                />
                            ) : (
                                <div className="w-full h-full bg-blue-600 flex items-center justify-center text-2xl font-black">
                                    {displayName.slice(0, 1).toUpperCase()}
                                </div>
                            )}
                        </div>

                        <div className="min-w-0">
                            <h1 className="text-2xl font-black tracking-tight truncate">{displayName}</h1>
                            {username ? (
                                <Link
                                    href={`/id/${username}` as Parameters<typeof Link>[0]["href"]}
                                    className="text-blue-200 text-sm font-mono mt-0.5 hover:text-blue-100 transition-colors"
                                >
                                    @{username}
                                </Link>
                            ) : (
                                <Link href="/id/edit"
                                    className="text-blue-300/70 text-sm mt-0.5 hover:text-blue-200 transition-colors italic">
                                    {t("no_username")} →
                                </Link>
                            )}
                            {profile?.bio && (
                                <p className="text-white/70 text-sm mt-1.5 leading-snug line-clamp-2">
                                    {profile.bio}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Bottom row: humoId + country + join date */}
                    <div className="relative mt-6 pt-5 border-t border-white/10">
                        <div className="flex flex-wrap items-end justify-between gap-3">
                            {/* Humo ID number */}
                            {profile?.humoId ? (
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-0.5">
                                        {t("humo_id_number")}
                                    </p>
                                    <p className="font-mono font-bold text-sm sm:text-base tracking-[0.15em] sm:tracking-[0.2em] text-white/90 break-all">
                                        {profile.humoId}
                                    </p>
                                </div>
                            ) : (
                                <span className="text-xs text-white/30 italic">{t("humo_id_number")} —</span>
                            )}

                            {/* Country + date */}
                            <div className="text-right text-xs text-white/50 space-y-0.5">
                                {profile?.country && (
                                    <p className="text-sm">{countryFlag(profile.country)}</p>
                                )}
                                <p>{t("member_since")} {joinDate}</p>
                            </div>
                        </div>
                        <p className="mt-2 truncate text-xs text-white/30">{session?.user?.email ?? "—"}</p>
                    </div>

                    {/* Edit button */}
                    <Link href="/id/edit"
                        className="relative mt-5 inline-flex items-center gap-2 text-sm font-semibold
                            bg-white/10 hover:bg-white/20 border border-white/20
                            px-4 py-2 rounded-full transition-colors">
                        <Pencil size={13} />
                        {t("edit_title")}
                    </Link>
                </div>

                {/* ── Email verification banner ──────────────────────────── */}
                {!profile?.emailVerified && (
                    <div className="flex items-center justify-between gap-4
                        rounded-2xl border border-amber-500/30
                        bg-amber-500/5 px-5 py-4">
                        <div>
                            <p className="text-sm font-semibold text-amber-500">{t("verify_email_cta")}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{t("verify_email_desc")}</p>
                        </div>
                        <Link href="/id/verify"
                            className="flex-shrink-0 text-xs font-bold px-4 py-2 rounded-full
                                bg-amber-500 text-white hover:bg-amber-400 transition-colors">
                            {t("verify_email_cta")}
                        </Link>
                    </div>
                )}

                {profile?.emailVerified && (
                    <div className="flex items-center gap-3
                        rounded-2xl border border-emerald-500/20
                        bg-emerald-500/5 px-5 py-3">
                        <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                        <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                            {t("level_badge_1")}
                        </p>
                    </div>
                )}

                {/* ── Profile completeness ──────────────────────────────── */}
                {profile && completeness < 100 && (
                    <div className="rounded-2xl border border-border bg-card px-5 py-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-foreground">{t("completeness_label")}</p>
                            <span className={`text-sm font-bold ${completeness >= 70 ? "text-emerald-500" : completeness >= 40 ? "text-amber-500" : "text-red-500"}`}>
                                {completeness}%
                            </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${
                                    completeness >= 70 ? "bg-emerald-500" :
                                    completeness >= 40 ? "bg-amber-500" : "bg-red-500"
                                }`}
                                style={{ width: `${completeness}%` }}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">{t("completeness_hint")}</p>
                        <Link href="/id/edit"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
                            <Pencil size={11} />
                            {t("edit_title")}
                        </Link>
                    </div>
                )}

                {/* ── Quick actions (copy link, QR) ──────────────────────── */}
                {profileUrl && username && (
                    <div className="flex flex-wrap gap-2">
                        <CopyLinkButton url={profileUrl} />
                        <QRButton url={profileUrl} username={username} />
                    </div>
                )}

                {/* ── Services grid ──────────────────────────────────────── */}
                <div>
                    <div className="mb-4">
                        <h2 className="text-lg font-bold text-foreground">{t("services_title")}</h2>
                        <p className="text-sm text-muted-foreground">{t("services_desc")}</p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {SERVICES.map((svc) => (
                            <Link
                                key={svc.key}
                                href={svc.href}
                                className="group flex items-center gap-3
                                    rounded-xl border border-border
                                    bg-card hover:bg-accent
                                    px-4 py-3
                                    transition-colors"
                            >
                                <div className="relative w-7 h-7 flex-shrink-0">
                                    <Image
                                        src={svc.logo}
                                        alt={svc.label}
                                        fill
                                        sizes="28px"
                                        className="object-contain"
                                    />
                                </div>
                                <span className="text-sm font-semibold text-foreground truncate">
                                    {svc.label}
                                </span>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* ── Help links ─────────────────────────────────────────── */}
                <div className="flex gap-3">
                    <Link href="/faq"
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-border
                            bg-card hover:bg-accent px-4 py-3 text-sm font-semibold transition-colors">
                        <HelpCircle size={15} className="text-muted-foreground" />
                        {t("faq_link")}
                    </Link>
                    <Link href="/support"
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-border
                            bg-card hover:bg-accent px-4 py-3 text-sm font-semibold transition-colors">
                        <Headphones size={15} className="text-muted-foreground" />
                        {t("support_link")}
                    </Link>
                </div>

                {/* ── Security section ───────────────────────────────────── */}
                {session?.user?.email && (
                    <div className="rounded-2xl border border-border bg-card px-5 py-4 space-y-3">
                        <p className="text-sm font-semibold text-foreground">{t("security_title")}</p>
                        <div className="flex items-center justify-between">
                            <LastLoginInfo />
                            <DeleteAccountButton userEmail={session.user.email} />
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
