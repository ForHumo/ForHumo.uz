import { setRequestLocale } from "next-intl/server";
import { BelisHeader } from "@/components/belis/belis-nav";
import { BelisTestBanner } from "@/components/belis/belis-test-banner";
import { BELIS, BELIS_BG_GRADIENT, BELIS_SOCIAL } from "@/lib/belis-theme";
import type { Metadata } from "next";

export const metadata: Metadata = {
    icons: {
        icon: [
            { url: "/belis/favicon_io/favicon-32x32.png", sizes: "32x32", type: "image/png" },
            { url: "/belis/favicon_io/favicon-16x16.png", sizes: "16x16", type: "image/png" },
        ],
        apple: [{ url: "/belis/favicon_io/apple-touch-icon.png" }],
        shortcut: "/belis/favicon_io/favicon.ico",
    },
};

// Belis modul shell — global header/footer'ni yopadi (fixed inset-0 z-[100]).
// Fon: light-olive gradient (kunduz mode). Kech mode kelajakda.
export default async function BelisLayout({
    children, params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    setRequestLocale(locale);

    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto"
            style={{
                background: BELIS_BG_GRADIENT,
                color: BELIS.text,
                fontFamily: "'Montserrat', system-ui, sans-serif",
            }}>
            <link rel="stylesheet"
                href="https://fonts.googleapis.com/css2?family=Great+Vibes&family=Playfair+Display:wght@400;700&family=Montserrat:wght@300;400;500;700&display=swap"
            />
            <div className="min-h-full flex flex-col">
                <BelisTestBanner />
                <BelisHeader />
                <main className="flex-1">
                    {children}
                </main>
                <BelisFooter />
            </div>
        </div>
    );
}

function BelisFooter() {
    return (
        <footer className="mt-16 py-8"
            style={{
                borderTop: `1px solid ${BELIS.border}`,
                background: BELIS.surface,
                fontFamily: "'Montserrat', sans-serif",
            }}>
            <div className="max-w-7xl mx-auto px-4 text-center">
                {/* Belis logo (rasm) */}
                <div className="flex justify-center mb-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/belis/belis.png" alt="Belis" className="h-14 w-auto object-contain opacity-90" />
                </div>
                <p className="text-xs italic" style={{ color: BELIS.text2 }}>
                    Siz uchun, mehr bilan…
                </p>

                {/* Ijtimoiy */}
                <div className="mt-4 flex justify-center gap-4 text-xs" style={{ color: BELIS.text2 }}>
                    <a href={BELIS_SOCIAL.telegramChannel} target="_blank" rel="noopener" className="hover:underline" style={{ color: BELIS.gold }}>@belisuz</a>
                    <span>·</span>
                    <a href={BELIS_SOCIAL.instagram} target="_blank" rel="noopener" className="hover:underline" style={{ color: BELIS.gold }}>Instagram</a>
                    <span>·</span>
                    <a href={BELIS_SOCIAL.telegramBot} target="_blank" rel="noopener" className="hover:underline" style={{ color: BELIS.gold }}>Bot</a>
                </div>

                <p className="text-[10px] mt-3" style={{ color: BELIS.text3 }}>
                    © Belis {new Date().getFullYear()}
                </p>

                {/* Powered by For Humo */}
                <div className="mt-6 pt-4" style={{ borderTop: `1px solid ${BELIS.borderSoft}` }}>
                    <a href="/" className="inline-flex items-center gap-2 opacity-70 hover:opacity-100 transition">
                        <span className="text-[10px] uppercase tracking-widest" style={{ color: BELIS.text3 }}>Powered by</span>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/logos/forhumo.png" alt="For Humo" className="h-4 w-auto object-contain" />
                    </a>
                </div>
            </div>
        </footer>
    );
}
