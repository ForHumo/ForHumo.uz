// Ummi poza — shaffof webp'ni kontekst yoki id bo'yicha ko'rsatadi.
// Qayta-ishlatiladigan: UmmiTip, AI chat, 404, offline, bo'sh holatlar.
// Fon YO'Q (shaffof) — har joyда tabiiy "suzadi"; rangli brend elementi.

import { ummiPoseUrl, pickUmmiPose, type UmmiCtx } from "@/lib/ummi-poses";

export function UmmiPose({
    pose,
    ctx,
    size = 40,
    className = "",
    alt = "Ummi",
    priority,
}: {
    pose?: number;        // aniq poza id
    ctx?: UmmiCtx;        // yoki kontekst (topic/kind/state/...)
    size?: number;
    className?: string;
    alt?: string;
    priority?: boolean;   // (hozircha oddiy <img>; next/image kerak bo'lsa keyin)
}) {
    const id = pose ?? pickUmmiPose(ctx ?? {});
    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={ummiPoseUrl(id)}
            alt={alt}
            width={size}
            height={size}
            loading={priority ? "eager" : "lazy"}
            draggable={false}
            className={`object-contain select-none ${className}`}
        />
    );
}
