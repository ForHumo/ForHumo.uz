import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

// Batch BG — Nexus jonli efir dinamik OG kartochkasi (1200×630)
// Telegram/WhatsApp ulashishda avto-render.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 3600;

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const stream = await prisma.nexusLiveStream.findUnique({
        where: { id },
        select: { title: true, category: true, status: true, peakViewers: true, profileId: true, hidden: true },
    });
    if (!stream || stream.hidden) return new Response("Not found", { status: 404 });

    const author = await prisma.userProfile.findUnique({
        where: { id: stream.profileId },
        select: { name: true, username: true, image: true },
    });

    const statusColor = stream.status === "LIVE" ? "#EF4444" : stream.status === "UPCOMING" ? "#10B981" : "#6B7280";
    const statusText = stream.status === "LIVE" ? "● JONLI EFIR" : stream.status === "UPCOMING" ? "REJADA" : "TUGAGAN";

    return new ImageResponse(
        (
            <div style={{
                display: "flex",
                width: "1200px",
                height: "630px",
                background: "linear-gradient(135deg, #050818 0%, #1a0530 50%, #300820 100%)",
                padding: 60,
                fontFamily: "system-ui, sans-serif",
                color: "#fff",
                position: "relative",
            }}>
                {/* Corner gradient glow */}
                <div style={{
                    position: "absolute", top: -100, right: -100,
                    width: 400, height: 400, borderRadius: 400,
                    background: `radial-gradient(circle, ${statusColor}55 0%, transparent 70%)`,
                }} />

                <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", justifyContent: "space-between", position: "relative" }}>
                    {/* Top: status badge + Nexus brand */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                        <div style={{
                            display: "flex", alignItems: "center", gap: 8,
                            padding: "10px 20px",
                            background: statusColor,
                            borderRadius: 12,
                            fontSize: 22, fontWeight: 900,
                        }}>{statusText}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 24, fontWeight: 700 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 40, background: "linear-gradient(135deg,#00CEC8,#2B3EE8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 900 }}>N</div>
                            <span style={{ color: "#fff" }}>Nexus · For Humo</span>
                        </div>
                    </div>

                    {/* Middle: title */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                        <div style={{
                            fontSize: 68, fontWeight: 900, lineHeight: 1.1,
                            display: "flex",
                            background: "linear-gradient(90deg, #fff 0%, rgba(255,255,255,0.85) 100%)",
                            backgroundClip: "text",
                            color: "transparent",
                        }}>
                            {stream.title.slice(0, 90)}
                        </div>
                        {stream.category && (
                            <div style={{ display: "flex", fontSize: 30, color: "rgba(255,255,255,0.65)", fontWeight: 600 }}>
                                #{stream.category}
                            </div>
                        )}
                    </div>

                    {/* Bottom: streamer info */}
                    <div style={{ display: "flex", alignItems: "center", gap: 20, width: "100%" }}>
                        {author?.image && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={author.image} alt="" width={80} height={80}
                                style={{ borderRadius: 80, border: `3px solid ${statusColor}` }} />
                        )}
                        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                            <div style={{ fontSize: 32, fontWeight: 800 }}>{author?.name || author?.username || "Streamer"}</div>
                            {author?.username && <div style={{ fontSize: 22, color: "rgba(255,255,255,0.55)" }}>@{author.username}</div>}
                        </div>
                        {stream.peakViewers > 0 && (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                                <div style={{ fontSize: 44, fontWeight: 900, color: "#F97316" }}>{stream.peakViewers.toLocaleString()}</div>
                                <div style={{ fontSize: 18, color: "rgba(255,255,255,0.55)" }}>eng yuqori</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        ),
        { width: 1200, height: 630 },
    );
}
