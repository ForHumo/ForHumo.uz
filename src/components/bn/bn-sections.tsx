"use client";

import { useState, useMemo } from "react";
import { useSession, signIn } from "next-auth/react";
import {
    Car, Smartphone, Shirt, Sofa, Hammer, ShoppingBasket, Baby, Dumbbell,
    Sparkles, Wrench, Store, MapPin, Globe, Star, Package, ChevronRight,
    ScanLine, Camera, Bell, Navigation, User, LogIn, Crown, Settings,
    ShoppingCart, Heart, LogOut, ShieldCheck,
} from "lucide-react";
import { BN, TIER_META } from "@/lib/bn-theme";
import { BnLink } from "./bn-nav";
import { BnEmpty, shopLocationText } from "./bn-cards";
import { MOCK_CATEGORIES, MOCK_SHOPS } from "@/lib/bn-mock";

const CAT_ICONS: Record<string, React.ReactNode> = {
    Car:            <Car className="w-6 h-6" />,
    Smartphone:     <Smartphone className="w-6 h-6" />,
    Shirt:          <Shirt className="w-6 h-6" />,
    Sofa:           <Sofa className="w-6 h-6" />,
    Hammer:         <Hammer className="w-6 h-6" />,
    ShoppingBasket: <ShoppingBasket className="w-6 h-6" />,
    Baby:           <Baby className="w-6 h-6" />,
    Dumbbell:       <Dumbbell className="w-6 h-6" />,
    Sparkles:       <Sparkles className="w-6 h-6" />,
    Wrench:         <Wrench className="w-6 h-6" />,
};

// ── Katalog (kategoriyalar — bosh sahifadan ko'chirildi) ────────────────────

export function BnCatalogPage() {
    return (
        <Wrap>
            <PageHead title="Katalog" subtitle="Barcha kategoriyalar" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {MOCK_CATEGORIES.map(c => (
                    <div
                        key={c.slug}
                        className="rounded-2xl overflow-hidden"
                        style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                    >
                        <BnLink
                            href={`/k/${c.slug}`}
                            className="group flex items-center gap-3 p-4"
                            style={{ borderBottom: c.children?.length ? `1px solid ${BN.border}` : undefined }}
                        >
                            <span
                                className="w-12 h-12 rounded-xl grid place-items-center flex-shrink-0"
                                style={{ background: BN.goldSoft, color: BN.gold }}
                            >
                                {CAT_ICONS[c.icon] ?? <Store className="w-6 h-6" />}
                            </span>
                            <span className="flex-1 min-w-0">
                                <span className="block text-[15px] font-black truncate transition-colors group-hover:text-[color:var(--bn-gold)]">
                                    {c.name}
                                </span>
                                <span className="block text-[11.5px] mt-0.5" style={{ color: BN.text3 }}>
                                    {c.productCount.toLocaleString("uz-UZ")} ta mahsulot
                                </span>
                            </span>
                            <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: BN.text3 }} />
                        </BnLink>

                        {c.children && c.children.length > 0 && (
                            <div className="p-2">
                                {c.children.map(ch => (
                                    <BnLink
                                        key={ch.slug}
                                        href={`/k/${ch.slug}`}
                                        className="flex items-center justify-between h-9 px-2.5 rounded-lg text-[13px] transition-colors"
                                        style={{ color: BN.text2 }}
                                    >
                                        <span className="truncate">{ch.name}</span>
                                        <span className="text-[11px] flex-shrink-0" style={{ color: BN.text3 }}>
                                            {ch.productCount}
                                        </span>
                                    </BnLink>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </Wrap>
    );
}

// ── Do'konlar — reyting bo'yicha saralangan, 3 tab ──────────────────────────

type ShopTab = "all" | "market" | "other";

const SHOP_TABS: { key: ShopTab; label: string }[] = [
    { key: "all",    label: "Umumiy" },
    { key: "market", label: "Bozordagi do'konlar" },
    { key: "other",  label: "Boshqa do'konlar" },
];

export function BnShopsRanked() {
    const [tab, setTab] = useState<ShopTab>("all");

    const items = useMemo(() => {
        // AI reytingi: baho × ishonch (baho soni logarifmi) — FAZA 6 da haqiqiy tahlil
        const score = (s: typeof MOCK_SHOPS[number]) => s.rating * Math.log10(s.ratingCount + 10);
        let list = [...MOCK_SHOPS];
        if (tab === "market") list = list.filter(s => s.locationType === "IN_MARKET");
        if (tab === "other")  list = list.filter(s => s.locationType !== "IN_MARKET");
        return list.sort((a, b) => score(b) - score(a));
    }, [tab]);

    return (
        <Wrap>
            <PageHead
                title="Do'konlar"
                subtitle="Reyting va xaridor faolligiga qarab AI saralagan ro'yxat"
            />

            <div className="flex items-center gap-1.5 mb-5 overflow-x-auto pb-1 bn-noscroll">
                {SHOP_TABS.map(t => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className="h-10 px-4 rounded-xl text-[13.5px] font-bold flex-shrink-0 transition-colors whitespace-nowrap"
                        style={{
                            background: tab === t.key ? BN.goldSoft : BN.surface,
                            border: `1px solid ${tab === t.key ? BN.goldEdge : BN.border}`,
                            color: tab === t.key ? BN.gold : BN.text2,
                        }}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {items.length === 0 ? (
                <BnEmpty icon={<Store className="w-6 h-6" />} title="Do'kon topilmadi" />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {items.map((s, i) => (
                        <BnLink
                            key={s.id}
                            href={`/d/${s.slug}`}
                            className="group flex items-center gap-3 p-3 rounded-2xl transition-all active:scale-[0.99]"
                            style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                        >
                            <span
                                className="w-7 h-7 rounded-lg grid place-items-center text-[12px] font-black flex-shrink-0 tabular-nums"
                                style={i < 3
                                    ? { background: BN.goldSoft, color: BN.gold }
                                    : { background: BN.surfaceUp, color: BN.text3 }}
                            >
                                {i === 0 ? <Crown className="w-3.5 h-3.5" /> : i + 1}
                            </span>

                            <span
                                className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 grid place-items-center"
                                style={{ background: BN.surfaceUp }}
                            >
                                {s.logoUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={s.logoUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
                                ) : (
                                    <Store className="w-5 h-5" style={{ color: BN.text3 }} />
                                )}
                            </span>

                            <span className="flex-1 min-w-0">
                                <span className="flex items-center gap-1.5">
                                    <span className="text-[13.5px] font-black truncate transition-colors group-hover:text-[color:var(--bn-gold)]">
                                        {s.name}
                                    </span>
                                    {s.tier !== "NEW" && (
                                        <span
                                            className="px-1.5 py-0.5 rounded-md text-[9px] font-black leading-none flex-shrink-0"
                                            style={{ background: `${TIER_META[s.tier].color}1F`, color: TIER_META[s.tier].color }}
                                        >
                                            {TIER_META[s.tier].label}
                                        </span>
                                    )}
                                </span>
                                <span className="flex items-center gap-1 text-[11.5px] mt-0.5 truncate" style={{ color: BN.text3 }}>
                                    {s.locationType === "IN_MARKET"
                                        ? <Store className="w-3 h-3 flex-shrink-0" />
                                        : s.locationType === "STANDALONE"
                                            ? <MapPin className="w-3 h-3 flex-shrink-0" />
                                            : <Globe className="w-3 h-3 flex-shrink-0" />}
                                    <span className="truncate">{shopLocationText(s)}</span>
                                </span>
                            </span>

                            <span className="flex flex-col items-end flex-shrink-0">
                                <span className="flex items-center gap-1 text-[12.5px] font-black" style={{ color: BN.gold }}>
                                    <Star className="w-3.5 h-3.5 fill-current" />
                                    {s.rating.toFixed(1)}
                                </span>
                                <span className="flex items-center gap-1 text-[10.5px] mt-0.5" style={{ color: BN.text3 }}>
                                    <Package className="w-3 h-3" />
                                    {s.productCount}
                                </span>
                            </span>
                        </BnLink>
                    ))}
                </div>
            )}
        </Wrap>
    );
}

// ── Scan ────────────────────────────────────────────────────────────────────

export function BnScanPage() {
    return (
        <Wrap>
            <PageHead title="Scan" subtitle="Shtrix-kod yoki QR kodni skanerlang" />
            <div
                className="max-w-[440px] mx-auto p-6 rounded-3xl text-center"
                style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
            >
                <div
                    className="aspect-square rounded-2xl grid place-items-center mb-5"
                    style={{ background: BN.surfaceUp, border: `2px dashed ${BN.goldEdge}` }}
                >
                    <ScanLine className="w-14 h-14" style={{ color: BN.gold }} />
                </div>
                <p className="text-[14px] font-black mb-1.5">Kamerani yo&apos;naltiring</p>
                <p className="text-[13px] leading-relaxed mb-5" style={{ color: BN.text2 }}>
                    Mahsulot shtrix-kodini skanerlab, uni sotayotgan barcha do&apos;konlarni
                    va bozor narxini bir zumda ko&apos;rasiz.
                </p>
                <button
                    className="flex items-center justify-center gap-2 w-full h-12 rounded-2xl text-[15px] font-black"
                    style={{ background: BN.gold, color: BN.onGold }}
                >
                    <Camera className="w-5 h-5" />
                    Kamerani ochish
                </button>
                <p className="text-[11.5px] mt-3" style={{ color: BN.text3 }}>
                    Skaner tez orada ishga tushadi
                </p>
            </div>
        </Wrap>
    );
}

// ── Profil ──────────────────────────────────────────────────────────────────

export function BnProfilePage() {
    const { data: session, status } = useSession();

    if (status === "unauthenticated") {
        return (
            <Wrap>
                <div
                    className="max-w-[440px] mx-auto p-7 rounded-3xl text-center"
                    style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                >
                    <span
                        className="w-14 h-14 rounded-2xl grid place-items-center mx-auto mb-5"
                        style={{ background: BN.goldSoft, color: BN.gold }}
                    >
                        <User className="w-7 h-7" />
                    </span>
                    <h1 className="text-[20px] font-black mb-2">Profil</h1>
                    <p className="text-[13.5px] leading-relaxed mb-6" style={{ color: BN.text2 }}>
                        Humo ID bilan kiring — buyurtmalar, sevimlilar va do&apos;kon bir joyda bo&apos;ladi.
                    </p>
                    <button
                        onClick={() => signIn("google")}
                        className="flex items-center justify-center gap-2 w-full h-12 rounded-2xl text-[15px] font-black"
                        style={{ background: BN.gold, color: BN.onGold }}
                    >
                        <LogIn className="w-5 h-5" />
                        Humo ID bilan kirish
                    </button>
                </div>
            </Wrap>
        );
    }

    return (
        <Wrap>
            <div
                className="flex items-center gap-4 p-5 rounded-3xl mb-4"
                style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
            >
                {session?.user?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={session.user.image} alt="" className="w-16 h-16 rounded-2xl object-cover flex-shrink-0" />
                ) : (
                    <span className="w-16 h-16 rounded-2xl grid place-items-center flex-shrink-0" style={{ background: BN.surfaceUp }}>
                        <User className="w-7 h-7" />
                    </span>
                )}
                <div className="min-w-0">
                    <p className="text-[18px] font-black truncate">{session?.user?.name ?? "Foydalanuvchi"}</p>
                    <p className="text-[12.5px] truncate" style={{ color: BN.text3 }}>{session?.user?.email}</p>
                    <span
                        className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-md text-[10.5px] font-black"
                        style={{ background: BN.goldSoft, color: BN.gold }}
                    >
                        <ShieldCheck className="w-3 h-3" />
                        Humo ID
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
                <Row href="/buyurtmalarim" icon={<Package className="w-[18px] h-[18px]" />} label="Buyurtmalarim" />
                <Row href="/sevimlilar" icon={<Heart className="w-[18px] h-[18px]" />} label="Sevimlilar" />
                <Row href="/savat" icon={<ShoppingCart className="w-[18px] h-[18px]" />} label="Savat" />
                <Row href="/joylashuv" icon={<Navigation className="w-[18px] h-[18px]" />} label="Mening joylashuvim" />
                <Row href="/kabinet" icon={<Store className="w-[18px] h-[18px]" />} label="Sotuvchi kabineti" />
                <Row href="/sozlamalar" icon={<Settings className="w-[18px] h-[18px]" />} label="Sozlamalar" />
            </div>

            <a
                href="https://forhumo.uz/uz/id"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full h-12 rounded-2xl text-[14px] font-bold"
                style={{ background: BN.surface, border: `1px solid ${BN.border}`, color: BN.text2 }}
            >
                <LogOut className="w-4 h-4" />
                Humo ID sozlamalari
            </a>
        </Wrap>
    );
}

// ── Oddiy sahifalar ─────────────────────────────────────────────────────────

export function BnNotificationsPage() {
    return (
        <Wrap>
            <PageHead title="Bildirishnomalar" />
            <BnEmpty
                icon={<Bell className="w-6 h-6" />}
                title="Yangi bildirishnoma yo'q"
                text="Buyurtma holati o'zgarganda va narx tushganda shu yerda xabar beramiz."
            />
        </Wrap>
    );
}

export function BnLocationPage() {
    return (
        <Wrap>
            <PageHead title="Mening joylashuvim" subtitle="Yaqin do'konlar va yetkazish narxi shunga qarab hisoblanadi" />
            <BnEmpty
                icon={<Navigation className="w-6 h-6" />}
                title="Joylashuv belgilanmagan"
                text="Manzilingizni kiritsangiz, eng yaqin do'konlarni birinchi ko'rsatamiz."
                action={
                    <button
                        className="inline-flex items-center gap-2 h-11 px-5 rounded-xl text-[14px] font-black"
                        style={{ background: BN.gold, color: BN.onGold }}
                    >
                        <Navigation className="w-4 h-4" />
                        Joylashuvni aniqlash
                    </button>
                }
            />
        </Wrap>
    );
}

export function BnPickupPage() {
    return (
        <Wrap>
            <PageHead title="Topshirish punktlari" subtitle="Buyurtmani shu punktlardan olib ketishingiz mumkin" />
            <BnEmpty
                icon={<Package className="w-6 h-6" />}
                title="Punktlar tayyorlanmoqda"
                text="Toshkent bo'ylab topshirish punktlari tarmog'i ochilmoqda."
            />
        </Wrap>
    );
}

export function BnSettingsPage() {
    return (
        <Wrap>
            <PageHead title="Sozlamalar" />
            <BnEmpty
                icon={<Settings className="w-6 h-6" />}
                title="Sozlamalar"
                text="Til va rejimni yuqoridagi paneldan o'zgartirishingiz mumkin."
            />
        </Wrap>
    );
}

// ── Yordamchilar ────────────────────────────────────────────────────────────

function Wrap({ children }: { children: React.ReactNode }) {
    return <div className="mx-auto max-w-[1280px] px-4 py-6 pb-10">{children}</div>;
}

function PageHead({ title, subtitle }: { title: string; subtitle?: string }) {
    return (
        <div className="mb-6">
            <h1 className="text-[24px] sm:text-[30px] font-black tracking-tight">{title}</h1>
            {subtitle && (
                <p className="text-[13.5px] mt-1.5 max-w-[600px] leading-relaxed" style={{ color: BN.text2 }}>
                    {subtitle}
                </p>
            )}
        </div>
    );
}

function Row({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
    return (
        <BnLink
            href={href}
            className="flex items-center gap-3 h-14 px-4 rounded-2xl transition-colors"
            style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
        >
            <span style={{ color: BN.gold }}>{icon}</span>
            <span className="flex-1 text-[14px] font-bold">{label}</span>
            <ChevronRight className="w-4 h-4" style={{ color: BN.text3 }} />
        </BnLink>
    );
}
