import type { Metadata } from "next";
import { NexusShell } from "@/components/nexus/nexus-shell";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
    return { title: "Humo Nexus" };
}

export default function NexusPage() {
    return <NexusShell />;
}
