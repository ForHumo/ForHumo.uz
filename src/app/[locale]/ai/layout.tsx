// Humo AI — o'z to'liq-ekran qobig'i (chat sahifasining o'z header'i bor).
// Modul-shell: fixed inset-0 z-[100] global header/footer'ni yopadi. Alohida navbar YO'Q
// (HumoAiNavbar olib tashlandi — chat header + sidebar + rejim menyusi yetarli).
import type { Metadata } from "next";

// /ai/* sahifalari uchun Humo AI favicon (public/ai-icons/*). Bo'sh joysiz toza yo'l —
// Vercel (Linux) case-sensitive; papka "AI" bilan chalkashmasin.
export const metadata: Metadata = {
    icons: {
        icon: [
            { url: "/ai-icons/favicon.ico", sizes: "any" },
            { url: "/ai-icons/favicon-32x32.png", type: "image/png", sizes: "32x32" },
            { url: "/ai-icons/favicon-16x16.png", type: "image/png", sizes: "16x16" },
        ],
        apple: "/ai-icons/apple-touch-icon.png",
    },
};

export default function AiLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 z-[100] overflow-hidden bg-background">
            {children}
        </div>
    );
}
