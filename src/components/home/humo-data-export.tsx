"use client";

// GDPR ma'lumot eksport sahifasi - foydalanuvchi barcha ma'lumotini JSON tarzida yuklab oladi.

import { useState } from "react";
import { Link } from "@/i18n/routing";
import { Download, Shield, Loader2, Check, ArrowLeft, FileJson } from "lucide-react";

export function HumoDataExport() {
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);

    const handleExport = async () => {
        setBusy(true);
        try {
            const r = await fetch("/api/user/data-export");
            if (!r.ok) throw new Error("fail");
            const blob = await r.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const disposition = r.headers.get("Content-Disposition") || "";
            const match = disposition.match(/filename="?([^"]+)"?/);
            a.download = match?.[1] || `humo-data-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            setDone(true);
            setTimeout(() => setDone(false), 3000);
        } catch {
            alert("Yuklab olishda xatolik");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
            <div className="max-w-2xl mx-auto px-4 py-6">
                <div className="flex items-center gap-3 mb-5">
                    <Link href={"/id" as never}
                        className="w-10 h-10 rounded-xl grid place-items-center hover:bg-neutral-100 dark:hover:bg-neutral-800">
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                    <span className="w-10 h-10 rounded-xl grid place-items-center"
                        style={{ background: "linear-gradient(135deg, #3b82f6 0%, #10b981 100%)" }}>
                        <Shield className="w-5 h-5 text-white" />
                    </span>
                    <div>
                        <h1 className="text-[22px] font-black leading-tight">Ma'lumot eksport</h1>
                        <p className="text-[13px] text-neutral-500">GDPR - barcha ma'lumotni JSON tarzida yuklab oling</p>
                    </div>
                </div>

                {/* Info karta */}
                <div className="rounded-2xl p-5 mb-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                    <div className="flex items-start gap-3">
                        <FileJson className="w-6 h-6 text-blue-500 flex-shrink-0 mt-0.5" />
                        <div className="min-w-0">
                            <p className="text-[14px] font-black mb-1">Qanday ma'lumot bor?</p>
                            <ul className="text-[13px] text-neutral-600 dark:text-neutral-400 space-y-1">
                                <li>• Humo ID profil (nom, username, email, telefon, davlat)</li>
                                <li>• Login tarixi (oxirgi 100 kirish - IP, brauzer)</li>
                                <li>• BN buyurtmalar va sevimlilar</li>
                                <li>• BN do'konlar (agar sotuvchi bo'lsangiz)</li>
                                <li>• Belis rezervlar</li>
                                <li>• Market buyurtmalar va sharhlar</li>
                                <li>• Support tiketlar va xabarlar</li>
                                <li>• Nexus postlar</li>
                                <li>• Hamyon balans va tranzaksiyalar (500 tagacha)</li>
                            </ul>
                            <p className="text-[11.5px] text-neutral-500 mt-3">
                                Manzil (location) shifrlangan holda saqlanadi — eksport'da faqat "shifrlangan bor" belgisi ko'rsatiladi.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Xavfsizlik */}
                <div className="rounded-2xl p-4 mb-4 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-300">
                    <p className="text-[13px] font-bold text-yellow-800 dark:text-yellow-400">Xavfsizlik</p>
                    <p className="text-[12px] text-yellow-700 dark:text-yellow-400/85 mt-1">
                        Yuklangan fayl siz uchun. Boshqa hech kim ko'rmaydi. Faylni ehtiyot bilan saqlang — unda shaxsiy ma'lumot bor.
                    </p>
                </div>

                {/* Download tugma */}
                <button onClick={handleExport} disabled={busy}
                    className="w-full h-14 rounded-2xl inline-flex items-center justify-center gap-2 text-[15px] font-black text-white hover:brightness-95 disabled:opacity-60 transition"
                    style={{ background: done ? "#10b981" : "linear-gradient(135deg, #3b82f6, #10b981)" }}>
                    {busy ? <Loader2 className="w-5 h-5 animate-spin" />
                     : done ? <Check className="w-5 h-5" />
                     : <Download className="w-5 h-5" />}
                    {busy ? "Tayyorlanmoqda..." : done ? "Yuklandi!" : "Barcha ma'lumotni yuklab olish"}
                </button>

                <p className="text-center text-[11px] text-neutral-500 mt-3">
                    Fayl JSON formatida. Chuqur tahlil uchun VS Code yoki Notepad+ da ochish tavsiya etiladi.
                </p>
            </div>
        </div>
    );
}
