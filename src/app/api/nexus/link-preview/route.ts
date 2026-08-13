// URL link preview — OG (Open Graph) va Twitter Card meta'larni tortib olish.
//   GET /api/nexus/link-preview?url=https://...
// Fetch cache (Vercel edge) 1 soatga saqlaydi.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Faqat html/text bo'lgan javoblarni parse qilamiz — juda katta bo'lmasin
const MAX_BYTES = 512 * 1024; // 512KB

function pickMeta(html: string, prop: string): string | null {
    const patterns = [
        new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i"),
        new RegExp(`<meta[^>]+name=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i"),
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${prop}["']`, "i"),
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${prop}["']`, "i"),
    ];
    for (const p of patterns) {
        const m = html.match(p);
        if (m?.[1]) return decodeEntities(m[1]);
    }
    return null;
}

function decodeEntities(s: string): string {
    return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'");
}

function normalizeUrl(base: string, maybe: string | null): string | null {
    if (!maybe) return null;
    try { return new URL(maybe, base).toString(); }
    catch { return null; }
}

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const u = new URL(req.url);
    const target = u.searchParams.get("url");
    if (!target) return NextResponse.json({ error: "url kerak" }, { status: 400 });

    let parsed: URL;
    try { parsed = new URL(target); }
    catch { return NextResponse.json({ error: "noto'g'ri URL" }, { status: 400 }); }

    // Faqat http(s), va SSRF himoyasi — lokal manzillarni bloklash
    if (!["http:", "https:"].includes(parsed.protocol)) {
        return NextResponse.json({ error: "faqat http/https" }, { status: 400 });
    }
    const host = parsed.hostname.toLowerCase();
    if (host === "localhost" || host === "0.0.0.0" || host.startsWith("127.") || host.startsWith("10.")
        || host.startsWith("192.168.") || host.endsWith(".local") || host.endsWith(".internal")
        || host.includes(":")) {
        return NextResponse.json({ error: "lokal manzil taqiqlangan" }, { status: 400 });
    }

    try {
        const res = await fetch(parsed.toString(), {
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; ForHumoPreview/1.0)",
                "Accept": "text/html,application/xhtml+xml",
            },
            redirect: "follow",
            signal: AbortSignal.timeout(6000),
            next: { revalidate: 3600 }, // 1 soat cache
        });
        if (!res.ok) return NextResponse.json({ error: `status ${res.status}` }, { status: 502 });
        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("text/html") && !ct.includes("text/plain") && !ct.includes("application/xhtml")) {
            return NextResponse.json({ ok: true, url: parsed.toString(), title: null, image: null, description: null, siteName: null });
        }
        // Streaming o'qish, MAX_BYTES gacha
        const reader = res.body?.getReader();
        if (!reader) return NextResponse.json({ error: "no body" }, { status: 502 });
        const chunks: Uint8Array[] = [];
        let total = 0;
        while (total < MAX_BYTES) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            total += value.length;
        }
        try { await reader.cancel(); } catch {}
        const buf = new Uint8Array(total);
        let off = 0;
        for (const c of chunks) { buf.set(c, off); off += c.length; }
        const html = new TextDecoder("utf-8", { fatal: false }).decode(buf);

        const title = pickMeta(html, "og:title")
            || pickMeta(html, "twitter:title")
            || (html.match(/<title[^>]*>([\s\S]{1,200}?)<\/title>/i)?.[1]?.trim() ?? null);
        const image = normalizeUrl(parsed.toString(),
            pickMeta(html, "og:image") || pickMeta(html, "twitter:image"));
        const description = pickMeta(html, "og:description")
            || pickMeta(html, "twitter:description")
            || pickMeta(html, "description");
        const siteName = pickMeta(html, "og:site_name") || parsed.hostname;

        return NextResponse.json({
            ok: true,
            url: parsed.toString(),
            title: title ? decodeEntities(title).slice(0, 200) : null,
            image,
            description: description ? decodeEntities(description).slice(0, 300) : null,
            siteName: siteName ? decodeEntities(siteName).slice(0, 80) : null,
        });
    } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : "fetch_failed" }, { status: 502 });
    }
}
