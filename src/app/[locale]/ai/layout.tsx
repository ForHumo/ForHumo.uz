// Humo AI — o'z to'liq-ekran qobig'i (chat sahifasining o'z header'i bor).
// Modul-shell: fixed inset-0 z-[100] global header/footer'ni yopadi. Alohida navbar YO'Q
// (HumoAiNavbar olib tashlandi — chat header + sidebar + rejim menyusi yetarli).
import type { Metadata, Viewport } from "next";

// /ai/* — Humo AI ALOHIDA PWA/TWA (Google Play) identligi. Path-scoped manifest `/ai.webmanifest`.
// Favicon + PWA ikonalar public/ai-icons/* (bo'sh joysiz toza yo'l — Vercel Linux case-sensitive).
export const metadata: Metadata = {
    applicationName: "Humo AI",
    manifest: "/ai.webmanifest",
    icons: {
        icon: [
            { url: "/ai-icons/favicon.ico", sizes: "any" },
            { url: "/ai-icons/favicon-32x32.png", type: "image/png", sizes: "32x32" },
            { url: "/ai-icons/favicon-16x16.png", type: "image/png", sizes: "16x16" },
            { url: "/ai-icons/android-chrome-192x192.png", type: "image/png", sizes: "192x192" },
            { url: "/ai-icons/android-chrome-512x512.png", type: "image/png", sizes: "512x512" },
        ],
        apple: "/ai-icons/apple-touch-icon.png",
    },
    appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Humo AI" },
};

export const viewport: Viewport = {
    themeColor: "#0D0D0D",
    viewportFit: "cover",
};

export default function AiLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 z-[100] overflow-hidden bg-background">
            {children}
        </div>
    );
}
