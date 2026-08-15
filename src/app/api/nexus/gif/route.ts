// Giphy proxy — API kalitni server-side yashiradi.
//
//   GET /api/nexus/gif?q=cat&limit=24  → search
//   GET /api/nexus/gif?trending=1&limit=24  → trending
//
// Response: { gifs: Array<{ id, url_mp4, url_gif, preview, width, height, title }> }
//
// Kalit yo'q bo'lsa 503 va bo'sh ro'yxat qaytariladi.

import { NextResponse } from "next/server";

interface GiphyItem {
    id: string;
    title?: string;
    images?: {
        original?: { url?: string; mp4?: string; webp?: string; width?: string; height?: string };
        original_mp4?: { mp4?: string; width?: string; height?: string };
        fixed_width?: { url?: string; webp?: string; mp4?: string };
        fixed_width_small?: { url?: string; mp4?: string };
        preview?: { mp4?: string };
        preview_gif?: { url?: string };
    };
}

export async function GET(req: Request) {
    const key = process.env.GIPHY_API_KEY;
    if (!key) {
        return NextResponse.json({ gifs: [], error: "Giphy API kaliti sozlanmagan" }, { status: 503 });
    }

    const url = new URL(req.url);
    const q = url.searchParams.get("q") || "";
    const trending = url.searchParams.get("trending") === "1";
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? "24")));

    const base = trending
        ? "https://api.giphy.com/v1/gifs/trending"
        : "https://api.giphy.com/v1/gifs/search";
    const params = new URLSearchParams({
        api_key: key,
        limit: String(limit),
        rating: "pg-13",   // sensitiv kontentni cheklash
        lang: "en",
    });
    if (!trending) params.set("q", q);

    try {
        const r = await fetch(`${base}?${params}`, { cache: "no-store" });
        if (!r.ok) return NextResponse.json({ gifs: [], error: `Giphy ${r.status}` }, { status: 502 });
        const d = await r.json();
        const items: GiphyItem[] = Array.isArray(d?.data) ? d.data : [];
        const gifs = items.map(g => {
            const orig = g.images?.original;
            const preview = g.images?.fixed_width_small?.url ?? g.images?.fixed_width?.url ?? g.images?.preview_gif?.url;
            const mp4 = g.images?.original_mp4?.mp4 ?? orig?.mp4 ?? g.images?.fixed_width?.mp4;
            return {
                id: g.id,
                title: g.title ?? "",
                url_mp4: mp4 ?? null,
                url_gif: orig?.url ?? null,
                preview: preview ?? null,
                width: Number(orig?.width ?? g.images?.original_mp4?.width ?? 200),
                height: Number(orig?.height ?? g.images?.original_mp4?.height ?? 200),
            };
        });
        return NextResponse.json({ gifs });
    } catch (e) {
        return NextResponse.json({ gifs: [], error: e instanceof Error ? e.message : "Xatolik" }, { status: 502 });
    }
}
