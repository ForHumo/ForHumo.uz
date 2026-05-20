'use server';

import { prisma } from '@/lib/prisma';
import { Player } from '@/lib/esport-types';

// Helper to map Prisma PlayerProfile to our Player type
const mapPrismaToPlayer = (p: any): Player => ({
    id: p.id,
    nickname: p.nickname,
    avatar: p.avatar || undefined,
    firstName: p.firstName,
    lastName: p.lastName,
    telegram: p.telegram,
    level: p.level,
    gamesPlayed: p.gamesPlayed,
    isActive: p.isActive,
    joinedAt: p.joinedAt.toISOString(),
    gameProfiles: [
        p.mlbbInfo ? { game: 'MLBB', ...p.mlbbInfo } : null,
        p.pubgInfo ? { game: 'PUBG_MOBILE', ...p.pubgInfo } : null,
    ].filter(Boolean) as any[],
});

export const PlayersRepository = {
    getAll: async (): Promise<Player[]> => {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const profiles = await (prisma as any).playerProfile.findMany();
            if (profiles.length === 0) return [];
            return profiles.map(mapPrismaToPlayer);
        } catch (e) {
            console.error("DB Error (Players):", e);
            return [];
        }
    },

    getById: async (id: string): Promise<Player | undefined> => {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const profile = await (prisma as any).playerProfile.findUnique({ where: { id } });
            if (!profile) return undefined;
            return mapPrismaToPlayer(profile);
        } catch (e) {
            return undefined;
        }
    }
};
