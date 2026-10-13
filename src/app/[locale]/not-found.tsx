"use client";

import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { UmmiPose } from '@/components/ummi/ummi-pose';
import { UMMI } from '@/lib/ummi-poses';

export default function NotFound() {
    const t = useTranslations("Common");

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 text-center gap-5">
            {/* Ummi — shaffof poza, holatga mos ("?" / topilmadi) */}
            <UmmiPose pose={UMMI.question} size={176} className="w-44 h-44" priority />
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
