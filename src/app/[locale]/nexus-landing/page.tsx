import type { Metadata } from "next";
import { NxLanding } from "@/components/nexus/nx-landing";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: "Humo Nexus — O'zbekistonning Super-App Platformasi",
        description: "Stream, blog, kanal, kino, musiqa, kitob — barchasi bitta joyda. O'zbek kreatorlari uchun eng kuchli platforma.",
    };
}

export default function NexusLandingPage() {
    return <NxLanding />;
}
