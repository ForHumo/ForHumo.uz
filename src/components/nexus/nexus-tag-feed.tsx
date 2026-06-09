"use client";

import { useRouter } from "@/i18n/routing";
import { ArrowLeft, Hash } from "lucide-react";
import { NxPlayerProvider } from "./nx-player-ctx";
import { NxSocialFeed } from "./nx-social-feed";
import { NxShare } from "./nx-share";

export function NexusTagFeed({ tag }: { tag: string }) {
    const router = useRouter();
    return (
        <NxPlayerProvider>
            <div className="h-full overflow-y-auto text-white" style={{ background: "#050818" }}>
                <header className="sticky top-0 z-20 flex items-center gap-3 px-3 h-14 backdrop-blur-xl"
                    style={{ background: "rgba(5,8,24,0.80)", borderBottom: "1px solid rgba(43,62,232,0.18)" }}>
                    <button onClick={() => router.back()} className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: "rgba(43,62,232,0.12)" }}>
                        <ArrowLeft className="w-4 h-4 text-white" />
                    </button>
                    <div className="flex items-center gap-1.5 min-w-0">
                        <Hash className="w-4 h-4 flex-shrink-0" style={{ color: "#00CEC8" }} />
                        <span className="text-base font-black text-white truncate">{tag}</span>
                    </div>
                </header>

                <div className="pt-2 pb-28">
                    <NxSocialFeed tag={tag} />
                </div>
            </div>
            <NxShare />
        </NxPlayerProvider>
    );
}
