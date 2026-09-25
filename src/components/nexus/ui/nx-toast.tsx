"use client";
// Nexus toast — native alert() o'rniga (in-app, non-blocking). SP2'da 48 ta alert() shu bilan almashtiriladi.
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type Tone = "info" | "success" | "error";
type Toast = { id: number; text: string; tone: Tone };

const Ctx = createContext<(text: string, tone?: Tone) => void>(() => { });
export const useToast = () => useContext(Ctx);

export function NxToastProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<Toast[]>([]);
    const push = useCallback((text: string, tone: Tone = "info") => {
        const id = Date.now() + Math.random();
        setItems((p) => [...p, { id, text, tone }]);
        setTimeout(() => setItems((p) => p.filter((t) => t.id !== id)), 3200);
    }, []);
    const color = (t: Tone) => t === "success" ? "var(--nx-ok)" : t === "error" ? "var(--nx-danger)" : "var(--nx-accent)";
    return (
        <Ctx.Provider value={push}>
            {children}
            <div style={{ position: "fixed", left: 0, right: 0, bottom: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, zIndex: 9999, pointerEvents: "none" }}>
                {items.map((t) => (
                    <div key={t.id} style={{
                        background: "var(--nx-elevated)", color: "var(--nx-text)", border: "1px solid var(--nx-border)",
                        borderLeft: `3px solid ${color(t.tone)}`, borderRadius: "var(--nx-r-md)", boxShadow: "var(--nx-shadow)",
                        padding: "12px 16px", fontSize: 14, fontWeight: 500, maxWidth: 420,
                    }}>{t.text}</div>
                ))}
            </div>
        </Ctx.Provider>
    );
}
