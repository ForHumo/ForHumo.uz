import { NextResponse } from "next/server";

// Humo AI — path-scoped PWA manifest (forhumo.uz/ai TWA uchun).
// Root `/manifest.webmanifest` "For Humo" super-app manifestini beradi; bu esa ALOHIDA
// "Humo AI" ilova identligi (eSport/Nexus kabi). AI layout shunga link qiladi (`manifest: "/ai.webmanifest"`).
// Bubblewrap init shu URL bilan: `https://forhumo.uz/ai.webmanifest`.
// Middleware `.`-li yo'llarni chetlab o'tadi → bu forhumo.uz'da rewrite'siz beriladi.
// MUHIM: forhumo.uz (For Humo + eSport + Nexus) bilan BIR host — assetlinks.json AI TWA'ni ham ro'yxatlaydi.
export const dynamic = "force-static";

export function GET() {
    return NextResponse.json(
        {
            // id — "For Humo" root (id "/"), eSport (/uz/esport), Nexus (/uz/nexus) dan ALOHIDA identlik.
            id: "/uz/ai",
            name: "Humo AI",
            short_name: "Humo AI",
            description: "Humo AI — For Humo sun'iy intellekt yordamchisi: barcha modul bo'yicha yordam, ovozli suhbat (Humo Live), rasm va bilim.",
            // TWA kirish nuqtasi — kanonik (redirect'siz) chat sahifasi.
            start_url: "/uz/ai/chat",
            // scope "/" — AI ichidagi Pay/ID/boshqa havolalar ham ilovada ochilsin.
            scope: "/",
            display: "standalone",
            orientation: "portrait",
            // Humo AI monoxrom qora brend foni (splash/status doim brend; UI dark/light adaptiv).
            background_color: "#0D0D0D",
            theme_color: "#0D0D0D",
            lang: "uz",
            icons: [
                { src: "/ai-icons/android-chrome-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
                { src: "/ai-icons/android-chrome-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
                // Maskable ALOHIDA — belgi safe-zone (markaziy ~80%) ichida, to'liq oq fon
                // (Android adaptiv niqob burchaklarini kesmasin). Bubblewrap shuni launcher ikonasiga oladi.
                { src: "/ai-icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
            ],
            categories: ["productivity", "utilities"],
        },
        { headers: { "Content-Type": "application/manifest+json" } },
    );
}
