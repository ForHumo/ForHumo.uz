import { setRequestLocale } from "next-intl/server";

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
