import { setRequestLocale } from "next-intl/server";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { QrLoginApprove } from "@/components/security/qr-login-approve";
import { Link } from "@/i18n/routing";
import { LogIn } from "lucide-react";

export const metadata = { title: "Kirishga ruxsat | ForHumo.uz" };

export default async function Page({ params }: { params: Promise<{ locale: string; code: string }> }) {
    const { locale, code } = await params;
    setRequestLocale(locale);

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        // Kirmagan bo'lsa — Google login sahifasiga (callback bilan qaytadi)
        return (
            <div className="fixed inset-0 z-[100] overflow-hidden flex items-center justify-center p-6" style={{ background: "#050818" }}>
                <div className="relative w-full max-w-sm p-8 rounded-3xl text-center" style={{ background: "rgba(11,18,40,0.75)", border: "1px solid rgba(43,62,232,0.28)" }}>
                    <h1 className="text-lg font-black text-white mb-2">Avval kiring</h1>
                    <p className="text-xs text-white/70 mb-6">QR ni tasdiqlash uchun avval hisobingizga kirishingiz kerak.</p>
                    <Link href={`/`} className="w-full h-11 rounded-xl text-sm font-black text-white flex items-center justify-center gap-2"
                        style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                        <LogIn className="w-4 h-4" /> Kirish
                    </Link>
                </div>
            </div>
        );
    }

    // Kod tekshiruv
    const r = await prisma.authQrRequest.findUnique({
        where: { code },
        select: { code: true, status: true, deviceHint: true, expiresAt: true, createdAt: true },
    });
    if (!r) {
        return (
            <div className="fixed inset-0 z-[100] overflow-hidden flex items-center justify-center p-6" style={{ background: "#050818" }}>
                <div className="relative w-full max-w-sm p-8 rounded-3xl text-center" style={{ background: "rgba(11,18,40,0.75)", border: "1px solid rgba(43,62,232,0.28)" }}>
                    <h1 className="text-lg font-black text-white mb-2">Kod topilmadi</h1>
                    <p className="text-xs text-white/70">QR muddati o'tgan yoki noto'g'ri. Desktop'da yangi QR yarating.</p>
                </div>
            </div>
        );
    }

    // Statusga qarab
    if (r.status !== "PENDING" || r.expiresAt.getTime() < Date.now()) {
        return (
            <div className="fixed inset-0 z-[100] overflow-hidden flex items-center justify-center p-6" style={{ background: "#050818" }}>
                <div className="relative w-full max-w-sm p-8 rounded-3xl text-center" style={{ background: "rgba(11,18,40,0.75)", border: "1px solid rgba(43,62,232,0.28)" }}>
                    <h1 className="text-lg font-black text-white mb-2">
                        {r.status === "CONSUMED" ? "Allaqachon ishlatilgan" : r.status === "APPROVED" ? "Tasdiqlangan" : "Muddati o'tgan"}
                    </h1>
                    <p className="text-xs text-white/70">Desktop'da yangi QR yarating.</p>
                </div>
            </div>
        );
    }

    return <QrLoginApprove code={code} deviceHint={r.deviceHint} createdAt={r.createdAt.toISOString()} locale={locale} />;
}
