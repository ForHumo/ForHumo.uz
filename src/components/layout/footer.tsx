"use client";

import { Link } from "@/i18n/routing";
import { Youtube, Send, Instagram } from "lucide-react";
import { useTranslations } from "next-intl";

export function Footer() {
    const t = useTranslations("Common");
    const currentYear = new Date().getFullYear();

    return (
        <footer className="w-full border-t border-border bg-background py-8">
            <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex flex-col md:flex-row items-center gap-4">
                    <div className="text-sm text-muted-foreground">
                        {t("copyright", { year: currentYear })}
                    </div>
                    <Link
                        href="/privacy-policy"
                        className="text-sm text-muted-foreground hover:text-primary transition-colors underline-offset-4 hover:underline"
                    >
                        {t("privacy_policy")}
                    </Link>
                </div>

                <div className="flex items-center gap-6">
                    <Link
                        href="https://t.me/ForHumo"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-[#0088cc] transition-colors"
                    >
                        <Send size={20} />
                        <span className="sr-only">Telegram</span>
                    </Link>
                    <Link
                        href="https://www.youtube.com/@forhumo"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-[#ff0000] transition-colors"
                    >
                        <Youtube size={20} />
                        <span className="sr-only">YouTube</span>
                    </Link>
                    <Link
                        href="https://www.instagram.com/forhumo"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-[#e4405f] transition-colors"
                    >
                        <Instagram size={20} />
                        <span className="sr-only">Instagram</span>
                    </Link>
                </div>
            </div>
        </footer>
    );
}
