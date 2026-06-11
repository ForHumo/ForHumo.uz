import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authPartner, withinRateLimit } from "@/lib/partner-auth";

// POST /api/partner/sweet-id/resolve
//
// Sevinch Sweets Telegram foydalanuvchini O'ZI tasdiqlaydi (bot HMAC), keyin
// tasdiqlangan ma'lumotni partner imzosi bilan shu yerga yuboradi. Humo ID
// shu Telegram identity uchun SWEET profilni YARATADI yoki TOPADI (idempotent)
// va profilni qaytaradi. PII (ism/telefon/rasm) Humo ID'da saqlanadi.
export async function POST(req: Request) {
  const raw = await req.text();
  const partner = authPartner(req, raw);
  if (!partner) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!withinRateLimit(partner)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = safeParse(raw);
  const telegramId = String(body?.telegramId ?? "").trim();
  if (!telegramId) {
    return NextResponse.json({ error: "telegram_id_required" }, { status: 400 });
  }

  const firstName = strOrNull(body?.firstName);
  const lastName = strOrNull(body?.lastName);
  const username = strOrNull(body?.username);
  const photoUrl = strOrNull(body?.photoUrl);
  const displayName = [firstName, lastName].filter(Boolean).join(" ") || null;

  const identity = await prisma.identity.findUnique({
    where: { provider_providerId: { provider: "TELEGRAM", providerId: telegramId } },
    include: { profile: true },
  });

  let profile;
  if (identity) {
    profile = await prisma.userProfile.update({
      where: { id: identity.profileId },
      data: {
        name: displayName ?? identity.profile.name ?? undefined,
        image: photoUrl ?? identity.profile.image ?? undefined,
        // origin'ni to'ldirish — origin maydoni qo'shilishidan oldin yaratilgan
        // profillar (origin=null) [id] route'larida "yetim" qolmasligi uchun.
        origin: identity.profile.origin ?? partner,
        lastLoginAt: new Date(),
      },
    });
    if (username && username !== identity.username) {
      await prisma.identity.update({
        where: { id: identity.id },
        data: { username, photoUrl: photoUrl ?? identity.photoUrl },
      });
    }
  } else {
    try {
      profile = await prisma.userProfile.create({
        data: {
          accountType: "SWEET",
          origin: partner,
          humoId: await genSweetHumoId(),
          name: displayName,
          firstName,
          lastName,
          image: photoUrl,
          emailVerified: false,
          level: 0,
          onboardingDone: true,
          lastLoginAt: new Date(),
          identities: {
            create: { provider: "TELEGRAM", providerId: telegramId, username, photoUrl },
          },
        },
      });
    } catch {
      // Poyga: bir vaqtda boshqa so'rov shu identity'ni yaratdi — qayta topamiz.
      const again = await prisma.identity.findUnique({
        where: { provider_providerId: { provider: "TELEGRAM", providerId: telegramId } },
        include: { profile: true },
      });
      if (!again) {
        return NextResponse.json({ error: "conflict" }, { status: 409 });
      }
      profile = again.profile.origin
        ? again.profile
        : await prisma.userProfile.update({
            where: { id: again.profileId },
            data: { origin: partner },
          });
    }
  }

  return NextResponse.json({
    ok: true,
    profileId: profile.id,
    humoId: profile.humoId,
    accountType: profile.accountType,
    name: profile.name,
    image: profile.image,
    phone: profile.phone,
    username,
  });
}

// SWEET hisoblar uchun odam o'qiy oladigan kod: "SW" + 7 raqam (Google = "UZ...").
async function genSweetHumoId(): Promise<string> {
  for (let i = 0; i < 6; i++) {
    const id = "SW" + Math.floor(1_000_000 + Math.random() * 9_000_000);
    const exists = await prisma.userProfile.findUnique({ where: { humoId: id } });
    if (!exists) return id;
  }
  return "SW" + String(Date.now()).slice(-7);
}

function safeParse(raw: string): Record<string, unknown> | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function strOrNull(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
}
