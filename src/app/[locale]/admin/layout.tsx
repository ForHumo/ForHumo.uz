import { requireFounder } from "@/lib/admin-guard";
import { Link } from "@/i18n/routing";
import { ShieldCheck, ArrowLeft, Lock } from "lucide-react";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const founder = await requireFounder();

    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto overflow-x-hidden
            bg-gradient-to-br from-slate-50 via-white to-slate-100
            dark:from-[#0A0A0F] dark:via-[#070710] dark:to-[#0A0A14]">

            {/* Admin navbar */}
            <header className="sticky top-0 z-20 backdrop-blur-xl bg-white/70 dark:bg-black/40
                border-b border-gray-200/70 dark:border-white/[0.06]">
                <div className="container mx-auto px-4 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-800 to-slate-600 dark:from-slate-200 dark:to-slate-400 flex items-center justify-center">
                            <ShieldCheck size={17} className="text-white dark:text-black" />
                        </div>
                        <div className="leading-tight">
                            <div className="text-sm font-black text-gray-900 dark:text-white">ForHumo Admin</div>
                            <div className="text-[10px] text-gray-400 dark:text-white/30">Moderatsiya markazi</div>
                        </div>
                    </div>
                    <Link href="/" className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-white/40 hover:text-gray-900 dark:hover:text-white transition-colors">
                        <ArrowLeft size={14} /> Asosiy
                    </Link>
                </div>
            </header>

            <main className="container mx-auto px-4 py-6">
                {founder ? children : (
                    <div className="max-w-md mx-auto mt-20 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                            <Lock size={26} className="text-red-500" />
                        </div>
                        <h1 className="text-lg font-black text-gray-900 dark:text-white">Ruxsat yo'q</h1>
                        <p className="text-sm text-gray-500 dark:text-white/40 mt-1">Bu bo'lim faqat ForHumo administratorlari uchun.</p>
                        <Link href="/" className="inline-block mt-5 px-5 py-2.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-black text-sm font-bold">
                            Asosiy sahifa
                        </Link>
                    </div>
                )}
            </main>
        </div>
    );
}
