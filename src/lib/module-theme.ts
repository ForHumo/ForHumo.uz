// For Humo modul rang tizimi — yagona manba.
//
// Global komponentlar (SupportDock, NavbarSupportButton, notif toasts)
// hozirgi modul rangida ko'rinsin — foydalanuvchi kognitiv yukni kamaytiradi.
//
// Har modul o'z ranglariga ega:
//   - bn        — tilla (dark palette)
//   - belis     — olive-gold (kunduzgi, hashamatli)
//   - market    — yashil
//   - nexus     — blue-cyan
//   - pay       — cyan-teal
//   - esport    — emerald-lime (o'yin)
//   - ai        — violet-fuchsia
//   - id        — blue-indigo
//   - support   — sky (universal)
//
// Ishlatish:
//   const t = moduleTheme(currentModule);
//   <div style={{ background: t.gradient }}>...
//   <button style={{ background: t.primary, color: t.onPrimary }}>...

export type ModuleKey =
    | "bn" | "belis" | "market" | "nexus"
    | "pay" | "esport" | "ai" | "id" | "support" | "default";

export interface ModuleTheme {
    /** Asosiy rang (solid) — primary tugma foni */
    primary: string;
    /** Ochroq soft variant — chip/subtle background */
    soft: string;
    /** Primary ustidagi matn */
    onPrimary: string;
    /** Chegara ranggi (soft border) */
    border: string;
    /** Gradient (primary CTA uchun) */
    gradient: string;
    /** Katta soya (glow effekt) */
    shadow: string;
    /** Modul yorlig'i (foydalanuvchi tilida — hozircha uz) */
    label: string;
    /** Ushbu modul temasi qorong'imi (matn oq bo'lishi kerakligini bilish uchun) */
    dark: boolean;
}

const THEMES: Record<ModuleKey, ModuleTheme> = {
    bn: {
        primary: "#F5B301",
        soft: "rgba(245, 179, 1, 0.14)",
        onPrimary: "#0B0B0F",
        border: "rgba(245, 179, 1, 0.32)",
        gradient: "linear-gradient(135deg, #F5B301 0%, #B8951F 100%)",
        shadow: "0 12px 32px rgba(245, 179, 1, 0.35)",
        label: "Bozor Narxida",
        dark: true,
    },
    belis: {
        primary: "#D4AF37",
        soft: "rgba(212, 175, 55, 0.14)",
        onPrimary: "#3A3520",
        border: "rgba(166, 174, 138, 0.35)",
        gradient: "linear-gradient(135deg, #EBD79A 0%, #D4AF37 50%, #B8951F 100%)",
        shadow: "0 12px 32px rgba(212, 175, 55, 0.35)",
        label: "Belis",
        dark: false,
    },
    market: {
        primary: "#059669",
        soft: "rgba(5, 150, 105, 0.12)",
        onPrimary: "#FFFFFF",
        border: "rgba(5, 150, 105, 0.28)",
        gradient: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
        shadow: "0 12px 32px rgba(5, 150, 105, 0.30)",
        label: "Humo Market",
        dark: false,
    },
    nexus: {
        primary: "#2B3EE8",
        soft: "rgba(43, 62, 232, 0.12)",
        onPrimary: "#FFFFFF",
        border: "rgba(43, 62, 232, 0.28)",
        gradient: "linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)",
        shadow: "0 12px 32px rgba(37, 99, 235, 0.30)",
        label: "Humo Nexus",
        dark: false,
    },
    pay: {
        primary: "#0891B2",
        soft: "rgba(8, 145, 178, 0.12)",
        onPrimary: "#FFFFFF",
        border: "rgba(8, 145, 178, 0.28)",
        gradient: "linear-gradient(135deg, #06B6D4 0%, #0F766E 100%)",
        shadow: "0 12px 32px rgba(6, 182, 212, 0.30)",
        label: "For Pay",
        dark: false,
    },
    esport: {
        primary: "#16A34A",
        soft: "rgba(22, 163, 74, 0.12)",
        onPrimary: "#FFFFFF",
        border: "rgba(22, 163, 74, 0.28)",
        gradient: "linear-gradient(135deg, #22C55E 0%, #84CC16 100%)",
        shadow: "0 12px 32px rgba(34, 197, 94, 0.30)",
        label: "Humo eSport",
        dark: false,
    },
    ai: {
        primary: "#7C3AED",
        soft: "rgba(124, 58, 237, 0.12)",
        onPrimary: "#FFFFFF",
        border: "rgba(124, 58, 237, 0.28)",
        gradient: "linear-gradient(135deg, #8B5CF6 0%, #D946EF 100%)",
        shadow: "0 12px 32px rgba(139, 92, 246, 0.30)",
        label: "Humo AI",
        dark: false,
    },
    id: {
        primary: "#2563EB",
        soft: "rgba(37, 99, 235, 0.12)",
        onPrimary: "#FFFFFF",
        border: "rgba(37, 99, 235, 0.28)",
        gradient: "linear-gradient(135deg, #3B82F6 0%, #4F46E5 100%)",
        shadow: "0 12px 32px rgba(59, 130, 246, 0.30)",
        label: "Humo ID",
        dark: false,
    },
    support: {
        primary: "#0EA5E9",
        soft: "rgba(14, 165, 233, 0.12)",
        onPrimary: "#FFFFFF",
        border: "rgba(14, 165, 233, 0.28)",
        gradient: "linear-gradient(135deg, #38BDF8 0%, #06B6D4 100%)",
        shadow: "0 12px 32px rgba(14, 165, 233, 0.30)",
        label: "Humo Support",
        dark: false,
    },
    default: {
        primary: "#2563EB",
        soft: "rgba(37, 99, 235, 0.10)",
        onPrimary: "#FFFFFF",
        border: "rgba(37, 99, 235, 0.24)",
        gradient: "linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)",
        shadow: "0 12px 32px rgba(59, 130, 246, 0.25)",
        label: "For Humo",
        dark: false,
    },
};

/** Modulga qarab yagona rang temasi. Noma'lum bo'lsa default (blue-cyan) qaytadi. */
export function moduleTheme(mod: string | null | undefined): ModuleTheme {
    if (!mod) return THEMES.default;
    const key = mod.toLowerCase() as ModuleKey;
    return THEMES[key] ?? THEMES.default;
}

/** Pathname/host'dan modulni aniqlaydi (SupportDock detectModule bilan mos). */
export function detectModuleFromPath(pathname: string, host?: string | null): ModuleKey {
    const h = (host ?? "").toLowerCase();
    if (h.startsWith("bozornarxida.")) return "bn";
    if (h.startsWith("belis.")) return "belis";

    // /uz/bn, /uz/belis, /uz/nexus, ...
    const m = pathname.match(/^\/[a-z]{2}\/([a-z-]+)/);
    const seg = m?.[1] ?? "";
    if (seg === "bn") return "bn";
    if (seg === "belis") return "belis";
    if (seg === "market") return "market";
    if (seg === "nexus") return "nexus";
    if (seg === "pay") return "pay";
    if (seg === "esport" || seg === "teams" || seg === "players" || seg === "tournaments") return "esport";
    if (seg === "ai") return "ai";
    if (seg === "id") return "id";
    if (seg === "support") return "support";
    return "default";
}
