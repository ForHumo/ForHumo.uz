'use server';

import { prisma as db } from '@/lib/prisma';
import { Tournament } from '@/lib/esport-types';

const AUTUMN_2025: Tournament = {
    id: 't_autumn_2025',
    name: 'Humo Autumn Cup 2025',
    season: 'Autumn 2025',
    prizePool: 200000,
    maxTeams: 16,
    status: 'COMPLETED',
    game: 'PUBG_MOBILE',
    startDate: '2025-09-01',
    endDate: '2025-09-15',
    createdAt: '2025-08-15',
    teams: [
        { teamId: 'team_01', name: 'Shadows Gaming', logo: 'https://api.dicebear.com/9.x/identicon/svg?seed=Shadows' },
        { teamId: 'team_03', name: 'Phoenix Reborn', logo: 'https://api.dicebear.com/9.x/identicon/svg?seed=Phoenix' },
        { teamId: 'team_assassin', name: "Assassin's", logo: 'https://api.dicebear.com/9.x/identicon/svg?seed=Assassin' },
        { teamId: 'team_kurayami', name: 'Kurayami', logo: 'https://api.dicebear.com/9.x/identicon/svg?seed=Kurayami' },
        { teamId: 'team_vamos', name: 'Team Vamos', logo: 'https://api.dicebear.com/9.x/identicon/svg?seed=Vamos' },
        { teamId: 'team_starboys', name: 'Star Boys', logo: 'https://api.dicebear.com/9.x/identicon/svg?seed=Star' }
    ],
    matches: [
        { id: 'm_01', matchNumber: 1, stage: 'GROUP', date: '2025-09-01', time: '14:00', teamA: { id: 'team_assassin', name: "Assassin's" }, teamB: { id: 'team_kurayami', name: 'Kurayami' }, scoreA: 2, scoreB: 1, status: 'PLAYED', winnerTeamId: 'team_assassin', youtubeUrl: 'https://youtube.com/watch?v=mock1' },
        { id: 'm_02', matchNumber: 2, stage: 'GROUP', date: '2025-09-01', time: '16:00', teamA: { id: 'team_vamos', name: 'Team Vamos' }, teamB: { id: 'team_starboys', name: 'Star Boys' }, scoreA: 0, scoreB: 2, status: 'PLAYED', winnerTeamId: 'team_starboys', youtubeUrl: 'https://youtube.com/watch?v=mock2' },
        { id: 'm_03', matchNumber: 3, stage: 'GROUP', date: '2025-09-03', time: '18:00', teamA: { id: 'team_03', name: 'Phoenix Reborn' }, teamB: { id: 'team_01', name: 'Shadows Gaming' }, scoreA: null, scoreB: null, status: 'TECHNICAL', winnerTeamId: 'team_01', adminNote: 'Phoenix Reborn disqualified for using unauthorized stand-in. Technical victory awarded to Shadows Gaming.' },
        { id: 'm_semi_1', matchNumber: 4, stage: 'PLAYOFF_S', date: '2025-09-10', time: '15:00', teamA: { id: 'team_assassin', name: "Assassin's" }, teamB: { id: 'team_starboys', name: 'Star Boys' }, scoreA: 3, scoreB: 1, status: 'PLAYED', winnerTeamId: 'team_assassin', youtubeUrl: 'https://youtube.com/watch?v=mock3' },
        { id: 'm_semi_2', matchNumber: 5, stage: 'PLAYOFF_S', date: '2025-09-10', time: '18:00', teamA: { id: 'team_01', name: 'Shadows Gaming' }, teamB: { id: 'team_vamos', name: 'Team Vamos' }, scoreA: 3, scoreB: 0, status: 'PLAYED', winnerTeamId: 'team_01', youtubeUrl: 'https://youtube.com/watch?v=mock4' },
        { id: 'm_final', matchNumber: 6, stage: 'FINAL', date: '2025-09-15', time: '20:00', teamA: { id: 'team_assassin', name: "Assassin's" }, teamB: { id: 'team_01', name: 'Shadows Gaming' }, scoreA: 4, scoreB: 3, status: 'PLAYED', winnerTeamId: 'team_assassin', youtubeUrl: 'https://youtube.com/watch?v=mock_final' }
    ],
    standings: [
        { position: 1, teamId: 'team_assassin', prize: 120000, proofUrl: 'https://t.me/humo_esport/proof1' },
        { position: 2, teamId: 'team_01', prize: 50000, proofUrl: 'https://t.me/humo_esport/proof2' },
        { position: 3, teamId: 'team_starboys', prize: 30000, proofUrl: 'https://t.me/humo_esport/proof3' }
    ]
};

const mapPrismaToTournament = (t: any): Tournament => ({
    id: t.id,
    name: t.name,
    season: t.season,
    prizePool: t.prizePool,
    maxTeams: t.maxTeams || 16, // Default if missing
    status: t.status,
    game: t.game,
    startDate: t.startDate.toISOString(),
    endDate: t.endDate?.toISOString(),
    createdAt: t.createdAt.toISOString(),
    teams: t.teams.map((tt: any) => ({
        teamId: tt.teamId,
        name: tt.snapshotName,
        logo: tt.snapshotLogo || undefined
    })),
    matches: t.matches.map((m: any) => ({
        id: m.id,
        matchNumber: m.matchNumber,
        stage: m.stage,
        date: m.date.toISOString(),
        time: m.time,
        teamA: { id: m.teamAId, name: m.teamA.snapshotName, logo: m.teamA.snapshotLogo || undefined },
        teamB: { id: m.teamBId, name: m.teamB.snapshotName, logo: m.teamB.snapshotLogo || undefined },
        scoreA: m.scoreA,
        scoreB: m.scoreB,
        winnerTeamId: m.winnerId ? m.winner.teamId : undefined, // Need join logic or just store winner as relation
        status: m.status,
        youtubeUrl: m.youtubeUrl || undefined,
        adminNote: m.adminNote || undefined
    })),
    standings: t.standings.map((s: any) => ({
        position: s.position,
        teamId: s.teamId,
        prize: s.prize,
        proofUrl: s.proofUrl || undefined
    }))
});

export const TournamentsRepository = {
    getAll: async (): Promise<Tournament[]> => {
        try {
            const tournaments = await db.tournament.findMany({
                include: {
                    teams: true,
                    matches: { include: { teamA: true, teamB: true, winner: true } },
                    standings: true
                } as any
            });
            if (tournaments.length === 0) return [AUTUMN_2025];
            return tournaments.map(mapPrismaToTournament);
        } catch (e) {
            console.error("DB Error (Tournaments):", e);
            return [AUTUMN_2025];
        }
    },

    getById: async (id: string): Promise<Tournament | undefined> => {
        if (id === 'autumn-2025' || id === 't_autumn_2025') return AUTUMN_2025; // Prioritize static backup for this specific one if simpler

        try {
            const tournament = await db.tournament.findUnique({
                where: { id },
                include: {
                    teams: true,
                    matches: { include: { teamA: true, teamB: true, winner: true } },
                    standings: true,
                } as any
            });
            if (!tournament) return undefined;
            return mapPrismaToTournament(tournament);
        } catch (e) {
            return undefined;
        }
    }
};
