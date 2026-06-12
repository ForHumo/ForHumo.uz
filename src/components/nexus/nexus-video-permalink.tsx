"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "@/i18n/routing";
import { NxPlayerProvider, useNxPlayer } from "./nx-player-ctx";
import { NxVideoPlayer } from "./nx-video-player";
import { NxShare } from "./nx-share";
import { Loader2 } from "lucide-react";

// Video player'ni id bo'yicha avtomatik ochadi; yopilganda /nexus ga qaytaradi.
function Opener({ id }: { id: string }) {
    const { openVideo, videoOpen } = useNxPlayer();
    const router = useRouter();
    const opened = useRef(false);
    useEffect(() => {
        openVideo({ id, title: "", author: "", avatar: "", image: "", views: "", duration: "" });
        opened.current = true;
    }, [id, openVideo]);
    useEffect(() => {
        if (opened.current && !videoOpen) router.push("/nexus");
    }, [videoOpen, router]);
    return null;
}

export function NexusVideoPermalink({ id }: { id: string }) {
    return (
        <NxPlayerProvider>
            <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#050818" }}>
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#2B3EE8" }} />
            </div>
            <Opener id={id} />
            <NxVideoPlayer />
            <NxShare />
        </NxPlayerProvider>
    );
}
