import { setRequestLocale } from "next-intl/server";
import type { Metadata, Viewport } from "next";

// PWA: alohida YukGo ilova identligi (manifest + ikonkalar). Page.tsx title/desc beradi.
export const metadata: Metadata = {
    manifest: "/yukgo.webmanifest",
    appleWebApp: { capable: true, title: "YukGo", statusBarStyle: "black-translucent" },
    icons: {
        icon: [{ url: "/yukgo/icon-192.png", sizes: "192x192", type: "image/png" }],
        apple: [{ url: "/yukgo/apple-touch-icon.png", sizes: "180x180" }],
    },
};
export const viewport: Viewport = { themeColor: "#0A0F1E" };

// YukGo moduli — o'z overlay shell'i (global header/footer'ni yopadi, opaque fon)
export default async function YukGoLayout({
    children, params,
}: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto" style={{ background: "#0A0F1E", color: "#E8EDF7" }}>
            {children}
        </div>
    );
}
