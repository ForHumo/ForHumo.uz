// Story slide overlays — matn va sticker'lar tuzilishi.
// Klient (creator) tomonda tahrirlanadi, JSON sifatida NexusStorySlide.overlays'ga saqlanadi.
// Viewer'da o'sha JSON'dan qayta tiklanadi.

export interface TextOverlay {
    id: string;
    kind: "text";
    text: string;           // Matn (yoki bitta emoji)
    x: number;              // 0-100% (o'zining markazi)
    y: number;              // 0-100%
    color: string;          // "#fff", "#000", ...
    bg?: string | null;     // Fon rangi (highlight — Instagram uslubi)
    size: number;           // px (16-72)
    rotation: number;       // -180 dan 180 gacha
    isEmoji?: boolean;      // true bo'lsa emoji sifatida ko'rsatiladi (kattaroq)
}

export interface StickerOverlay {
    id: string;
    kind: "sticker";
    emoji: string;
    x: number;
    y: number;
    size: number;           // px (32-140)
    rotation: number;
}

export type StoryOverlay = TextOverlay | StickerOverlay;

export interface StoryOverlays {
    items: StoryOverlay[];
}

// Yordamchi — bo'sh JSON'ni normalizatsiya qilish
export function normalizeOverlays(raw: unknown): StoryOverlays {
    if (!raw || typeof raw !== "object") return { items: [] };
    const r = raw as { items?: unknown[]; texts?: unknown[] };
    // Backward compat: eski format { texts: [...] }
    if (Array.isArray(r.texts) && !Array.isArray(r.items)) {
        return {
            items: r.texts.map((t, i) => {
                const tt = t as { text?: string; color?: string; size?: number; y?: number; x?: number };
                return {
                    id: `legacy-${i}`, kind: "text" as const,
                    text: String(tt.text || ""),
                    x: typeof tt.x === "number" ? tt.x : 50,
                    y: typeof tt.y === "number" ? tt.y : 50,
                    color: typeof tt.color === "string" ? tt.color : "#fff",
                    size: typeof tt.size === "number" ? tt.size : 32,
                    rotation: 0,
                };
            }).filter(t => t.text.trim()),
        };
    }
    if (!Array.isArray(r.items)) return { items: [] };
    return {
        items: r.items.map(x => {
            const o = x as Record<string, unknown>;
            const kind = o.kind === "sticker" ? "sticker" : "text";
            const base = {
                id: typeof o.id === "string" ? o.id : `o-${Date.now()}-${Math.random()}`,
                x: typeof o.x === "number" ? Math.max(0, Math.min(100, o.x)) : 50,
                y: typeof o.y === "number" ? Math.max(0, Math.min(100, o.y)) : 50,
                rotation: typeof o.rotation === "number" ? Math.max(-180, Math.min(180, o.rotation)) : 0,
            };
            if (kind === "sticker") {
                return {
                    ...base, kind: "sticker" as const,
                    emoji: typeof o.emoji === "string" ? o.emoji.slice(0, 20) : "❤️",
                    size: typeof o.size === "number" ? Math.max(16, Math.min(200, o.size)) : 80,
                } as StickerOverlay;
            }
            return {
                ...base, kind: "text" as const,
                text: typeof o.text === "string" ? o.text.slice(0, 300) : "",
                color: typeof o.color === "string" ? o.color : "#fff",
                bg: typeof o.bg === "string" ? o.bg : null,
                size: typeof o.size === "number" ? Math.max(12, Math.min(96, o.size)) : 32,
                isEmoji: typeof o.isEmoji === "boolean" ? o.isEmoji : false,
            } as TextOverlay;
        }).filter(o => (o.kind === "text" ? (o as TextOverlay).text.trim() : true)),
    };
}

// Popular sticker emojilar (6 rang o'rniga to'liq to'plam)
export const STICKER_EMOJIS = [
    "❤️", "😂", "😍", "🥰", "😎", "🤩", "🥳", "🔥", "✨", "💯",
    "👍", "👏", "🙌", "🤝", "💪", "🎉", "🎊", "🎁", "⭐", "💫",
    "😊", "😉", "🙂", "😇", "🤔", "😴", "😭", "🤣", "😱", "🤯",
    "☀️", "🌙", "⚡", "🌈", "☕", "🍕", "🎵", "🎨", "📸", "🚗",
];

export const TEXT_COLORS = ["#FFFFFF", "#000000", "#F59E0B", "#EF4444", "#00CEC8", "#8B5CF6", "#10B981", "#EC4899", "#3B82F6"];
export const HIGHLIGHT_BG_COLORS = ["transparent", "#000000", "#FFFFFF", "#EF4444", "#F59E0B", "#00CEC8"];
