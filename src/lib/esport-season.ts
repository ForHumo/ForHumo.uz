// Turnir posteri (4 fasl) — nom bo'yicha moslanadi (turnir nomlari tarjima qilinmaydi).
// Rasmlar: public/esport/seasons/{Autumn,Winter,Spring,Summer}-Tournament.png (784x1168 portret).
export function seasonPoster(name: string | null | undefined, startsAt?: string | Date | null): string | null {
    const n = (name || "").toLowerCase();
    const base = "/esport/seasons/";
    if (n.includes("autumn") || n.includes("kuz")) return base + "Autumn-Tournament.png";
    if (n.includes("winter") || n.includes("qish")) return base + "Winter-Tournament.png";
    if (n.includes("spring") || n.includes("bahor")) return base + "Spring-Tournament.png";
    if (n.includes("summer") || n.includes("yoz") || n.includes("grand")) return base + "Summer-Tournament.png";
    // Zaxira: boshlanish oyi bo'yicha (Noy=Kuz, Fev=Qish, May=Bahor, Avg=Yoz)
    if (startsAt) {
        const m = new Date(startsAt).getMonth();
        if (m === 10) return base + "Autumn-Tournament.png";
        if (m === 1) return base + "Winter-Tournament.png";
        if (m === 4) return base + "Spring-Tournament.png";
        if (m === 7) return base + "Summer-Tournament.png";
    }
    return null;
}
