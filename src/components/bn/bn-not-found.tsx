"use client";

// BN 404 ko'rinishi — `[locale]/bn/not-found.tsx` render qiladi (BN layout ichida:
// header, pastki menyu va footer joyida qoladi). Foydalanuvchini adashtirmaslik uchun
// darhol qidiruv + asosiy bo'limlarga yo'l beriladi.

import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, Search, SearchX, Store } from "lucide-react";
import { BN } from "@/lib/bn-theme";
import { BnLink, useBnHref } from "./bn-nav";
import { isProductRoute } from "./bn-header";

export function BnNotFoundView() {
    const t = useTranslations("bn");
    const to = useBnHref();
    const secondary = { background: BN.surface, border: `1px solid ${BN.border}`, color: BN.text };
    // Yo'q mahsulot (/d/<do'kon>/<x>, /p/<x>) — header yo'l bo'yicha shaffof tungi kapsula
    // bo'lib qoladi. Yorug' fon ustida u kulrang va o'qilmas edi, shuning uchun 404 ham
    // vitrina kabi tungi sahnada (.bn-stage) chiqadi va kapsula ostida joy qoldiriladi.
    const onStage = isProductRoute(usePathname() ?? "");

    const view = (
        <section className={`max-w-[640px] mx-auto px-4 ${onStage ? "pt-28 pb-28" : "pt-14 pb-10"} flex flex-col items-center text-center`}>
            <span
                className="w-16 h-16 rounded-2xl grid place-items-center mb-5"
                style={{ background: BN.goldSoft, border: `1px solid ${BN.borderGold}`, color: BN.gold }}
            >
                <SearchX className="w-7 h-7" />
            </span>
            <p className="bn-num text-[13px] font-black tracking-[0.2em] mb-2" style={{ color: BN.gold }}>404</p>
            <h1 className="text-[28px] sm:text-[34px] font-black leading-tight mb-2">{t("notFound.title")}</h1>
            <p className="text-[14px] max-w-[440px] mb-6" style={{ color: BN.text2 }}>{t("notFound.text")}</p>

            {/* Oddiy GET forma — JS'siz ham ishlaydi, /qidiruv?q=... ga o'tadi */}
            <form
                action={to("/qidiruv")}
                method="get"
                role="search"
                className="w-full max-w-[460px] flex items-center gap-2 h-12 pl-4 pr-1.5 rounded-2xl mb-5"
                style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
            >
                <Search className="w-4 h-4 shrink-0" style={{ color: BN.text3 }} />
                <input
                    name="q"
                    type="search"
                    placeholder={t("search.placeholderShort")}
                    aria-label={t("search.placeholder")}
                    className="flex-1 min-w-0 bg-transparent outline-none text-[14px]"
                    style={{ color: BN.text }}
                />
                <button
                    type="submit"
                    className="h-9 px-4 rounded-xl text-[13px] font-black shrink-0"
                    style={{ background: BN.gold, color: BN.onGold }}
                >
                    {t("search.submit")}
                </button>
            </form>

            <div className="flex flex-wrap justify-center gap-2">
                <BnLink
                    href="/"
                    className="inline-flex items-center gap-2 h-11 px-5 rounded-xl text-[14px] font-black"
                    style={{ background: BN.gold, color: BN.onGold }}
                >
                    <Home className="w-4 h-4" />
                    {t("breadcrumb.home")}
                </BnLink>
                <BnLink
                    href="/katalog"
                    className="inline-flex items-center gap-2 h-11 px-5 rounded-xl text-[14px] font-bold"
                    style={secondary}
                >
                    <LayoutGrid className="w-4 h-4" style={{ color: BN.gold }} />
                    {t("nav.catalog")}
                </BnLink>
                <BnLink
                    href="/bozorlar"
                    className="inline-flex items-center gap-2 h-11 px-5 rounded-xl text-[14px] font-bold"
                    style={secondary}
                >
                    <Store className="w-4 h-4" style={{ color: BN.gold }} />
                    {t("footer.markets")}
                </BnLink>
            </div>
        </section>
    );

    if (!onStage) return view;
    return (
        <>
            <div className="bn-stage" style={{ background: "var(--bn-bg)", color: "var(--bn-text)" }}>{view}</div>
            {/* .bn-stage TASHQARISIDA — var(--bn-bg) bu yerda sahifaning o'z foni (vitrinadagi o'tish kabi) */}
            <div aria-hidden="true" className="relative h-24 -mt-24 pointer-events-none" style={{ background: "linear-gradient(180deg, transparent 0%, var(--bn-bg) 100%)" }} />
        </>
    );
}
