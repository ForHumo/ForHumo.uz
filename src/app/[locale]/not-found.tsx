"use client";

import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';

export default function NotFound() {
    const t = useTranslations("Common");

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 text-center gap-5">
            {/* Ummi mascot — shaffof fon, to'g'ridan (istalgan fonda ishlaydi) */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/mascot/ummi.webp" alt="Ummi" className="w-44 h-44 object-contain select-none"
                draggable={false} style={{ filter: "drop-shadow(0 12px 28px rgba(29,119,222,0.22))" }} />
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
