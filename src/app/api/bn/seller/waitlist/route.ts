// Sotuvchi WAITLIST — MChJ ochilishidan oldin sotuvchi arizasi.
// Login shart emas (ochiq forma — kimdir keladi va telefon qoldiradi).
//
//   POST /api/bn/seller/waitlist   body: { name, phone, marketSlug?, category?, note?, source?, ref? }
//   Rate limit: bitta IP+telefon 24 soatda 3 marta (spam himoyasi).

import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { getBnAuth } from "@/lib/bn-auth";
import { grantAchievement } from "@/lib/achievements";

const PHONE_RE = /^\+998\d{9}$/;
const MAX_PER_PHONE_24H = 3;
// IP-based spam himoyasi: turli telefon nomerlari bilan bo'lsa ham bitta IP
// 24 soatda maksimum 10 ta yozuv yaratishi mumkin. Bosh sahifada test paytida
// 8 soxta yozuv bir sekundda yaratilishi mumkin edi — endi bloklanadi.
const MAX_PER_IP_24H = 10;

function getClientIp(req: Request): string {
    // Vercel'ning ishonchli header'i — user tomonidan override qilib bo'lmaydi
    // (Vercel edge har request'ni yangilaydi).
    const vercel = req.headers.get("x-vercel-forwarded-for");
    if (vercel) return vercel.split(",")[0].trim();
    // Fallback: x-forwarded-for OXIRGI IP — Vercel/CDN client IP'ni oxiriga
    // APPEND qiladi. User o'zi yozgan birinchi IP soxta bo'lishi mumkin.
    // (Ilgari birinchi IP'ni olardik — X-Forwarded-For spoofing xavfi edi.)
    const xff = req.headers.get("x-forwarded-for");
    if (xff) {
        const parts = xff.split(",").map(s => s.trim()).filter(Boolean);
        if (parts.length > 0) return parts[parts.length - 1];
    }
    const real = req.headers.get("x-real-ip");
    if (real) return real.trim();
    return "unknown";
}

function normalizePhone(raw: string): string {
    // Faqat raqamlar
    const digits = raw.replace(/\D/g, "");
    if (digits.startsWith("998") && digits.length === 12) return `+${digits}`;
    if (digits.length === 9) return `+998${digits}`;
    return raw.trim();
}

export async function POST(req: Request) {
    const body = await req.json().catch(() => ({}));
    const name = String(body?.name ?? "").trim().slice(0, 120);
    const phone = normalizePhone(String(body?.phone ?? ""));
    const marketSlug = body?.marketSlug ? String(body.marketSlug).trim().slice(0, 100) : null;
    const category = body?.category ? String(body.category).trim().slice(0, 60) : null;
    const note = body?.note ? String(body.note).trim().slice(0, 500) : null;
    const source = body?.source ? String(body.source).trim().slice(0, 80) : null;
    const ref = body?.ref ? String(body.ref).trim().toLowerCase().replace(/^@/, "").slice(0, 60) : null;
    const city = String(body?.city ?? "Toshkent").trim().slice(0, 40);

    if (name.length < 2) {
        return NextResponse.json({ error: "invalid_name" }, { status: 400 });
    }
    if (!PHONE_RE.test(phone)) {
        return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
    }

    // Rate-limit: shu telefondan 24 soatda
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCount = await prisma.bnSellerWaitlist.count({
        where: { phone, createdAt: { gte: dayAgo } },
    }).catch(() => 0);
    if (recentCount >= MAX_PER_PHONE_24H) {
        return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
    }

    // IP-based rate limit — turli telefon nomerlari bilan spam qiluvchilarga qarshi.
    // Ilgari attacker random telefon generatsiya qilib DB'ni to'ldirishi mumkin edi.
    const ip = getClientIp(req);
    const ipHash = ip === "unknown" ? null : createHash("sha256").update(ip).digest("hex").slice(0, 40);
    if (ipHash) {
        const ipRecentCount = await prisma.bnSellerWaitlist.count({
            where: { ipHash, createdAt: { gte: dayAgo } },
        }).catch(() => 0);
        if (ipRecentCount >= MAX_PER_IP_24H) {
            return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
        }
    }

    // Bir xil telefon+marketSlug bo'lsa allaqachon PENDING — dublikat qaytaramiz
    const existing = await prisma.bnSellerWaitlist.findFirst({
        where: { phone, marketSlug, status: "PENDING" },
        select: { id: true },
    }).catch(() => null);
    if (existing) {
        return NextResponse.json({ ok: true, id: existing.id, duplicate: true });
    }

    const entry = await prisma.bnSellerWaitlist.create({
        data: {
            name, phone, city,
            marketSlug, category, note, source, ref, ipHash,
            status: "PENDING",
        },
        select: { id: true, createdAt: true },
    });

    // Ariza qaldirgan foydalanuvchi kirgan bo'lsa — "Erta qadam" yutuq (fail-safe)
    const auth = await getBnAuth().catch(() => null);
    if (auth) await grantAchievement(auth.profileId, "bn.waitlist");

    return NextResponse.json({ ok: true, id: entry.id, createdAt: entry.createdAt.toISOString() });
}
