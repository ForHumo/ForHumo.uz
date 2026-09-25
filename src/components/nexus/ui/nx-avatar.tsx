"use client";
// Nexus avatar — DOIRA emas, rounded-square (Nexus identligi, founder qarori).
// Ixtiyoriy rasm URL (Google/Blob — <img>, domen cheklovisiz), yo'q bo'lsa bosh harf.

const SIZE = { sm: 24, md: 32, lg: 42, xl: 56 } as const;

export function NxAvatar({
    src, name, size = "lg", online,
}: { src?: string | null; name?: string | null; size?: keyof typeof SIZE; online?: boolean }) {
    const px = SIZE[size];
    const initial = (name?.trim()?.[0] ?? "?").toUpperCase();
    return (
        <span style={{ position: "relative", display: "inline-block", width: px, height: px }}>
            <span
                style={{
                    width: px, height: px, borderRadius: "var(--nx-r-avatar)", overflow: "hidden",
                    display: "grid", placeItems: "center", color: "#fff", fontWeight: 700,
                    fontSize: px * 0.42, background: "linear-gradient(135deg,#4C77FF,#7A5CFF)",
                }}
            >
                {src
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={src} alt={name ?? ""} width={px} height={px} style={{ objectFit: "cover", width: px, height: px }} />
                    : initial}
            </span>
            {online && (
                <span style={{
                    position: "absolute", right: -1, bottom: -1, width: px * 0.28, height: px * 0.28,
                    borderRadius: 999, background: "var(--nx-ok)", border: "2px solid var(--nx-bg)",
                }} />
            )}
        </span>
    );
}
