import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { encryptLocation, decryptLocation } from "@/lib/crypto";
import { isFounderProfile } from "@/lib/founders";
import { checkReservedUsername } from "@/lib/reserved-username";
import { isReservedByAgentRule, AGENT_CREATOR_OWNER } from "@/lib/nexus-agent";

const EDIT_WINDOW_MS = 14 * 24 * 60 * 60 * 1000; // 14 kun

// GET /api/user/profile
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: {
            id: true, email: true,
            name: true, firstName: true, lastName: true, fatherName: true,
            username: true, humoId: true, country: true,
            image: true, coverImage: true, bio: true, birthday: true, city: true,
            location: true, locationIv: true,
            phone: true, level: true, emailVerified: true, onboardingDone: true,
            profileEditedAt: true, showUsdRef: true,
            createdAt: true,
        },
    });

    if (!profile) return NextResponse.json(null);

    // Decrypt location before sending to client
    let decryptedLocation: string | null = null;
    if (profile.location && profile.locationIv) {
        decryptedLocation = decryptLocation(profile.location, profile.locationIv) || null;
    }

    const { location: _loc, locationIv: _iv, ...rest } = profile;
    return NextResponse.json({ ...rest, location: decryptedLocation, isFounder: isFounderProfile(profile) });
}

// PATCH /api/user/profile
export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json() as {
        firstName?: string;
        lastName?: string;
        fatherName?: string;
        username?: string;
        humoId?: string;
        country?: string;
        bio?: string;
        birthday?: string | null;
        city?: string;
        location?: string;  // plain text — will be encrypted server-side
        coverImage?: string;
        image?: string | null;  // avatar URL (null = delete custom avatar)
        phone?: string | null;
        onboardingDone?: boolean;
        showUsdRef?: boolean;
    };

    // Joriy profil — founder holati + 14-kunlik cheklov uchun
    const current = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: { id: true, username: true, humoId: true, profileEditedAt: true },
    });
    if (!current) return NextResponse.json({ error: "profile_not_found" }, { status: 404 });
    const isFounder = isFounderProfile(current);

    // Profilni 14 kunda 1 marta tahrirlash mumkin (founderlar bundan mustasno)
    const RATE_LIMITED_FIELDS = ["firstName", "lastName", "fatherName", "username", "bio", "birthday", "phone", "location"] as const;
    const isProfileEdit = RATE_LIMITED_FIELDS.some((f) => f in body) && body.onboardingDone !== true;
    if (isProfileEdit && !isFounder && current.profileEditedAt) {
        const nextEdit = current.profileEditedAt.getTime() + EDIT_WINDOW_MS;
        if (Date.now() < nextEdit) {
            return NextResponse.json({ error: "edit_cooldown", nextEditDate: new Date(nextEdit).toISOString() }, { status: 429 });
        }
    }

    // Validate username if provided — zaxira usernamelar DB'da (ReservedUsername).
    if (body.username !== undefined && body.username !== "") {
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(body.username)) {
            return NextResponse.json({ error: "username_invalid" }, { status: 400 });
        }
        const isCreatorOwner = (current.username ?? "").toLowerCase() === AGENT_CREATOR_OWNER;
        const agentRule = isReservedByAgentRule(body.username, { isCreatorOwner });
        if (agentRule.reserved) {
            return NextResponse.json({ error: "username_reserved", message: agentRule.reason }, { status: 400 });
        }
        const reserved = await checkReservedUsername(body.username, { profileId: current.id, isFounder });
        if (reserved.reserved) {
            return NextResponse.json({ error: "username_reserved", message: reserved.reason }, { status: 400 });
        }
        const existing = await prisma.userProfile.findUnique({
            where: { username: body.username },
            select: { email: true },
        });
        if (existing && existing.email !== session.user.email) {
            return NextResponse.json({ error: "username_taken" }, { status: 409 });
        }
    }

    // Validate Humo ID uniqueness if provided
    if (body.humoId) {
        const existing = await prisma.userProfile.findUnique({
            where: { humoId: body.humoId },
            select: { email: true },
        });
        if (existing && existing.email !== session.user.email) {
            return NextResponse.json({ error: "humoid_taken" }, { status: 409 });
        }
    }

    // Validate bio length
    if (body.bio && body.bio.length > 160) {
        return NextResponse.json({ error: "bio_too_long" }, { status: 400 });
    }

    // Build update payload
    const data: Record<string, unknown> = {};
    if (body.firstName  !== undefined) data.firstName  = body.firstName.trim()  || null;
    if (body.lastName   !== undefined) data.lastName   = body.lastName.trim()   || null;
    if (body.fatherName !== undefined) data.fatherName = body.fatherName.trim() || null;
    if (body.username   !== undefined) data.username   = body.username.trim()   || null;
    if (body.humoId     !== undefined) data.humoId     = body.humoId;
    if (body.country    !== undefined) data.country    = body.country;
    if (body.bio        !== undefined) data.bio        = body.bio.trim() || null;
    if (body.city       !== undefined) data.city       = body.city.trim() || null;
    if (body.coverImage !== undefined) data.coverImage = body.coverImage || null;
    if (body.image      !== undefined) data.image      = body.image ?? null;
    if (body.showUsdRef !== undefined) data.showUsdRef = !!body.showUsdRef;
    if (body.phone      !== undefined) data.phone      = body.phone?.trim() || null;
    if (body.onboardingDone !== undefined) data.onboardingDone = body.onboardingDone;
    if (isProfileEdit && !isFounder) data.profileEditedAt = new Date();
    if (body.location !== undefined) {
        if (body.location.trim()) {
            const { encrypted, iv } = encryptLocation(body.location.trim());
            data.location = encrypted;
            data.locationIv = iv;
        } else {
            data.location = null;
            data.locationIv = null;
        }
    }
    if (body.birthday !== undefined) {
        data.birthday = body.birthday ? new Date(body.birthday) : null;
    }
    // Sync name from firstName + lastName
    if (body.firstName || body.lastName) {
        const fn = (body.firstName ?? "").trim();
        const ln = (body.lastName  ?? "").trim();
        data.name = [fn, ln].filter(Boolean).join(" ") || null;
    }

    const updated = await prisma.userProfile.upsert({
        where: { email: session.user.email },
        create: { email: session.user.email, ...data },
        update: data,
        select: {
            id: true, email: true,
            name: true, firstName: true, lastName: true, fatherName: true,
            username: true, humoId: true, country: true,
            image: true, bio: true, birthday: true, city: true,
            location: true, locationIv: true,
            level: true, emailVerified: true, onboardingDone: true,
        },
    });

    // Decrypt location before returning
    let decryptedLoc: string | null = null;
    if (updated.location && updated.locationIv) {
        decryptedLoc = decryptLocation(updated.location, updated.locationIv) || null;
    }
    const { location: _l, locationIv: _lv, ...updatedRest } = updated;
    return NextResponse.json({ ...updatedRest, location: decryptedLoc });
}
