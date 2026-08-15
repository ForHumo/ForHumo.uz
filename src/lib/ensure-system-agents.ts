// Rasmiy For Humo tizim agentlarini DB'da mavjudligini ta'minlaydi (upsert).
// GET /api/nexus/agents birinchi chaqirilganda avto-seed qiladi.
//
// - UserProfile (email: <username>@system.forhumo.uz, humoId: HUMO_XXXXX)
// - NexusAgent (isSystem=true, ownerId=birinchi founder profileId)
// - Har foydalanuvchida bu agentlar ko'rinadi va o'chirilmaydi

import { prisma } from "@/lib/prisma";
import { OFFICIAL_AGENTS } from "@/lib/nexus-agent";
import { FOUNDER_HUMO_IDS } from "@/lib/founders";

let cachedOnce = false;

export async function ensureSystemAgents(): Promise<void> {
    // Bir marta har server instance uchun (poll da yana ochilmasin)
    if (cachedOnce) return;

    // Founder profileId'ni topamiz (ownerId uchun; tizim agentlarining texnik egasi)
    const founder = await prisma.userProfile.findFirst({
        where: { humoId: { in: FOUNDER_HUMO_IDS } },
        select: { id: true },
        orderBy: { createdAt: "asc" },
    });
    if (!founder) {
        // Founder hali yo'q — hech kim login qilmagan bo'lishi mumkin. Keyingi safar
        // urinamiz (cachedOnce=false qoladi).
        return;
    }

    for (const spec of OFFICIAL_AGENTS) {
        try {
            // Profil bormi
            const existing = await prisma.userProfile.findUnique({
                where: { username: spec.username },
                select: { id: true },
            });

            let profileId: string;
            if (existing) {
                profileId = existing.id;
                // Nom/rasm/bio yangilash (upsert-lite)
                await prisma.userProfile.update({
                    where: { id: existing.id },
                    data: {
                        name: spec.name,
                        image: spec.image,
                        bio: `${spec.name} — For Humo rasmiy agenti.`,
                    },
                });
            } else {
                // Yangi profil yaratamiz. HumoId prefix: HUMO_ (agent, oddiy UZ emas).
                const humoId = `HUMO_${spec.username.toUpperCase().padEnd(6, "X").slice(0, 7)}`;
                const email = `${spec.username}@system.forhumo.uz`;
                const created = await prisma.userProfile.create({
                    data: {
                        email,
                        username: spec.username,
                        name: spec.name,
                        image: spec.image,
                        humoId,
                        onboardingDone: true,
                        bio: `${spec.name} — For Humo rasmiy agenti.`,
                    },
                });
                profileId = created.id;
            }

            // NexusAgent yozuvi bor-yo'qligini tekshiramiz
            const agentExists = await prisma.nexusAgent.findUnique({
                where: { profileId },
                select: { id: true, isSystem: true, module: true },
            });
            if (agentExists) {
                // isSystem/module noto'g'ri bo'lsa tuzatamiz
                if (!agentExists.isSystem || agentExists.module !== spec.module) {
                    await prisma.nexusAgent.update({
                        where: { id: agentExists.id },
                        data: { isSystem: true, module: spec.module },
                    });
                }
            } else {
                await prisma.nexusAgent.create({
                    data: {
                        profileId,
                        ownerId: founder.id,
                        module: spec.module,
                        isSystem: true,
                    },
                });
            }
        } catch (e) {
            // Bir agentda xato bo'lsa boshqasiga o'tamiz — lekin cache'ni ochiq qoldiramiz
            console.error("[ensureSystemAgents]", spec.username, e instanceof Error ? e.message : e);
            return;
        }
    }

    cachedOnce = true;
}
