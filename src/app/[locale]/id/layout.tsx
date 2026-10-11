import type { Metadata } from "next";
import { HumoIdNavbar } from "@/components/id/humo-id-navbar";

// Humo ID — favicon + PWA ikonalar public/id-icons/* (bo'sh joysiz toza yo'l).
export const metadata: Metadata = {
    title: "Humo ID",  // tab: "Humo ID | For Humo"
    applicationName: "Humo ID",
    icons: {
        icon: [
            { url: "/id-icons/favicon.ico", sizes: "any" },
            { url: "/id-icons/icon-32.png", type: "image/png", sizes: "32x32" },
            { url: "/id-icons/icon-16.png", type: "image/png", sizes: "16x16" },
            { url: "/id-icons/icon-192.png", type: "image/png", sizes: "192x192" },
            { url: "/id-icons/icon-512.png", type: "image/png", sizes: "512x512" },
        ],
        apple: "/id-icons/apple-icon.png",
    },
};

export default function IdLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto overflow-x-hidden bg-background">
            <HumoIdNavbar />
            <main>{children}</main>
        </div>
    );
}
