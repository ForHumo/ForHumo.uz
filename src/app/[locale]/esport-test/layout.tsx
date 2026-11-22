import type { Metadata, Viewport } from "next";
import EtNavbar from "@/components/esport-test/et-navbar";
import { EsAuthModal } from "@/components/esport/es-auth-modal";
import { FlaskConical } from "lucide-react";
import "./esport-test.css";

export const metadata: Metadata = {
    title: "Humo eSport — Premium (test)",
    robots: { index: false, follow: false },  // test bo'limi indekslanmasin
};

export const viewport: Viewport = { themeColor: "#05070F", viewportFit: "cover" };

// Humo eSport PREMIUM test shell — global header/footer ustini yopadi, o'z arena navbari.
export default function EsportTestLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="et es-bg" style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", flexDirection: "column" }}>
            <EtNavbar />
            <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
                <div className="et-banner">
                    <div className="in">
                        <FlaskConical size={16} style={{ color: "var(--es-c2)", flex: "0 0 auto" }} />
                        <span><b>Premium test</b> — joriy eSport shu yangi dizaynда, haqiqiy ma'lumot bilan. Asl sayt: /esport. Yoqsa — shuni jonli qilamiz.</span>
                    </div>
                </div>
                <div style={{ maxWidth: 1100, margin: "0 auto", padding: "6px 18px 70px" }}>
                    {children}
                </div>
            </div>
            <EsAuthModal />
        </div>
    );
}
