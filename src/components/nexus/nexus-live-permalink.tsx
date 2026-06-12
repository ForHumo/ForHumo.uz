"use client";

import { useRouter } from "@/i18n/routing";
import { NxLiveRoom } from "./nx-live-room";

// Jonli efir permalink — NxLiveRoom mustaqil to'liq ekran komponenti.
export function NexusLivePermalink({ id }: { id: string }) {
    const router = useRouter();
    return <NxLiveRoom streamId={id} onClose={() => router.push("/nexus")} />;
}
