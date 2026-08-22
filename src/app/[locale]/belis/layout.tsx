import { setRequestLocale } from "next-intl/server";
import { BelisNav } from "@/components/belis/belis-nav";
import { BELIS, BELIS_BG_GRADIENT } from "@/lib/belis-theme";

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
            {/* Google Fonts — belis-specific */}
            <link
                rel="stylesheet"
                href="https://fonts.googleapis.com/css2?family=Great+Vibes&family=Playfair+Display:wght@400;700&family=Montserrat:wght@300;400;500;700&display=swap"
            />
            <div className="min-h-full flex flex-col">
                <BelisNav />
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
        <footer className="mt-16 py-8 border-t"
            style={{
                borderColor: BELIS.border,
                background: BELIS.surface,
                fontFamily: "'Montserrat', sans-serif",
            }}>
            <div className="max-w-6xl mx-auto px-4 text-center">
                <p style={{
                    fontFamily: "'Great Vibes', cursive",
                    fontSize: 32,
                    color: BELIS.gold,
                    lineHeight: 1,
                }}>Belis</p>
                <p className="text-xs mt-2 italic" style={{ color: BELIS.text2 }}>
                    Siz uchun, mehr bilan…
                </p>
                <p className="text-[10px] mt-3" style={{ color: BELIS.text3 }}>
                    © Belis · For Humo tarkibida ·
                    <a href="https://t.me/belisuz" target="_blank" rel="noopener" className="mx-1 hover:opacity-70" style={{ color: BELIS.gold }}>@belisuz</a> ·
                    <a href="https://instagram.com/belis.uz" target="_blank" rel="noopener" className="mx-1 hover:opacity-70" style={{ color: BELIS.gold }}>Instagram</a>
                </p>
            </div>
        </footer>
    );
}
