import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NxHumoMediaManager } from "@/components/nexus/nx-humo-media-manager";

type Slug = "gif" | "sticker";

const META: Record<Slug, { title: string; desc: string }> = {
    gif: {
        title: "GIF Agent — o'z GIF pack'laringizni yarating",
        desc: "Nexus va boshqa For Humo modullari uchun o'z GIF pack'laringizni yaratib boshqaring.",
    },
    sticker: {
        title: "Sticker Agent — o'z Sticker pack'laringizni yarating",
        desc: "Nexus chatlari uchun o'z Sticker pack'laringizni yaratib boshqaring.",
    },
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    if (slug !== "gif" && slug !== "sticker") return { title: "Agent" };
    const m = META[slug];
    return { title: m.title, description: m.desc };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    if (slug !== "gif" && slug !== "sticker") notFound();
    return <NxHumoMediaManager kind={slug === "gif" ? "GIF" : "STICKER"} />;
}
