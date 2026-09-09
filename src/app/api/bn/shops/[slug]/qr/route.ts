// Do'kon uchun QR kod (SVG). Ushbu URL do'kon sahifasiga olib boradi:
//   https://bozornarxida.uz/d/<slug>?buy=1
// Foydalanuvchi skan qilsa "Xarid qildim" tugmasi bilan sahifa ochiladi.
//
//   GET /api/bn/shops/[slug]/qr           → SVG (print uchun)
//   GET /api/bn/shops/[slug]/qr?format=png → PNG (chop etish)

import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
    const { slug } = await ctx.params;
    const shop = await prisma.bnShop.findUnique({
        where: { slug },
        select: { id: true, name: true },
    });
    if (!shop) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const url = new URL(req.url);
    const target = `https://bozornarxida.uz/d/${slug}?buy=1&utm_source=qr&utm_medium=in_shop`;
    const format = url.searchParams.get("format") === "png" ? "png" : "svg";

    try {
        if (format === "png") {
            const buffer = await QRCode.toBuffer(target, {
                errorCorrectionLevel: "M",
                margin: 2,
                scale: 12,
                color: { dark: "#000000", light: "#FFFFFF" },
            });
            return new Response(new Uint8Array(buffer), {
                headers: {
                    "Content-Type": "image/png",
                    "Cache-Control": "public, max-age=3600, s-maxage=86400",
                    "Content-Disposition": `inline; filename="qr-${slug}.png"`,
                },
            });
        }
        const svg = await QRCode.toString(target, {
            type: "svg",
            errorCorrectionLevel: "M",
            margin: 2,
            width: 512,
            color: { dark: "#000000", light: "#FFFFFF" },
        });
        return new Response(svg, {
            headers: {
                "Content-Type": "image/svg+xml",
                "Cache-Control": "public, max-age=3600, s-maxage=86400",
            },
        });
    } catch (e) {
        console.error("[bn-qr]", e);
        return NextResponse.json({ error: "qr_generation_failed" }, { status: 500 });
    }
}
