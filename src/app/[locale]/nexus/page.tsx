import type { Metadata } from "next";
import { NexusShell } from "@/components/nexus/nexus-shell";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: "Humo Nexus",
        description: "Stream, blog, kanal, guruh, kino, musiqa — barchasi bitta joyda.",
    };
}

export default function NexusPage() {
    return <NexusShell />;
}
