"use client";

import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';

export default function NotFound() {
    const t = useTranslations("Common");

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 text-center gap-5">
            {/* Ummi mascot — oq kartada (rasm foni oq, kartaga qo'shilib ketadi) */}
            <div className="w-40 h-40 rounded-[28px] bg-white grid place-items-center overflow-hidden"
                style={{ boxShadow: "0 14px 44px rgba(29,119,222,0.20)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/mascot/ummi.webp" alt="Ummi" className="w-36 h-36 object-contain select-none" draggable={false} />
            </div>
            <div>
                <h2 className="text-5xl font-black mb-1">404</h2>
                <p className="text-muted-foreground">{t("under_dev")}</p>
            </div>
            <Link href="/" className="px-6 py-3 bg-primary text-primary-foreground rounded-full font-bold hover:bg-primary/90 transition-colors">
                {t("back_home")}
            </Link>
        </div>
    );
}
