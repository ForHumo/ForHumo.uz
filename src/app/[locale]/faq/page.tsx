import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { ArrowLeft, ChevronDown } from "lucide-react";
import type { Metadata } from "next";

const FAQ_KEYS = ["1","2","3","4","5","6","7","8"] as const;

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "FAQ" });
    return { title: `${t("title")} • For Humo` };
}

export default async function FAQPage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "FAQ" });

    return (
        <div className="min-h-screen py-10 px-4">
            <div className="max-w-2xl mx-auto space-y-6">

                <Link href="/id"
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft size={15} />
                    {t("back")}
                </Link>

                <div>
                    <h1 className="text-2xl font-black text-foreground">{t("title")}</h1>
                    <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
                </div>

                <div className="space-y-3">
                    {FAQ_KEYS.map(k => (
                        <details
                            key={k}
                            className="group rounded-2xl border border-border bg-card open:border-primary/30 open:bg-primary/5 transition-colors"
                        >
                            <summary className="flex items-center justify-between gap-4 px-5 py-4 text-left cursor-pointer list-none select-none">
                                <span className="text-sm font-semibold text-foreground">
                                    {t(`q${k}` as `q${typeof k}`)}
                                </span>
                                <ChevronDown
                                    size={16}
                                    className="shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                                />
                            </summary>
                            <div className="px-5 pb-4">
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    {t(`a${k}` as `a${typeof k}`)}
                                </p>
                            </div>
                        </details>
                    ))}
                </div>

                <div className="rounded-2xl border border-border bg-card px-5 py-4 flex items-center justify-between gap-4">
                    <div>
                        <p className="text-sm font-semibold text-foreground">{t("no_answer")}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{t("support_hint")}</p>
                    </div>
                    <Link href="/support"
                        className="flex-shrink-0 text-xs font-bold px-4 py-2 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
                        {t("support_btn")}
                    </Link>
                </div>

            </div>
        </div>
    );
}
