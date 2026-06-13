import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { Gamepad2, ArrowLeft } from "lucide-react";

// Vaqtinchalik — Humo eSport 0dan qayta qurilmoqda (docs/humo-esport-design.md).
// To'liq sahifalar (athlete/jamoa/divizion/turnir) keyingi qadamlarda quriladi.
export default async function EsportPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return (
        <main
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 px-6 text-center"
            style={{ background: "linear-gradient(160deg,#060A18 0%,#0B1226 55%,#0A0F22 100%)" }}
        >
            <div
                className="flex h-20 w-20 items-center justify-center rounded-3xl"
                style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}
            >
                <Gamepad2 className="h-10 w-10 text-white" />
            </div>
            <div>
                <h1 className="text-2xl font-black text-white">Humo eSport</h1>
                <p className="mt-2 text-sm font-semibold text-white/55">Yangidan qurilmoqda — tez orada</p>
            </div>
            <Link
                href="/"
                className="flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold text-white/80"
                style={{ background: "rgba(43,62,232,0.18)", border: "1px solid rgba(43,62,232,0.35)" }}
            >
                <ArrowLeft className="h-4 w-4" /> Bosh sahifa
            </Link>
        </main>
    );
}
