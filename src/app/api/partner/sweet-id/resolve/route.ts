import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { partnerAuthorized } from "@/lib/partner-auth";

// POST /api/partner/sweet-id/resolve
//
// Sevinch Sweets Telegram foydalanuvchini O'ZI tasdiqlaydi (bot HMAC), keyin
// tasdiqlangan ma'lumotni partner kaliti bilan shu yerga yuboradi. Humo ID
// shu Telegram identity uchun SWEET profilni YARATADI yoki TOPADI (idempotent)
// va profilni qaytaradi. Sevinch faqat `profileId`ni saqlaydi — shaxsiy
// ma'lumotni (ism/telefon/rasm) Humo ID saqlaydi va himoya qiladi.
export async function POST(req: Request) {
  if (!partnerAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const telegramId = String(body?.telegramId ?? "").trim();
  if (!telegramId) {
    return NextResponse.json({ error: "telegram_id_required" }, { status: 400 });
  }

  const firstName = strOrNull(body?.firstName);
  const lastName = strOrNull(body?.lastName);
  const username = strOrNull(body?.username);
  const photoUrl = strOrNull(body?.photoUrl);
  const displayName = [firstName, lastName].filter(Boolean).join(" ") || null;

  // Mavjud bog'lanish (Sweet ID ko'prigi)?
  const identity = await prisma.identity.findUnique({
    where: { provider_providerId: { provider: "TELEGRAM", providerId: telegramId } },
    include: { profile: true },
  });

  let profile;
  if (identity) {
    // Topildi — keshlangan ma'lumotni yangilaymiz (Humo ID — manbai haqiqat)
    profile = await prisma.userProfile.update({
      where: { id: identity.profileId },
      data: {
        name: displayName ?? identity.profile.name ?? undefined,
        image: photoUrl ?? identity.profile.image ?? undefined,
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
    // Topilmadi — yangi SWEET profil + TELEGRAM identity (ko'prik) yaratamiz
    profile = await prisma.userProfile.create({
      data: {
        accountType: "SWEET",
        name: displayName,
        firstName,
        lastName,
        image: photoUrl,
        emailVerified: false,
        level: 0,
        onboardingDone: true, // Sweet uchun onboarding shart emas
        lastLoginAt: new Date(),
        identities: {
          create: { provider: "TELEGRAM", providerId: telegramId, username, photoUrl },
        },
      },
    });
  }

  return NextResponse.json({
    ok: true,
    profileId: profile.id,
    accountType: profile.accountType,
    name: profile.name,
    image: profile.image,
    phone: profile.phone,
    username,
  });
}

function strOrNull(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
}
