import type { Metadata, Viewport } from "next";
import EtNavbar from "@/components/esport-test/et-navbar";
import { EsServiceWorker } from "@/components/esport/es-service-worker";
import { EsAuthModal } from "@/components/esport/es-auth-modal";
import "../esport-test/esport-test.css";

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

// Humo eSport — PREMIUM dizayn (et-*). Global header/footer ustini yopadi, o'z arena navbari.
export default function EsportLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="et es-bg" style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", flexDirection: "column" }}>
            <EtNavbar />
            <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
                <div style={{ maxWidth: 1100, margin: "0 auto", padding: "6px 18px 70px" }}>
                    {children}
                </div>
            </div>
            <EsAuthModal />
            <EsServiceWorker />
        </div>
    );
}
