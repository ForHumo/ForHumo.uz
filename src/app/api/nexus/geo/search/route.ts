// GET /api/nexus/geo/search?q=X — joy qidiruv (Nominatim + O'zbekiston bias)
// GET /api/nexus/geo/search?lat=..&lng=.. — reverse geocode
import { NextResponse } from "next/server";

interface GeoResult {
    name: string;
    lat: number;
    lng: number;
    city?: string;
    country?: string;
}

async function forward(q: string): Promise<GeoResult[]> {
    // O'zbekistonga xolisona bias — Toshkent viewbox
    // countrycodes=uz + acceptLanguage=uz
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", q);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "6");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("accept-language", "uz");
    try {
        const r = await fetch(url.toString(), {
            headers: { "User-Agent": "ForHumo.uz/1.0 (locations)" },
            next: { revalidate: 60 * 60 * 12 },
        });
        if (!r.ok) return [];
        const arr = await r.json() as Array<{
            display_name: string; lat: string; lon: string;
            address?: { city?: string; town?: string; village?: string; country?: string };
        }>;
        return arr.slice(0, 6).map(x => ({
            name: shortName(x.display_name),
            lat: Number(x.lat), lng: Number(x.lon),
            city: x.address?.city || x.address?.town || x.address?.village,
            country: x.address?.country,
        }));
    } catch { return []; }
}

async function reverse(lat: number, lng: number): Promise<GeoResult | null> {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    url.searchParams.set("format", "json");
    url.searchParams.set("accept-language", "uz");
    try {
        const r = await fetch(url.toString(), {
            headers: { "User-Agent": "ForHumo.uz/1.0 (reverse)" },
            next: { revalidate: 60 * 60 * 12 },
        });
        if (!r.ok) return null;
        const x = await r.json();
        return {
            name: shortName(x.display_name || ""),
            lat, lng,
            city: x.address?.city || x.address?.town || x.address?.village,
            country: x.address?.country,
        };
    } catch { return null; }
}

// Qisqa nom: "Chorsu bozori, Toshkent" uslubida (birinchi 3 qismni yig'ish)
function shortName(displayName: string): string {
    if (!displayName) return "";
    const parts = displayName.split(",").map(s => s.trim()).filter(Boolean);
    return parts.slice(0, 3).join(", ");
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const latS = searchParams.get("lat");
    const lngS = searchParams.get("lng");

    if (latS && lngS) {
        const lat = Number(latS), lng = Number(lngS);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
            const r = await reverse(lat, lng);
            return NextResponse.json({ result: r });
        }
        return NextResponse.json({ result: null });
    }

    if (!q || q.length < 2) return NextResponse.json({ results: [] });
    const results = await forward(q);
    return NextResponse.json({ results });
}
