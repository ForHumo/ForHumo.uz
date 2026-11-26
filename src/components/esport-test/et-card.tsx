"use client";

import { useEffect } from "react";

/* ============================================================
   Kibersport o'yinchi kartalari — dizayn ko'rgazmasi (/esport-test/cards)
   3 tizim: material=daraja · rang=o'yin · ramka=terma (T.J.)
   Namuna ma'lumot; real o'yinchi reytingi/ fotosи keyin ulanadi.
   ============================================================ */

type Game = "cs2" | "dota" | "pubgm" | "mlbb" | "other";
type Tier = "bronza" | "kumush" | "oltin" | "platina" | "olmos" | "afsona" | "chempion" | "mvp" | "ikona";

interface Stat { k: string; v: number }
interface CardData {
  tier: Tier; game: Game; ovr: number; role: string; gameLabel: string; rank: string;
  name: string; country: string; cc?: string;
  team?: string; teamInitial?: string; teamColor?: string;
  nt?: boolean; tag?: string; era?: string; photo?: string;
  stats: Stat[]; lead: string; cap: string;
}

/* Bayroqlar — haqiqiy to'rtburchak bayroq rasmlari (flagcdn). Windows'da ham
   to'g'ri ko'rinadi (emoji bayroq Windows'da harf bo'lib qoladi).
   Isroil bayrog'i ko'rsatilmaydi. PROD'da manba Humo ID. */
const FLAG_EXCLUDE = new Set(["il"]);
function Flag({ cc }: { cc?: string }) {
  if (!cc) return null;
  const c = cc.toLowerCase();
  if (FLAG_EXCLUDE.has(c)) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="etc-flag" src={`https://flagcdn.com/${c}.svg`} alt="" loading="lazy" />;
}

function GameGlyph({ game }: { game: Game }) {
  switch (game) {
    case "cs2": return (<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="1.7" fill="currentColor" /></svg>);
    case "dota": return (<svg viewBox="0 0 24 24"><path d="M12 2l3.2 5.2L12 10.5 8.8 7.2 12 2z" fill="currentColor" /><path d="M12 10v12M8 18h8" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>);
    case "pubgm": return (<svg viewBox="0 0 24 24"><path d="M3 11a9 9 0 0 1 18 0" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M3 11l9 7.5L21 11M9 11l3 7.5 3-7.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><rect x="10.4" y="18.2" width="3.2" height="3.2" fill="currentColor" /></svg>);
    case "mlbb": return (<svg viewBox="0 0 24 24"><path d="M12 2.2l8 3.8v6.1c0 5.2-4.1 8.2-8 10.1-3.9-1.9-8-4.9-8-10.1V6L12 2.2z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><circle cx="12" cy="11" r="2.3" fill="currentColor" /></svg>);
    default: return (<svg viewBox="0 0 24 24"><path d="M12 3l7.5 4.3v9.4L12 21l-7.5-4.3V7.3L12 3z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>);
  }
}

function Bust() {
  return (<svg className="etc__bust" viewBox="0 0 100 112"><path d="M50 8c11.3 0 19.5 9.2 19.5 21.3 0 10-5.1 18.2-11.3 22.2 15.6 4 27.6 15.4 30.6 31.8 1.1 6.2-3.1 10.7-9.4 10.7H20.6c-6.3 0-10.5-4.5-9.4-10.7 3-16.4 15-27.8 30.6-31.8C35.6 47.5 30.5 39.3 30.5 29.3 30.5 17.2 38.7 8 50 8z" fill="currentColor" /></svg>);
}

function Fame() {
  return (<svg className="etc__fame" viewBox="0 0 120 120">
    <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none">
      <path d="M92 60h16M87.7 76l13.9 8M76 87.7l8 13.9M60 92v16M44 87.7l-8 13.9M32.3 76l-13.9 8M28 60H12M32.3 44l-13.9-8M44 32.3l-8-13.9M60 28V12M76 32.3l8-13.9M87.7 44l13.9-8" />
    </g>
    <path d="M60 34 66.47 51.1 84.7 51.97 70.46 63.4 75.28 81.03 60 71 44.72 81.03 49.54 63.4 35.3 51.97 53.53 51.1 Z" fill="currentColor" />
  </svg>);
}

function Card({ d }: { d: CardData }) {
  const cls = `etc etc--${d.tier} etc--${d.game}${d.nt ? " nt" : ""}`;
  return (
    <div className="etc-cw">
      <div className={cls}>
        <div className="etc__nt" /><div className="etc__shine" /><div className="etc__sheen" />
        {d.tier === "ikona" && <Fame />}
        {d.tag && <div className="etc__tag">{d.tag}</div>}
        <div className="etc__top">
          <div className="etc__ovr"><span className="etc__num">{d.ovr}</span><span className="etc__role">{d.role}</span></div>
          <div className="etc__meta">
            {d.nt && <span className="etc__tj">T.J.</span>}
            <span className="etc__game"><GameGlyph game={d.game} />{d.gameLabel}</span>
            <span className="etc__rank">{d.rank}</span>
          </div>
        </div>
        <div className="etc__art">
          {d.photo
            ? <div className="etc__photo" style={{ backgroundImage: `url(${d.photo})` }} />
            : <><span className="etc__hint">O&apos;yinchi rasmi</span><Bust /></>}
        </div>
        <div className="etc__foot">
          <div className="etc__name">{d.name}</div>
          <div className="etc__sub">
            <Flag cc={d.cc} />{d.country}
            {d.team && (
              <span className="tm">
                <span className="etc__tlogo" style={{ "--tc": d.teamColor } as React.CSSProperties}>{d.teamInitial}</span>
                <span>{d.team}</span>
              </span>
            )}
          </div>
          {d.era && <div className="etc__era">{d.era}</div>}
          <hr className="etc__rule" />
          <div className="etc__stats">
            {d.stats.map((s, i) => (<div className="etc__st" key={i}><b>{s.v}</b><span>{s.k}</span></div>))}
          </div>
        </div>
      </div>
      <div className="etc-cap"><b>{d.lead}</b> · {d.cap}</div>
    </div>
  );
}

/* ---- Jamoa (klub gerbi) kartasi ---- */
interface RosterAv { in: string; color: string; img?: string }
export interface TeamData {
  tier: Tier; game: Game; rating: number; gameLabel: string; rank: string;
  name: string; crest: string; crestImg?: string; crest1: string; crest2: string;
  country: string; cc?: string; city?: string; founded: number;
  champ?: boolean;
  roster: RosterAv[]; stats: Stat[]; lead: string; cap: string;
}

// Faqat karta (o'rab turuvchisiz) — Jamoalar sahifasida Link ichida ishlatiladi
export function TeamCardBody({ d }: { d: TeamData }) {
  const cls = `etc etc--${d.tier} etc--${d.game}${d.champ ? " champ" : ""}`;
  const big = d.rating >= 1000; // 4 xonali Elo bo'lsa raqamni kichraytiramiz
  const subText = [d.country, d.city, d.founded ? String(d.founded) : ""].filter(Boolean).join(" · ");
  return (
    <div className={cls}>
      <div className="etc__nt" /><div className="etc__shine" /><div className="etc__sheen" />
      {d.champ && <div className="etc__tag">CHEMPION</div>}
      <div className="etc__top">
        <div className="etc__ovr"><span className="etc__num" style={big ? { fontSize: 32, letterSpacing: "-.02em" } : undefined}>{d.rating}</span><span className="etc__jchip">JAMOA</span></div>
        <div className="etc__meta">
          <span className="etc__game"><GameGlyph game={d.game} />{d.gameLabel}</span>
          <span className="etc__rank">{d.rank}</span>
        </div>
      </div>
      <div className="etc__art">
        <div className="etc__crest" style={{ "--crest-1": d.crest1, "--crest-2": d.crest2 } as React.CSSProperties}>
          {d.crestImg ? <img src={d.crestImg} alt="" /> : d.crest}
        </div>
      </div>
      <div className="etc__foot">
        <div className="etc__name">{d.name}</div>
        <div className="etc__sub"><Flag cc={d.cc} />{subText}</div>
        {d.roster.length > 0 && (
          <div className="etc__roster">
            {d.roster.map((r, i) => (
              <span className="etc__rav" key={i} style={{ "--rc": r.color } as React.CSSProperties}>
                {r.img ? <img src={r.img} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} /> : r.in}
              </span>
            ))}
          </div>
        )}
        <hr className="etc__rule" />
        <div className="etc__tstats">
          {d.stats.map((s, i) => (<div className="etc__st" key={i}><b>{s.v}</b><span>{s.k}</span></div>))}
        </div>
      </div>
    </div>
  );
}

function TeamCard({ d }: { d: TeamData }) {
  return (
    <div className="etc-cw">
      <TeamCardBody d={d} />
      <div className="etc-cap"><b>{d.lead}</b> · {d.cap}</div>
    </div>
  );
}

const TIERS: CardData[] = [
  { tier: "bronza", game: "pubgm", ovr: 58, role: "SCOUT", gameLabel: "PUBGM", rank: "Bronza", name: "YANGIBOY", country: "O'zbekiston", cc: "uz", stats: [{ k: "AIM", v: 61 }, { k: "SUR", v: 64 }, { k: "ROT", v: 55 }, { k: "GUN", v: 59 }, { k: "UTL", v: 48 }, { k: "IQ", v: 57 }], lead: "YANGIBOY", cap: "OVR 58 · Bronza · jamoasiz · qora ramka" },
  { tier: "kumush", game: "mlbb", ovr: 71, role: "JUNGLE", gameLabel: "MLBB", rank: "Kumush", name: "SHER_UZ", country: "Qozog'iston", cc: "kz", team: "ALTAI", teamInitial: "A", teamColor: "#16a34a", stats: [{ k: "LAN", v: 70 }, { k: "TF", v: 74 }, { k: "MAP", v: 68 }, { k: "MEX", v: 73 }, { k: "OBJ", v: 72 }, { k: "VER", v: 66 }], lead: "SHER_UZ", cap: "OVR 71 · Kumush · termada emas" },
  { tier: "oltin", game: "cs2", ovr: 82, role: "AWP", gameLabel: "CS2", rank: "Oltin", name: "QORALOCHIN", country: "O'zbekiston", cc: "uz", team: "TURON FIVE", teamInitial: "T", teamColor: "#3aa0ff", nt: true, stats: [{ k: "AIM", v: 88 }, { k: "REF", v: 84 }, { k: "CLT", v: 80 }, { k: "UTL", v: 72 }, { k: "POS", v: 83 }, { k: "IMP", v: 85 }], lead: "QORALOCHIN", cap: "OVR 82 · Oltin · milliy termada" },
  { tier: "platina", game: "dota", ovr: 87, role: "MID", gameLabel: "DOTA2", rank: "Platina", name: "DEVONA", country: "Tojikiston", cc: "tj", team: "POMIR", teamInitial: "P", teamColor: "#e0485c", stats: [{ k: "FRM", v: 85 }, { k: "FGT", v: 88 }, { k: "MAP", v: 84 }, { k: "MEX", v: 90 }, { k: "DEC", v: 86 }, { k: "VER", v: 82 }], lead: "DEVONA", cap: "OVR 87 · Platina · termada emas" },
  { tier: "olmos", game: "cs2", ovr: 92, role: "ENTRY", gameLabel: "CS2", rank: "Olmos", name: "XANJAR", country: "O'zbekiston", cc: "uz", team: "REGISTON", teamInitial: "R", teamColor: "#c9922b", nt: true, stats: [{ k: "AIM", v: 94 }, { k: "REF", v: 93 }, { k: "CLT", v: 88 }, { k: "UTL", v: 84 }, { k: "POS", v: 90 }, { k: "IMP", v: 92 }], lead: "XANJAR", cap: "OVR 92 · Olmos · milliy termada" },
  { tier: "afsona", game: "mlbb", ovr: 96, role: "MID", gameLabel: "MLBB", rank: "Afsona", name: "SAMARQAND", country: "O'zbekiston", cc: "uz", team: "OQSAROY", teamInitial: "O", teamColor: "#7c5cff", nt: true, stats: [{ k: "LAN", v: 97 }, { k: "TF", v: 96 }, { k: "MAP", v: 94 }, { k: "MEX", v: 98 }, { k: "OBJ", v: 93 }, { k: "VER", v: 95 }], lead: "SAMARQAND", cap: "OVR 96 · Afsona · milliy termada" },
];

const NATIONAL: CardData[] = [
  { tier: "oltin", game: "dota", ovr: 83, role: "CARRY", gameLabel: "DOTA2", rank: "Oltin", name: "BAHODIR", country: "O'zbekiston", cc: "uz", team: "REGISTON", teamInitial: "R", teamColor: "#c9922b", nt: true, stats: [{ k: "FRM", v: 86 }, { k: "FGT", v: 84 }, { k: "MAP", v: 82 }, { k: "MEX", v: 85 }, { k: "DEC", v: 83 }, { k: "VER", v: 80 }], lead: "Chaqirilgan", cap: "binafsha-pushti animatsion ramka" },
  { tier: "oltin", game: "dota", ovr: 83, role: "CARRY", gameLabel: "DOTA2", rank: "Oltin", name: "BAHODIR", country: "O'zbekiston", cc: "uz", team: "REGISTON", teamInitial: "R", teamColor: "#c9922b", stats: [{ k: "FRM", v: 86 }, { k: "FGT", v: 84 }, { k: "MAP", v: 82 }, { k: "MEX", v: 85 }, { k: "DEC", v: 83 }, { k: "VER", v: 80 }], lead: "Chaqirilmagan", cap: "bronza ramka" },
];

const BYGAME: CardData[] = [
  { tier: "oltin", game: "cs2", ovr: 83, role: "AWP", gameLabel: "CS2", rank: "Oltin", name: "BURGUT", country: "O'zbekiston", cc: "uz", team: "TURON FIVE", teamInitial: "T", teamColor: "#3aa0ff", stats: [{ k: "AIM", v: 87 }, { k: "REF", v: 82 }, { k: "CLT", v: 81 }, { k: "UTL", v: 74 }, { k: "POS", v: 84 }, { k: "IMP", v: 83 }], lead: "CS2", cap: "AIM · REF · CLT · UTL · POS · IMP" },
  { tier: "oltin", game: "dota", ovr: 85, role: "CARRY", gameLabel: "DOTA2", rank: "Oltin", name: "AJDAR", country: "Qozog'iston", cc: "kz", team: "ALTAI", teamInitial: "A", teamColor: "#16a34a", stats: [{ k: "FRM", v: 88 }, { k: "FGT", v: 83 }, { k: "MAP", v: 80 }, { k: "MEX", v: 87 }, { k: "DEC", v: 84 }, { k: "VER", v: 82 }], lead: "Dota 2", cap: "FRM · FGT · MAP · MEX · DEC · VER" },
  { tier: "oltin", game: "pubgm", ovr: 81, role: "IGL", gameLabel: "PUBGM", rank: "Oltin", name: "LOCHIN", country: "Qirg'iziston", cc: "kg", team: "NOMAD", teamInitial: "N", teamColor: "#d9682a", stats: [{ k: "AIM", v: 83 }, { k: "SUR", v: 80 }, { k: "ROT", v: 82 }, { k: "GUN", v: 78 }, { k: "UTL", v: 76 }, { k: "IQ", v: 84 }], lead: "PUBG Mobile", cap: "AIM · SUR · ROT · GUN · UTL · IQ" },
  { tier: "platina", game: "mlbb", ovr: 86, role: "ROAM", gameLabel: "MLBB", rank: "Platina", name: "TUMARIS", country: "Turkmaniston", cc: "tm", team: "QORAQUM", teamInitial: "Q", teamColor: "#2fae9b", stats: [{ k: "LAN", v: 79 }, { k: "TF", v: 88 }, { k: "MAP", v: 90 }, { k: "MEX", v: 84 }, { k: "OBJ", v: 87 }, { k: "VER", v: 85 }], lead: "MLBB", cap: "LAN · TF · MAP · MEX · OBJ · VER" },
];

const SPECIAL: CardData[] = [
  { tier: "chempion", game: "cs2", ovr: 88, role: "AWP", gameLabel: "CS2", rank: "G'olib", name: "QORALOCHIN", country: "O'zbekiston", cc: "uz", team: "TURON FIVE", teamInitial: "T", teamColor: "#3aa0ff", tag: "CHEMPION", stats: [{ k: "AIM", v: 90 }, { k: "REF", v: 86 }, { k: "CLT", v: 83 }, { k: "UTL", v: 76 }, { k: "POS", v: 86 }, { k: "IMP", v: 88 }], lead: "Chempion", cap: "turnir g'olibi uchun" },
  { tier: "mvp", game: "mlbb", ovr: 89, role: "ROAM", gameLabel: "MLBB", rank: "Yulduz", name: "TUMARIS", country: "Turkmaniston", cc: "tm", team: "QORAQUM", teamInitial: "Q", teamColor: "#2fae9b", tag: "OY MVP", stats: [{ k: "LAN", v: 82 }, { k: "TF", v: 90 }, { k: "MAP", v: 92 }, { k: "MEX", v: 86 }, { k: "OBJ", v: 89 }, { k: "VER", v: 87 }], lead: "MVP", cap: "hafta/oy yulduzi uchun" },
];

const IKONA: CardData[] = [
  { tier: "ikona", game: "mlbb", ovr: 95, role: "ROAM", gameLabel: "MLBB", rank: "Abadiy", name: "ALPOMISH", country: "O'zbekiston", cc: "uz", team: "OQSAROY", teamInitial: "O", teamColor: "#7c5cff", tag: "IKONA", era: "2016 — 2023 · 3× Chempion", stats: [{ k: "LAN", v: 92 }, { k: "TF", v: 96 }, { k: "MAP", v: 97 }, { k: "MEX", v: 90 }, { k: "OBJ", v: 95 }, { k: "VER", v: 93 }], lead: "ALPOMISH", cap: "Ikona · MLBB · 2016–2023" },
  { tier: "ikona", game: "cs2", ovr: 94, role: "IGL", gameLabel: "CS2", rank: "Abadiy", name: "SOHIBQIRON", country: "O'zbekiston · milliy terma", cc: "uz", nt: true, tag: "IKONA", era: "2014 — 2022 · Milliy terma kapitani", stats: [{ k: "AIM", v: 90 }, { k: "REF", v: 88 }, { k: "CLT", v: 93 }, { k: "UTL", v: 86 }, { k: "POS", v: 95 }, { k: "IMP", v: 94 }], lead: "SOHIBQIRON", cap: "Ikona · CS2 · milliy termada" },
  { tier: "ikona", game: "dota", ovr: 96, role: "MID", gameLabel: "DOTA2", rank: "Abadiy", name: "YASSAVIY", country: "Tojikiston", cc: "tj", team: "POMIR", teamInitial: "P", teamColor: "#e0485c", tag: "IKONA", era: "2015 — 2024 · 2× For Humo Cup", stats: [{ k: "FRM", v: 94 }, { k: "FGT", v: 95 }, { k: "MAP", v: 92 }, { k: "MEX", v: 97 }, { k: "DEC", v: 96 }, { k: "VER", v: 90 }], lead: "YASSAVIY", cap: "Ikona · Dota 2 · 2015–2024" },
];

const TEAMS: TeamData[] = [
  { tier: "afsona", game: "cs2", rating: 96, gameLabel: "CS2", rank: "Afsona", name: "TURON FIVE", crest: "T", crest1: "#4aa3ff", crest2: "#0b3f86", country: "O'zbekiston", cc: "uz", city: "Toshkent", founded: 2021, champ: true, roster: [{ in: "Q", color: "#3aa0ff" }, { in: "B", color: "#2b6fc2" }, { in: "X", color: "#4aa3ff" }, { in: "S", color: "#2b6fc2" }, { in: "A", color: "#3aa0ff" }], stats: [{ k: "O'RT", v: 94 }, { k: "ELO", v: 2210 }, { k: "G'AL", v: 78 }, { k: "KUB", v: 6 }], lead: "TURON FIVE", cap: "Afsona · CS2 · amaldagi chempion" },
  { tier: "olmos", game: "mlbb", rating: 92, gameLabel: "MLBB", rank: "Olmos", name: "OQSAROY", crest: "O", crest1: "#9b7bff", crest2: "#4a2fa6", country: "O'zbekiston", cc: "uz", city: "Samarqand", founded: 2020, roster: [{ in: "A", color: "#7c5cff" }, { in: "M", color: "#5a3fc0" }, { in: "T", color: "#7c5cff" }, { in: "R", color: "#5a3fc0" }, { in: "D", color: "#7c5cff" }], stats: [{ k: "O'RT", v: 90 }, { k: "ELO", v: 2060 }, { k: "G'AL", v: 71 }, { k: "KUB", v: 4 }], lead: "OQSAROY", cap: "Olmos · MLBB · 4× kubok" },
  { tier: "platina", game: "dota", rating: 87, gameLabel: "DOTA2", rank: "Platina", name: "REGISTON", crest: "R", crest1: "#e0b44a", crest2: "#8a5a16", country: "O'zbekiston", cc: "uz", city: "Buxoro", founded: 2022, roster: [{ in: "B", color: "#c9922b" }, { in: "K", color: "#9a6c1f" }, { in: "N", color: "#c9922b" }, { in: "S", color: "#9a6c1f" }, { in: "Y", color: "#c9922b" }], stats: [{ k: "O'RT", v: 86 }, { k: "ELO", v: 1950 }, { k: "G'AL", v: 66 }, { k: "KUB", v: 2 }], lead: "REGISTON", cap: "Platina · Dota 2 · 2× kubok" },
  { tier: "oltin", game: "dota", rating: 82, gameLabel: "DOTA2", rank: "Oltin", name: "POMIR", crest: "P", crest1: "#ef6a76", crest2: "#9c2b36", country: "Tojikiston", cc: "tj", city: "Dushanbe", founded: 2021, roster: [{ in: "D", color: "#e0485c" }, { in: "F", color: "#b23140" }, { in: "S", color: "#e0485c" }, { in: "K", color: "#b23140" }, { in: "M", color: "#e0485c" }], stats: [{ k: "O'RT", v: 81 }, { k: "ELO", v: 1780 }, { k: "G'AL", v: 58 }, { k: "KUB", v: 1 }], lead: "POMIR", cap: "Oltin · Dota 2 · 1× kubok" },
  { tier: "oltin", game: "mlbb", rating: 80, gameLabel: "MLBB", rank: "Oltin", name: "ALTAI", crest: "A", crest1: "#3fd08a", crest2: "#14713f", country: "Qozog'iston", cc: "kz", city: "Almati", founded: 2019, roster: [{ in: "S", color: "#16a34a" }, { in: "A", color: "#0f7a37" }, { in: "J", color: "#16a34a" }, { in: "T", color: "#0f7a37" }, { in: "B", color: "#16a34a" }], stats: [{ k: "O'RT", v: 79 }, { k: "ELO", v: 1740 }, { k: "G'AL", v: 55 }, { k: "KUB", v: 1 }], lead: "ALTAI", cap: "Oltin · MLBB · 1× kubok" },
  { tier: "kumush", game: "pubgm", rating: 71, gameLabel: "PUBGM", rank: "Kumush", name: "NOMAD", crest: "N", crest1: "#ef8a4a", crest2: "#9c4a16", country: "Qirg'iziston", cc: "kg", city: "Bishkek", founded: 2023, roster: [{ in: "L", color: "#d9682a" }, { in: "T", color: "#a84f1f" }, { in: "K", color: "#d9682a" }, { in: "S", color: "#a84f1f" }, { in: "M", color: "#d9682a" }], stats: [{ k: "O'RT", v: 70 }, { k: "ELO", v: 1520 }, { k: "G'AL", v: 47 }, { k: "KUB", v: 0 }], lead: "NOMAD", cap: "Kumush · PUBGM · yangi jamoa" },
];

function SecHead({ n, title, sub }: { n: string; title: string; sub: string }) {
  return (
    <div className="et-sh"><span className="num">{n}</span>
      <div><h2>{title}</h2><p>{sub}</p></div>
    </div>
  );
}

function Gallery({ data }: { data: CardData[] }) {
  return <div className="etc-gallery">{data.map((d, i) => <Card key={i} d={d} />)}</div>;
}

export function useCardTilt(dep?: unknown) {
  // kursor-reaktiv egilish + nur (faqat pointer:fine + motion-ok)
  useEffect(() => {
    const mq = window.matchMedia;
    if (mq("(prefers-reduced-motion: reduce)").matches) return;
    if (!mq("(pointer:fine)").matches) return;
    const cards = Array.from(document.querySelectorAll<HTMLElement>(".etc"));
    const cleanups: (() => void)[] = [];
    for (const c of cards) {
      const move = (e: PointerEvent) => {
        const r = c.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        c.style.transform = `perspective(820px) rotateY(${px * 9}deg) rotateX(${-py * 9}deg) translateY(-5px)`;
        c.style.setProperty("--mx", `${px * 100 + 50}%`);
        c.style.setProperty("--my", `${py * 100 + 50}%`);
        c.style.setProperty("--sheen-o", ".85");
      };
      const leave = () => { c.style.transform = ""; c.style.setProperty("--sheen-o", ""); };
      c.addEventListener("pointermove", move);
      c.addEventListener("pointerleave", leave);
      cleanups.push(() => { c.removeEventListener("pointermove", move); c.removeEventListener("pointerleave", leave); });
    }
    return () => cleanups.forEach(fn => fn());
  }, [dep]);
}

export default function EtCards() {
  useCardTilt();

  return (
    <div style={{ padding: "8px 0 24px" }}>
      <header className="et-rise" style={{ marginBottom: 22 }}>
        <h1 className="et-fh et-grad" style={{ fontSize: "clamp(26px,6vw,46px)", lineHeight: 1.02, margin: 0 }}>Kibersport kartalari</h1>
        <p style={{ color: "var(--es-mut)", maxWidth: "62ch", margin: "10px 0 0", fontSize: ".95rem", lineHeight: 1.55 }}>
          Har o'yinchi uchun bitta karta: reytingi (OVR), roli, o'yini, darajasi, 6 ko'rsatkichi, davlati va jamoasi.
          Uch tizim: <b>material</b> darajani, <b>rang</b> o'yinni, <b>ramka</b> esa milliy terma jamoaga chaqirilganini ko'rsatadi.
          Quyidagilar — dizayn namunasi (nomlar/raqamlar shartli, o'yinchi rasmi keyin qo'yiladi).
        </p>
      </header>

      <div className="etc-tierkey et-rise et-d1">
        <span className="etc-tk"><i style={{ background: "linear-gradient(135deg,#9a6c3f,#4a3119)" }} /><b>Bronza</b><s>50–64</s></span>
        <span className="etc-tk"><i style={{ background: "linear-gradient(135deg,#dde3e9,#8a929c)" }} /><b>Kumush</b><s>65–74</s></span>
        <span className="etc-tk"><i style={{ background: "linear-gradient(135deg,#f8df84,#b48a24)" }} /><b>Oltin</b><s>75–83</s></span>
        <span className="etc-tk"><i style={{ background: "linear-gradient(135deg,#d6f4f0,#4f949c)" }} /><b>Platina</b><s>84–89</s></span>
        <span className="etc-tk"><i style={{ background: "linear-gradient(135deg,#ecf7ff,#6aa5e6)" }} /><b>Olmos</b><s>90–94</s></span>
        <span className="etc-tk"><i style={{ background: "linear-gradient(135deg,#2a1a44,#0d0a18)" }} /><b>Afsona</b><s>95–99</s></span>
      </div>
      <div className="etc-keys et-rise et-d1">
        <span className="lbl">Ramka (T.J.):</span>
        <span className="etc-fk"><i className="ppink" />Milliy termada</span>
        <span className="etc-fk"><i className="bronze" />Termada emas</span>
        <span className="etc-fk"><i className="black" />Bronza daraja — termada emas</span>
      </div>

      <section style={{ marginTop: 34 }}>
        <SecHead n="01" title="Darajalar" sub="Oltita material. O'yinchi o'ssa karta yuqori darajaga ko'tariladi, nur kuchayadi. Olmos va undan yuqorida rasm tirik his bilan tebranadi." />
        <Gallery data={TIERS} />
      </section>

      <section style={{ marginTop: 44 }}>
        <SecHead n="02" title="Terma jamoa ramkasi (T.J.)" sub="Davlatlararo turnirga chaqirilsa ramka binafsha-pushti animatsion bo'ladi + 'T.J.' belgisi. Chaqirilmasa bronza (bronza darajada qora). Bitta daraja, ikki holat:" />
        <Gallery data={NATIONAL} />
      </section>

      <section style={{ marginTop: 44 }}>
        <SecHead n="03" title="O'yinlar bo'yicha" sub="Har o'yin o'z rangi va o'z 6 ko'rsatkichi bilan: CS2 to'q sariq, Dota qizil, PUBGM sariq, MLBB ko'k." />
        <Gallery data={BYGAME} />
      </section>

      <section style={{ marginTop: 44 }}>
        <SecHead n="04" title="Maxsus kartalar" sub="Daraja bilan emas, voqea bilan: turnir g'olibi (Chempion) yoki davr yulduzi (MVP). Geroy tirik his bilan tebranadi." />
        <Gallery data={SPECIAL} />
      </section>

      <section style={{ marginTop: 44 }}>
        <SecHead n="05" title="Shon-sharaf zali — Ikonalar" sub="Faoliyatini tugatgan afsonalar: oltin material, yulduz-nur emblema, oltin ramka. Reyting ularning cho'qqisi — o'zgarmaydi. Milliy termada o'ynagan bo'lsa ramka binafsha-pushti." />
        <Gallery data={IKONA} />
      </section>

      <section style={{ marginTop: 44 }}>
        <SecHead n="06" title="Jamoa kartalari" sub="Klub gerbi kartasi (o'yinchi karta oilasidan): material=jamoa kuchi (tarkib o'rtachasi/Elo), markazda gerb, pastda tarkib. Terma ramka o'rniga amaldagi chempionga oltin aylanuvchi ramka." />
        <div className="etc-gallery">{TEAMS.map((d, i) => <TeamCard key={i} d={d} />)}</div>
      </section>

      <section style={{ marginTop: 48 }}>
        <SecHead n="07" title="Reyting & qoidalar" sub="OVR tekshiriladigan ma'lumotdan hisoblanadi — tasodifiy emas." />
        <div style={{ background: "var(--es-soft)", border: "1px solid var(--es-soft-bd)", borderRadius: 14, padding: "14px 16px", fontFamily: "Chakra Petch, sans-serif", fontSize: ".86rem", color: "var(--es-fg)", overflowX: "auto", marginBottom: 16 }}>
          <code style={{ whiteSpace: "pre", lineHeight: 1.8 }}>{`baza = round( Σ statᵢ × rol_vazniᵢ )
OVR  = clamp( baza + turnir_bonus[0..+6] + faollik_bonus[0..+2], 1, 99 ) × integritet
Daraja: Bronza 50–64 · Kumush 65–74 · Oltin 75–83 · Platina 84–89 · Olmos 90–94 · Afsona 95–99`}</code>
        </div>
        <div className="et-grid et-g3">
          {[
            ["Ma'lumot manbai", "Mamlakat va bayroq — Humo ID'dan. Jamoa nomi va logosi — Humo eSport'dan (jamoasiz bo'lsa faqat davlat). Mamlakat o'zgartirish — Humo Support anketasi orqali, biz ko'rib chiqamiz."],
            ["Integritet darvozasi", "TOZA = to'liq reyting · TEKSHIRISH = cheklangan · BLOK = karta qulflanadi. Faceit/Steam banlari kunlik tekshiriladi."],
            ["Tirik his (Olmos+)", "Olmos, Afsona, Maxsus va Ikona kartalarida rasm MLBB skinlaridek tebranadi. To'liq 'qo'l harakati' uchun animatsion render kerak."],
            ["Ikona mezoni", "Faoliyatini tugatgan (≥12 oy faol emas) + cho'qqisi Olmos/Afsona (OVR≥90) yoki ≥2 chempionlik yoki milliy terma a'zosi. Tizim aniqlaydi, kengash tasdiqlaydi."],
            ["Retro turnirlar", "Shu kartalar retro turnir sahifasida ham ishlaydi: kim va qaysi darajada o'ynagani ko'rsatiladi — tarix shunday saqlanadi."],
            ["Daraja o'sishi", "O'yin ichi reyting + For Humo turnir natijasi + faollik qayta hisoblanadi (har match/turniredan keyin + kunlik) → OVR → karta avtomatik yuqori darajaga."],
          ].map(([t, b], i) => (
            <div key={i} style={{ background: "var(--es-card)", border: "1px solid var(--es-card-bd)", borderRadius: 14, padding: "15px 16px" }}>
              <h3 className="et-fh" style={{ fontSize: "1rem", margin: "0 0 6px" }}>{t}</h3>
              <p style={{ margin: 0, color: "var(--es-mut)", fontSize: ".82rem", lineHeight: 1.55 }}>{b}</p>
            </div>
          ))}
        </div>
        <p style={{ marginTop: 22, color: "var(--es-faint)", fontSize: ".78rem", lineHeight: 1.6 }}>
          Dizayn namunasi. Nomlar, jamoalar va raqamlar shartli; o'yinchi rasmi va haqiqiy reyting keyin, real match va tekshiruv ma'lumoti ulanganda chiqadi.
        </p>
      </section>
    </div>
  );
}
