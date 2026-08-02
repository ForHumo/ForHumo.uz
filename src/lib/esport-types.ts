export type GameType = 'MLBB' | 'PUBG_MOBILE';

export interface Player {
    id: string; // 6-digit immutable ID
    nickname: string; // Unique global nickname, case-insensitive logic
    avatar?: string;
    firstName: string; // Required for profile
    lastName: string; // Required for profile
    telegram: string; // Required for profile
    level: number;
    gamesPlayed: number;
    teamId?: string;
    isActive: boolean; // True if profile is complete and valid
    gameProfiles: {
        game: GameType;
        inGameNickname: string;
        gameId?: string; // Private, never shown publicly
    }[];
    joinedAt: string;
    role?: 'CAPTAIN' | 'MEMBER' | 'SUB';
}

export type TeamRole = 'OWNER' | 'CAPTAIN' | 'MEMBER';
export type RequestStatus = 'PENDING' | 'REJECTED' | 'EXPIRED';

export interface TeamMember {
    playerId: string;
    role: TeamRole;
    joinedAt: string;
    playerDetails?: {
        nickname: string;
        avatar: string;
        level: number;
    };
}

export interface JoinRequest {
    id: string; // generated ID or compound key
    playerId: string;
    requestedAt: string;
    status: RequestStatus;
    playerDetails?: {
        nickname: string;
        avatar: string;
        level: number;
    };
}

export interface TeamInvite {
    playerId: string;
    invitedBy: string; // Captain/Owner ID
    sentAt: string;
    expiresAt: string;
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
}

export interface Team {
    id: string;
    name: string;
    tag: string; // 2-4 uppercase letters
    logo?: string;

    // Core Logic (Refactored)
    ownerId: string; // Redundant but good for quick lookups
    captainId: string; // Redundant but good for quick lookups

    members: TeamMember[]; // Detailed list

    // Joining Logic
    requests: JoinRequest[]; // Detailed requests
    invites: TeamInvite[]; // Outgoing invites
    joinCode?: {
        code: string;
        createdAt: string;
        expiresAt: string;
    };

    level: number;
    createdAt: string;
    stats: {
        wins: number;
        losses: number;
        tournamentsPlayed: number;
    };

    // Lifecycle
    status: 'ACTIVE' | 'INACTIVE' | 'DISBANDED';
    disbandedAt?: string;
    disbandReason?: string;

    // Legacy support (optional, can remove if we fully migrate)
    pendingRequests?: never;
}

export type TeamStatus = Team['status'];

export type TournamentStatus = 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'CANCELLED';

export interface TournamentTeam {
    teamId: string;
    name: string; // Snapshot of name at tournament time
    logo?: string;
}

export interface TournamentStanding {
    position: number; // 1, 2, 3...
    teamId: string;
    prize: number; // Amount in currency (e.g. UZS)
    proofUrl?: string; // Telegram link
}

export interface TournamentMatch {
    id: string;
    matchNumber: number;
    stage: 'GROUP' | 'PLAYOFF_Q' | 'PLAYOFF_S' | 'FINAL'; // Added stage for better organization
    date: string; // ISO Date "YYYY-MM-DD"
    time: string; // "HH:MM"

    teamA: { id: string; name: string; logo?: string }; // Snapshot
    teamB: { id: string; name: string; logo?: string }; // Snapshot

    scoreA: number | null;
    scoreB: number | null;

    winnerTeamId?: string;
    status: 'SCHEDULED' | 'PLAYED' | 'CANCELLED' | 'TECHNICAL'; // Added TECHNICAL

    youtubeUrl?: string;
    adminNote?: string; // For technical defeats or issues
}

export interface Tournament {
    id: string;
    name: string;
    season: string; // "Autumn 2025"
    prizePool: number;
    maxTeams: number;
    status: TournamentStatus;

    game: GameType;
    startDate: string;
    endDate?: string;

    // Relations
    teams: TournamentTeam[];
    matches: TournamentMatch[];
    standings: TournamentStanding[]; // Empty if not valid yet

    createdAt: string;
}

// RBAC Types
export type Role = 'ORGANIZER' | 'MODERATOR' | 'SYSTEM_AI';

export type Action =
    | 'FINALIZE_TOURNAMENT'
    | 'MARK_PAID'
    | 'TRANSFER_TEAM'
    | 'CREATE_MATCH'
    | 'EDIT_MATCH'
    | 'FLAG_INCIDENT'
    | 'VALIDATE_DATA';

export interface AuditLogEntry {
    id: string;
    actor: string; // e.g. "Admin User", "System AI"
    role: Role;
    action: Action;
    target: string; // e.g. "Match #123"
    timestamp: string;
    details?: string;
    status: 'SUCCESS' | 'FAILED' | 'FLAGGED';
}

export interface ValidationResult {
    isValid: boolean;
    flags: string[];
    confidence: number; // 0-1
}

export interface CurrentUser {
    id: string;
    fullName: string;
    nickname: string;
    avatar: string;
    telegram?: string;
    teamId?: string;
    isAdmin?: boolean; // For Role Based Access Control simulation
    role?: 'PLAYER' | 'ADMIN'; // explicit role field
    games: {
        mlbb?: { nickname: string; playerId: string };
        pubg?: { nickname: string; playerId: string };
    };
}
// Alias for backward compatibility if needed, or just use CurrentUser
