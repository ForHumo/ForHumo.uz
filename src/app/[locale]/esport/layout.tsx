import type { Metadata, Viewport } from "next";
import EsportNavbar from "@/components/esport/esport-navbar";
import { EsServiceWorker } from "@/components/esport/es-service-worker";

export function generateMetadata(): Metadata {
    return {
        title: "Humo eSport",  // tab: "Humo eSport | For Humo"
        applicationName: "Humo eSport",
        // Path-scoped PWA manifest (forhumo.uz/esport TWA) — root "For Humo" manifestidan alohida.
        manifest: "/esport.webmanifest",
        icons: {
            icon: [
                { url: "/esport/favicon.ico", sizes: "any" },
                { url: "/esport/icon-32.png", type: "image/png", sizes: "32x32" },
                { url: "/esport/icon-16.png", type: "image/png", sizes: "16x16" },
                { url: "/esport/icon-192.png", type: "image/png", sizes: "192x192" },
                { url: "/esport/icon-512.png", type: "image/png", sizes: "512x512" },
            ],
            apple: "/esport/apple-icon.png",
        },
        appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Humo eSport" },
    };
}

export const viewport: Viewport = {
    themeColor: "#070C1C",
    viewportFit: "cover",
};

// Humo eSport — global header/footer ustini yopadi, o'z navbari (tema + til + bo'limlar) bor.
export default function EsportLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 z-[100] flex flex-col es-bg">
            <EsportNavbar />
            <div className="flex-1 overflow-y-auto overflow-x-hidden nx-scrollbar">
                {children}
            </div>
            <EsServiceWorker />
        </div>
    );
}
