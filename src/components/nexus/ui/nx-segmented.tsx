"use client";

export function NxSegmented(
    { options, value, onChange }: { options: { key: string; label: string }[]; value: string; onChange: (k: string) => void },
) {
    return (
        <div style={{ display: "inline-flex", gap: 2, background: "var(--nx-surface-2)", border: "1px solid var(--nx-border)", borderRadius: 999, padding: 3 }}>
            {options.map((o) => {
                const on = o.key === value;
                return (
                    <button key={o.key} onClick={() => onChange(o.key)}
                        style={{
                            border: "none", background: on ? "var(--nx-elevated)" : "transparent",
                            color: on ? "var(--nx-text)" : "var(--nx-text-2)", fontWeight: 600, fontSize: 13,
                            padding: "6px 14px", borderRadius: 999, cursor: "pointer",
                            boxShadow: on ? "var(--nx-shadow)" : "none",
                        }}>{o.label}</button>
                );
            })}
        </div>
    );
}
