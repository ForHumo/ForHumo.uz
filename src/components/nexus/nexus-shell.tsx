"use client";

// ─────────────────────────────────────────────────────────────────────────────
// NexusShell — 1-qadam: Shell + Fon
// Keyinchalik bu yerga Header, Dock, Feed va boshqa komponentlar qo'shiladi
// ─────────────────────────────────────────────────────────────────────────────

export function NexusShell() {
    return (
        <div
            className="w-full h-full flex flex-col overflow-hidden text-white select-none"
            style={{ background: "#050818" }}
        >
            {/* ── Ambient background orbs ───────────────────────────── */}
            <NexusBackground />

            {/* ── Placeholder — keyingi qadamlarda o'zgaradi ─────────── */}
            <div className="relative z-10 flex-1 flex items-center justify-center">
                <NexusWatermark />
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Fon: ambient gradient orbs + dot grid
// ─────────────────────────────────────────────────────────────────────────────
function NexusBackground() {
    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>

            {/* Chap yuqori — ko'k (#2B3EE8) */}
            <div
                className="absolute"
                style={{
                    top: "-15%",
                    left: "-10%",
                    width: "60%",
                    height: "60%",
                    background: "radial-gradient(ellipse at center, rgba(43,62,232,0.22) 0%, rgba(43,62,232,0.08) 40%, transparent 70%)",
                    filter: "blur(1px)",
                }}
            />

            {/* O'ng pastki — siyan (#00CEC8) */}
            <div
                className="absolute"
                style={{
                    bottom: "-15%",
                    right: "-10%",
                    width: "60%",
                    height: "60%",
                    background: "radial-gradient(ellipse at center, rgba(0,206,200,0.18) 0%, rgba(0,206,200,0.06) 40%, transparent 70%)",
                    filter: "blur(1px)",
                }}
            />

            {/* Markaz — ikkalasining aralashuvi */}
            <div
                className="absolute"
                style={{
                    top: "30%",
                    left: "25%",
                    width: "50%",
                    height: "40%",
                    background: "radial-gradient(ellipse at center, rgba(43,62,232,0.06) 0%, transparent 70%)",
                }}
            />

            {/* Nuqtali grid texture */}
            <div
                className="absolute inset-0"
                style={{
                    backgroundImage: `radial-gradient(circle, rgba(43,62,232,0.12) 1px, transparent 1px)`,
                    backgroundSize: "32px 32px",
                    maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)",
                    WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)",
                }}
            />

        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Vaqtinchalik watermark — Header qo'shilganda o'chib ketadi
// ─────────────────────────────────────────────────────────────────────────────
function NexusWatermark() {
    return (
        <div className="flex flex-col items-center gap-6 opacity-30">
            {/* Gradient N harfi */}
            <div
                className="text-[120px] md:text-[180px] font-black leading-none tracking-tighter select-none"
                style={{
                    background: "linear-gradient(135deg, #2B3EE8 0%, #00CEC8 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    filter: "blur(0.5px)",
                }}
            >
                N
            </div>
            <p
                className="text-sm font-bold tracking-[0.4em] uppercase"
                style={{ color: "rgba(43,62,232,0.60)" }}
            >
                Nexus — qurilmoqda
            </p>
        </div>
    );
}
