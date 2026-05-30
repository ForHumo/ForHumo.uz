/**
 * ForHumo.uz — Edge Middleware
 *
 * Responsibilities (in order):
 *   1. i18n locale detection & routing (next-intl)
 *   2. Auth gate — unauthenticated users are redirected to home sign-in
 *   3. Admin shield — non-admin users cannot access admin routes
 *
 * Route classification:
 *   PUBLIC   — accessible without any token
 *   PROTECTED — requires a valid JWT (any authenticated user)
 *   ADMIN    — requires isAdmin === true in JWT
 */

import createMiddleware from "next-intl/middleware";
import { getToken }     from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { routing }      from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

// ── Route matchers ──────────────────────────────────────────────────────────

/** Routes that require isAdmin=true */
const ADMIN_ROUTES = [
    /^\/[^/]+\/esport\/admin(\/|$)/,
];

/**
 * Routes that require any valid session.
 * Everything else is public unless listed here.
 */
const PROTECTED_ROUTES = [
    /^\/[^/]+\/id\/edit(\/|$)/,
];

// ── Middleware ───────────────────────────────────────────────────────────────

export default async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    const isAdminRoute     = ADMIN_ROUTES.some(p => p.test(pathname));
    const isProtectedRoute = PROTECTED_ROUTES.some(p => p.test(pathname));

    if (isAdminRoute || isProtectedRoute) {
        const token = await getToken({
            req,
            secret: process.env.NEXTAUTH_SECRET,
        });

        if (!token) {
            // Not authenticated — redirect to locale root (sign-in overlay)
            const locale = pathname.split("/")[1] || "uz";
            const url    = req.nextUrl.clone();
            url.pathname = `/${locale}`;
            return NextResponse.redirect(url);
        }

        if (isAdminRoute && !token.isAdmin) {
            // Authenticated but not admin — send to esport home
            const locale = pathname.split("/")[1] || "uz";
            const url    = req.nextUrl.clone();
            url.pathname = `/${locale}/esport`;
            return NextResponse.redirect(url);
        }
    }

    // For all other routes: run i18n middleware only
    return intlMiddleware(req);
}

export const config = {
    // Match all paths except Next.js internals, static files, and API routes
    matcher: [
        "/((?!api|_next/static|_next/image|favicon\\.ico|.*\\..*).*)",
    ],
};
