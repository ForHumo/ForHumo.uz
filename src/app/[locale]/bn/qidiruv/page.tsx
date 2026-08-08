import type { Metadata } from "next";
import { BnCatalog } from "@/components/bn/bn-catalog";
import { BnVoiceSearchClient } from "@/components/bn/bn-voice-search-client";
import { getMarkets, searchProducts } from "@/lib/bn-data";
import { getBnAuth } from "@/lib/bn-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Qidiruv" };

export default async function Page({
    searchParams,
}: { searchParams: Promise<{ q?: string; sort?: string; mode?: string }> }) {
    const sp = await searchParams;

    // AI voice/NL rejimi — alohida komponent
    if (sp.mode === "voice" || sp.mode === "ai") {
        return <BnVoiceSearchClient initialQuery={sp.q ?? ""} />;
    }

    const auth = await getBnAuth();
    const sort = sp.sort === "cheap" ? "cheap" : "new";
    const [products, markets] = await Promise.all([
        searchProducts({ q: sp.q, sort, profileId: auth?.profileId ?? null }),
        getMarkets(20),
    ]);
    return (
        <BnCatalog
            initialProducts={products}
            markets={markets}
            query={sp.q ?? ""}
            initialSort={sort}
        />
    );
}
