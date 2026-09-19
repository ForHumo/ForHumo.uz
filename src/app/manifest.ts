// Dinamik web manifest — host'ga qarab BN yoki asosiy For Humo PWA'sini qaytaradi.
// bozornarxida.uz'da PWA "Bozor Narxida" bo'lib alohida o'rnatilishi mumkin.
import type { MetadataRoute } from "next";
import { headers } from "next/headers";

const BN_HOSTS = new Set(["bozornarxida.uz", "www.bozornarxida.uz"]);

export default async function manifest(): Promise<MetadataRoute.Manifest> {
    const host = (await headers()).get("host")?.split(":")[0].toLowerCase() ?? "";
    const isBn = BN_HOSTS.has(host);

    if (isBn) {
        return {
            name: "Bozor Narxida",
            short_name: "BN",
            description:
                "O'zbekiston bozorlari va do'konlari onlayn. Har mahsulot narxi bozor o'rtachasi bilan solishtiriladi.",
            start_url: "/",
            scope: "/",
            display: "standalone",
            orientation: "portrait",
            background_color: "#17171B",
            theme_color: "#17171B",
            lang: "uz",
            icons: [
                // TWA/Play uchun aniq o'lchamli ikonalar (avval favicon.png=64, apple-icon=180
                // noto'g'ri 192/512 deb e'lon qilingandi → installability/ikona generatsiyasi buzilardi).
                { src: "/bn/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
                { src: "/bn/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
                { src: "/bn/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
            ],
            categories: ["shopping", "business", "lifestyle"],
        };
    }

    return {
        name: "For Humo",
        short_name: "For Humo",
        description: "Yagona Humo ID bilan barcha modullar: ID, Esport, Market, Nexus, Pay, AI, Bozor Narxida.",
        start_url: "/",
        display: "standalone",
        background_color: "#0a0a0a",
        theme_color: "#0a0a0a",
        lang: "uz",
        icons: [
            { src: "/logo.png", sizes: "512x512", type: "image/png", purpose: "any" },
        ],
    };
}
