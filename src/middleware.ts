import { NextResponse, type NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

// Muqobil domainlar — Host header ga qarab yashirin path prefix qo'shamiz.
// URL foydalanuvchi ko'zida o'zgarmaydi (rewrite, redirect emas).
// Bir kodbaza + bir Vercel deploy'dan bir necha brend domain xizmat qiladi.
const DOMAIN_PREFIXES: Record<string, string> = {
    "bozornarxida.uz": "/bn",
    "www.bozornarxida.uz": "/bn",
    // Kelajakda user rejasi bo'yicha (barcha bir deploy'dan):
    // "humoai.uz": "/ai",
    // "nexus.uz": "/nexus",
    // "humoesport.uz": "/esport",
    // "humomarket.uz": "/market",
};

const LOCALES = ["uz", "ru", "en"] as const;
const DEFAULT_LOCALE = "uz";

function stripPort(host: string): string {
    return host.split(":")[0].toLowerCase();
}

export default function middleware(req: NextRequest) {
    const host = stripPort(req.headers.get("host") || "");
    const prefix = DOMAIN_PREFIXES[host];

    if (prefix) {
        const url = req.nextUrl.clone();
        const path = url.pathname;

        // Path allaqachon locale bilanmi?
        const localeMatch = path.match(/^\/(uz|ru|en)(\/.*)?$/);
        if (localeMatch) {
            const locale = localeMatch[1];
            const rest = localeMatch[2] || "";
            // Ikki marta prefix qo'shilmasin
            if (!rest.startsWith(prefix)) {
                url.pathname = `/${locale}${prefix}${rest}`;
            }
        } else {
            // Locale yo'q — default locale + prefix qo'shamiz
            url.pathname = `/${DEFAULT_LOCALE}${prefix}${path === "/" ? "" : path}`;
        }
        return NextResponse.rewrite(url);
    }

    // Asosiy domen — standart next-intl rewrite
    return intlMiddleware(req);
}

export const config = {
    // API, next-static, favicon va fayllar (rasm/kss) middleware'dan tashqarida
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
