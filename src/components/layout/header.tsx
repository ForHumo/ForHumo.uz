"use client";

import { Link } from "@/i18n/routing";
import Image from "next/image";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageSwitcher } from "@/components/ui/language-switcher";

export function Header() {
    const [isOpen, setIsOpen] = useState(false);
    const t = useTranslations("Navigation");

    const primaryNavItems = [
        { name: t("home"), href: "/" },
        { name: t("projects"), href: "/#ecosystem" },
    ];

    const secondaryNavItems = [
        { name: t("nexus"), href: "/nexus" },
        { name: t("esport"), href: "/esport" },
        { name: t("market"), href: "/coming-soon" },
        { name: t("pay"), href: "/coming-soon" },
        { name: t("support"), href: "/coming-soon" },
    ];

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
            <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
                <div className="flex items-center gap-4">
                    <Link href="/" className="flex items-center gap-2">
                        <motion.div
                            whileHover={{ rotate: 10, scale: 1.1 }}
                            className="relative h-10 w-10 overflow-hidden rounded-full shadow-lg shadow-primary/20"
                        >
                            <Image
                                src="/logo.png"
                                alt="For Humo Logo"
                                fill
                                className="object-cover"
                                priority
                            />
                        </motion.div>
                        <span className="text-xl font-bold tracking-tight text-foreground hover:text-primary transition-colors hidden sm:block">
                            For Humo
                        </span>
                    </Link>
                </div>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center gap-1">
                    {primaryNavItems.map((item) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-all hover:translate-y-[-1px] px-3 py-1.5 rounded-md hover:bg-accent"
                        >
                            {item.name}
                        </Link>
                    ))}
                    <div className="h-5 w-[1px] bg-border/70 mx-2 flex-shrink-0" />
                    {secondaryNavItems.map((item) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-all hover:translate-y-[-1px] px-3 py-1.5 rounded-md hover:bg-accent"
                        >
                            {item.name}
                        </Link>
                    ))}
                    <div className="h-6 w-[1px] bg-border/60 mx-2" />
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <LanguageSwitcher />
                    </div>
                </nav>

                {/* Mobile Menu Button */}
                <div className="flex items-center gap-2 md:hidden">
                    <ThemeToggle />
                    <LanguageSwitcher />
                    <button
                        className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setIsOpen(!isOpen)}
                    >
                        {isOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* Mobile Navigation */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl overflow-hidden"
                    >
                        <nav className="flex flex-col p-4 gap-1">
                            {[...primaryNavItems, ...secondaryNavItems].map((item, index) => (
                                <motion.div
                                    key={item.name}
                                    initial={{ x: -20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <Link
                                        href={item.href}
                                        className="text-base font-medium text-foreground hover:text-primary transition-colors block py-2 px-3 rounded-md hover:bg-accent"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        {item.name}
                                    </Link>
                                </motion.div>
                            ))}
                        </nav>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
}
