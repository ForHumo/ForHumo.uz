// Admin (founder) himoyasi — server route'lar uchun.
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isFounderProfile } from "@/lib/founders";

// Founder bo'lsa profilini qaytaradi, aks holda null.
export async function requireFounder() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return null;
    const profile = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: { id: true, username: true, humoId: true, name: true },
    });
    if (!profile || !isFounderProfile(profile)) return null;
    return profile;
}
