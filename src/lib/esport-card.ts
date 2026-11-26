// Kibersport karta — umumiy yordamchilar (server + client, PRISMA YO'Q = client-safe).
// Yagona manba: /esport-test karta tizimi (daraja/o'yin/bayroq + jamoa kartasi).

export type EsTier = "bronza" | "kumush" | "oltin" | "platina" | "olmos" | "afsona" | "chempion" | "mvp" | "ikona";
export type EsGame = "cs2" | "dota" | "pubgm" | "mlbb" | "other";

// Elo -> daraja (material). Boshlang'ich Elo 1000 = Bronza; o'ssa ko'tariladi.
export function tierFromElo(elo: number): EsTier {
  if (elo >= 1600) return "afsona";
  if (elo >= 1450) return "olmos";
  if (elo >= 1300) return "platina";
  if (elo >= 1150) return "oltin";
  if (elo >= 1050) return "kumush";
  return "bronza";
}

export const TIER_LABEL: Record<EsTier, string> = {
  bronza: "Bronza", kumush: "Kumush", oltin: "Oltin", platina: "Platina",
  olmos: "Olmos", afsona: "Afsona", chempion: "Chempion", mvp: "MVP", ikona: "Ikona",
};

// mini-gerb materiali: [och, to'q, siyoh rangi]
export const TIER_MAT: Record<EsTier, [string, string, string]> = {
  bronza: ["#9a6c3f", "#4a3119", "#fff"],
  kumush: ["#dde3e9", "#8a929c", "#1a1d22"],
  oltin: ["#f8df84", "#b48a24", "#3a2a06"],
  platina: ["#d6f4f0", "#4f949c", "#0c2b2e"],
  olmos: ["#ecf7ff", "#6aa5e6", "#0a2742"],
  afsona: ["#4a2f74", "#160f28", "#fff"],
  chempion: ["#fff4cf", "#b8860b", "#3a2a06"],
  mvp: ["#ffd9a0", "#b8600b", "#3a1e06"],
  ikona: ["#f8df84", "#8a5a16", "#3a2406"],
};

export function gameSlug(name?: string | null): EsGame {
  const n = (name || "").toLowerCase();
  if (/cs|counter|strike/.test(n)) return "cs2";
  if (/dota/.test(n)) return "dota";
  if (/pubg/.test(n)) return "pubgm";
  if (/mlbb|mobile legends|bang/.test(n)) return "mlbb";
  return "other";
}
export const GAME_LABEL: Record<EsGame, string> = { cs2: "CS2", dota: "DOTA2", pubgm: "PUBGM", mlbb: "MLBB", other: "—" };
export const GAME_CREST: Record<EsGame, [string, string]> = {
  cs2: ["#ff9a4a", "#a8500f"], dota: ["#ef6a62", "#8a2420"], pubgm: ["#f4c430", "#a8780f"], mlbb: ["#4aa3ff", "#164f8a"], other: ["#8aa0c0", "#3a4a60"],
};

export const COUNTRY_NAME: Record<string, string> = {
  UZ: "O'zbekiston", KZ: "Qozog'iston", TJ: "Tojikiston", KG: "Qirg'iziston", TM: "Turkmaniston",
  RU: "Rossiya", TR: "Turkiya", AF: "Afg'oniston", AZ: "Ozarbayjon", UA: "Ukraina", BY: "Belarus",
};
export const RAV_COLORS = ["#3aa0ff", "#e0485c", "#c9922b", "#16a34a", "#7c5cff", "#2fae9b", "#d9682a"];

// ISO-2 davlat kodi -> bayroq kodi (kichik harf). Isroil bayrog'i HECH QACHON (founder qoidasi).
const FLAG_EXCLUDE = new Set(["il"]);
export function ccFromCountry(raw?: string | null): string | undefined {
  const up = (raw || "").toUpperCase();
  if (!/^[A-Z]{2}$/.test(up)) return undefined;
  const c = up.toLowerCase();
  return FLAG_EXCLUDE.has(c) ? undefined : c;
}
export function countryName(raw?: string | null): string {
  const up = (raw || "").toUpperCase();
  return COUNTRY_NAME[up] || (ccFromCountry(up) ? up : "");
}

export interface RosterAv { in: string; color: string; img?: string }
export interface Stat { k: string; v: number }
export interface TeamData {
  tier: EsTier; game: EsGame; rating: number; gameLabel: string; rank: string;
  name: string; crest: string; crestImg?: string; crest1: string; crest2: string;
  country: string; cc?: string; city?: string; founded: number;
  champ?: boolean;
  roster: RosterAv[]; stats: Stat[]; lead: string; cap: string;
}

export interface TeamCardInput {
  name: string; tag: string; logo?: string | null;
  rosters: { rating: number; peakRating?: number | null; gameName?: string | null; memberCount: number; members: { ign?: string | null; image?: string | null }[] }[];
  ownerCountryRaw?: string | null;
  createdAt: Date | string;
  winPct: number; played: number; city?: string; champ?: boolean;
}

// Real EsTeam ma'lumotidan jamoa kartasi (teams/all + teams/[id] bir xil natija beradi).
export function buildTeamCard(i: TeamCardInput): TeamData {
  const ratings = i.rosters.map(r => r.rating);
  const rating = ratings.length ? Math.max(...ratings) : 1000;
  const members = i.rosters.reduce((s, r) => s + r.memberCount, 0);
  const primary = i.rosters.length ? i.rosters.reduce((a, b) => (b.rating > a.rating ? b : a)) : null;
  const slug = gameSlug(primary?.gameName);
  const tier = tierFromElo(rating);
  const [c1, c2] = GAME_CREST[slug];
  const cc = ccFromCountry(i.ownerCountryRaw);
  const roster = (primary?.members || []).slice(0, 5).map((m, idx) => ({
    in: (m.ign || "?").trim().slice(0, 1).toUpperCase(),
    color: RAV_COLORS[idx % RAV_COLORS.length],
    img: m.image || undefined,
  }));
  return {
    tier, game: slug, gameLabel: GAME_LABEL[slug], rating, rank: TIER_LABEL[tier],
    name: i.name, crest: i.tag.slice(0, 1).toUpperCase(), crestImg: i.logo || undefined, crest1: c1, crest2: c2,
    country: countryName(i.ownerCountryRaw), cc, city: i.city, founded: new Date(i.createdAt).getFullYear(),
    champ: i.champ ?? false,
    roster,
    stats: [
      { k: "PIK", v: primary?.peakRating ?? rating },
      { k: "G'AL", v: i.winPct },
      { k: "O'YN", v: i.played },
      { k: "A'ZO", v: members },
    ],
    lead: i.name, cap: `${TIER_LABEL[tier]} · ${GAME_LABEL[slug]} · ${members} o'yinchi`,
  };
}
