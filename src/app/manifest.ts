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
            // id — PWA identligini barqaror qiladi (start_url o'zgarsa ham "bir xil ilova").
            // Chrome/Play shu bilan ilovani taniydi; TWA update'da muhim.
            id: "/",
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
                // Maskable ALOHIDA fayl — logo safe-zone (markaziy 60%) ichida, oq fon bilan.
                // Avval to'liq-chetgacha icon-512 maskable deb berilgandi → Android adaptiv
                // ikonada (doira/squircle niqob) burchaklari kesilardi. Bubblewrap aynan shu
                // maskable'ni Play launcher ikonasiga ishlatadi.
                { src: "/bn/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
            ],
            categories: ["shopping", "business", "lifestyle"],
        };
    }

    // For Humo super-app — TWA (Google Play) tayyor. scope "/" — butun ekotizim
    // (ID, Esport, Market, Nexus, Pay, AI, Support, Bozor Narxida) ilova ichida ochiladi.
    // Bir host'da eSport/Nexus TWA'lari ham bor (path-scoped) — bular alohida ilova; bu esa
    // "hammasi bitta" super-app. assetlinks uchalasini ham tasdiqlaydi.
    return {
        // id "/" — barqaror PWA/TWA identligi (start_url o'zgarsa ham "bir xil ilova").
        id: "/",
        name: "For Humo",
        short_name: "For Humo",
        description: "Yagona Humo ID bilan barcha modullar: ID, Esport, Market, Nexus, Pay, AI, Support, Bozor Narxida.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#0A0E1A",
        theme_color: "#0A0E1A",
        lang: "uz",
        icons: [
            { src: "/forhumo/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
            { src: "/forhumo/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
            // Maskable ALOHIDA — "F" belgisi safe-zone (markaziy ~62%) ichida, dark fon
            // (Android adaptiv niqob burchaklarini kesmasin). Bubblewrap shuni launcher ikonasiga oladi.
            { src: "/forhumo/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        categories: ["social", "lifestyle", "productivity"],
    };
}
