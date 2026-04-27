import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Shield } from "lucide-react";

export default async function PrivacyPolicy({
    params
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = useTranslations("Privacy");

    return (
        <div className="min-h-screen pt-24 pb-16">
            <div className="container mx-auto px-4 max-w-4xl">
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                        <Shield size={32} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-bold">{t("title")}</h1>
                        <p className="text-muted-foreground">{t("last_updated")}</p>
                    </div>
                </div>

                <div className="prose prose-invert max-w-none space-y-12">
                    <section className="bg-card/50 backdrop-blur-xl border border-border p-8 rounded-3xl">
                        <p className="text-lg leading-relaxed">
                            {t("intro")}
                        </p>
                    </section>

                    <div className="grid gap-8">
                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold text-primary">{t("section1_title")}</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                {t("section1_content")}
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold text-primary">{t("section2_title")}</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                {t("section2_content")}
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold text-primary">{t("section3_title")}</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                {t("section3_content")}
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold text-primary">{t("section4_title")}</h2>
                            <div className="bg-primary/5 border border-primary/20 p-6 rounded-2xl">
                                <p className="text-muted-foreground leading-relaxed">
                                    {t("section4_content")}
                                </p>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}
