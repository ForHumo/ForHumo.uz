"use client";

import { useRouter } from "@/i18n/routing";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { NxPlayerProvider } from "./nx-player-ctx";
import { NxSocialFeed } from "./nx-social-feed";
import { NxShare } from "./nx-share";

// ─────────────────────────────────────────────────────────────────────────────
// NexusPostPage — bitta postning ulashiladigan permalink sahifasi (/nexus/p/[id]).
// SPA shell tashqarisida, shuning uchun o'z provayder + header + share bilan o'raladi.
// NxSocialFeed postId rejimida bitta postni real yuklaydi (like/izoh/ovoz hammasi real).
// ─────────────────────────────────────────────────────────────────────────────
export function NexusPostPage({ id }: { id: string }) {
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
                        <MessageSquare className="w-4 h-4 flex-shrink-0" style={{ color: "#00CEC8" }} />
                        <span className="text-base font-black text-white truncate">Post</span>
                    </div>
                </header>

                <div className="pt-3 pb-28">
                    <NxSocialFeed postId={id} />
                </div>
            </div>
            <NxShare />
        </NxPlayerProvider>
    );
}
