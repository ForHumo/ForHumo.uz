"use client";

import { useEffect, useRef } from "react";

// Telegram Login Widget tugmasi (BEPUL). Telegram'ning rasmiy skripti
// telegram-widget.js tugmani iframe sifatida chizadi; foydalanuvchi bir bosib
// kirganda `data-onauth` chaqiradi va biz onAuth(user) ga payload'ni beramiz.
//
// SHARTLAR:
//  - bot = @YukGo_tgbot username (@ siz)
//  - BotFather'da shu bot uchun /setdomain = forhumo.uz sozlangan bo'lishi SHART,
//    aks holda tugma chizilmaydi.

type TgUser = Record<string, unknown>;

export function TgLoginButton({
    bot,
    onAuth,
    lang = "uz",
}: {
    bot: string;
    onAuth: (u: TgUser) => void;
    lang?: string;
}) {
    const ref = useRef<HTMLDivElement>(null);
    // onAuth identitet o'zgarsa ham skriptni qayta chizmaslik uchun ref orqali
    const cb = useRef(onAuth);
    cb.current = onAuth;

    useEffect(() => {
        const node = ref.current;
        if (!node) return;
        const cbName = "__tgAuth_" + Math.random().toString(36).slice(2);
        (window as unknown as Record<string, unknown>)[cbName] = (u: TgUser) => cb.current(u);

        const s = document.createElement("script");
        s.src = "https://telegram.org/js/telegram-widget.js?22";
        s.async = true;
        s.setAttribute("data-telegram-login", bot);
        s.setAttribute("data-size", "large");
        s.setAttribute("data-radius", "12");
        s.setAttribute("data-request-access", "write");
        s.setAttribute("data-userpic", "false");
        s.setAttribute("data-lang", lang);
        s.setAttribute("data-onauth", `${cbName}(user)`);
        node.appendChild(s);

        return () => {
            try { delete (window as unknown as Record<string, unknown>)[cbName]; } catch { /* */ }
            node.innerHTML = "";
        };
    }, [bot, lang]);

    return <div ref={ref} className="flex justify-center" />;
}
