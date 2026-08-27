// GET /api/nexus/link-preview?url=... — OG metadata olish
// Sessiyali foydalanuvchi uchun (Nexus'da xabar preview kartochkasi).
// Cache: 24 soat.
// Server-side fetch: SSRF himoyasi — faqat http/https, xususiy IP'lar bloklangan.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const MAX_HTML_BYTES = 512 * 1024; // 512KB
const FETCH_TIMEOUT_MS = 4500;

function isPrivateHost(host: string): boolean {
    const h = host.toLowerCase();
    if (h === "localhost" || h.endsWith(".localhost")) return true;
    // IPv4 xususiy va loopback
    const m = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (m) {
        const [a, b] = [parseInt(m[1], 10), parseInt(m[2], 10)];
        if (a === 10) return true;
        if (a === 127) return true;
        if (a === 0) return true;
        if (a === 169 && b === 254) return true;
        if (a === 172 && b >= 16 && b <= 31) return true;
        if (a === 192 && b === 168) return true;
    }
    // IPv6 loopback/link-local rudimentar tekshirish
    if (h === "::1" || h.startsWith("fe80::") || h.startsWith("fc") || h.startsWith("fd")) return true;
    return false;
}

function extractMeta(html: string, url: URL): {
    title: string | null;
    description: string | null;
    image: string | null;
    site: string | null;
} {
    // Faqat <head> qismi
    const head = html.slice(0, MAX_HTML_BYTES);
    function pick(prop: string): string | null {
        // og:xxx yoki name="xxx"
        const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']+)["']`, "i");
        const m = head.match(re);
        if (m) return m[1];
        // reverse order (content oldin, property keyin)
        const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${prop}["']`, "i");
        const m2 = head.match(re2);
        return m2 ? m2[1] : null;
    }
    const ogTitle = pick("og:title") ?? pick("twitter:title");
    const titleTag = head.match(/<title[^>]*>([^<]{1,200})<\/title>/i);
    const title = ogTitle ?? (titleTag ? titleTag[1] : null);
    const description = pick("og:description") ?? pick("twitter:description") ?? pick("description");
    let image = pick("og:image") ?? pick("twitter:image");
    if (image && !/^https?:\/\//i.test(image)) {
        try { image = new URL(image, url).toString(); } catch { image = null; }
    }
    const siteName = pick("og:site_name") ?? url.hostname.replace(/^www\./, "");
    return {
        title: title?.trim().slice(0, 200) ?? null,
        description: description?.trim().slice(0, 400) ?? null,
        image: image?.slice(0, 800) ?? null,
        site: siteName?.slice(0, 100) ?? null,
    };
}

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rawUrl = new URL(req.url).searchParams.get("url");
    if (!rawUrl) return NextResponse.json({ error: "url kerak" }, { status: 400 });

    let target: URL;
    try {
        target = new URL(rawUrl);
    } catch {
        return NextResponse.json({ error: "URL noto'g'ri" }, { status: 400 });
    }
    if (target.protocol !== "http:" && target.protocol !== "https:") {
        return NextResponse.json({ error: "Faqat http/https" }, { status: 400 });
    }
    if (isPrivateHost(target.hostname)) {
        return NextResponse.json({ error: "Xususiy manzil" }, { status: 400 });
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
        const res = await fetch(target.toString(), {
            signal: ctrl.signal,
            redirect: "follow",
            headers: { "User-Agent": "HumoNexusPreview/1.0 (+https://forhumo.uz)" },
        });
        clearTimeout(timer);
        const ct = res.headers.get("content-type") ?? "";
        if (!ct.includes("html")) return NextResponse.json({ error: "HTML emas" }, { status: 400 });

        const reader = res.body?.getReader();
        if (!reader) return NextResponse.json({ error: "body yo'q" }, { status: 400 });
        const chunks: Uint8Array[] = [];
        let total = 0;
        while (total < MAX_HTML_BYTES) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            total += value.length;
        }
        try { await reader.cancel(); } catch {}
        const buf = Buffer.concat(chunks);
        const html = buf.toString("utf-8");
        const meta = extractMeta(html, target);
        return NextResponse.json({
            url: target.toString(),
            ...meta,
        }, {
            headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
        });
    } catch {
        return NextResponse.json({ error: "Fetch xato" }, { status: 500 });
    } finally {
        clearTimeout(timer);
    }
}
