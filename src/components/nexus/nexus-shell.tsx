"use client";

import { useState, useEffect } from "react";
import { NxHeader } from "./nx-header";
import { NxDock, type NxTab } from "./nx-dock";
import { NxSidebar } from "./nx-sidebar";
import { NxSettings } from "./nx-settings";
import { NxPlayerProvider, useNxPlayer } from "./nx-player-ctx";
import { NxMusicPlayer } from "./nx-music-player";
import { NxVideoPlayer } from "./nx-video-player";
import { NxShortsPlayer } from "./nx-shorts-player";
import { NxSearch } from "./nx-search";
import { FeedView, VideoView, LiveView, MediaView, SocialView, ProfileView } from "./nx-views";
import { NxNotifications } from "./nx-notifications";
import { NxMessages } from "./nx-messages";
import { NxIncomingCall } from "./nx-incoming-call";
import { NxGroupCall } from "./nx-group-call";
import { NxGroupIncoming } from "./nx-group-incoming";
import { NxLiveChat } from "./nx-live-chat";
import { NxPlaylist } from "./nx-playlist";
import { NxStoriesViewer } from "./nx-stories-viewer";
import { NxExplore } from "./nx-explore";
import { NxSaved } from "./nx-saved";
import { NxCalls } from "./nx-calls";
import { NxSubscriptions } from "./nx-subscriptions";
import { NxGoLive } from "./nx-go-live";
import { NxCreatePost } from "./nx-create-post";
import { NxStoryCreate } from "./nx-story-create";
import { NxShare } from "./nx-share";
import { NxReport } from "./nx-report";

// ─────────────────────────────────────────────────────────────────────────────
// Tab-ga mos view
// ─────────────────────────────────────────────────────────────────────────────
function renderView(tab: NxTab) {
    switch (tab) {
        case "video":   return <VideoView />;
        case "live":    return <LiveView />;
        case "media":   return <MediaView />;
        case "social":  return <SocialView />;
        case "profile": return <ProfileView />;
        default:        return <FeedView />;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// NexusShell — asosiy qobiq (faqat REAL komponentlar)
// ─────────────────────────────────────────────────────────────────────────────
export function NexusShell() {
    const [activeTab, setActiveTab]       = useState<NxTab>("feed");
    const [sidebarOpen, setSidebarOpen]   = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);

    // Header avatari kabi tashqi joylardan tab almashtirish
    useEffect(() => {
        const h = (e: Event) => {
            const tab = (e as CustomEvent).detail as NxTab | undefined;
            if (tab) setActiveTab(tab);
        };
        window.addEventListener("nexus:navigate", h);
        return () => window.removeEventListener("nexus:navigate", h);
    }, []);

    return (
        <NxPlayerProvider>
            <div
                className="w-full h-full flex flex-col overflow-hidden text-white select-none"
                style={{ background: "#050818" }}
            >
                <NexusBackground />

                <NxHeader
                    onMenuOpen={() => setSidebarOpen(true)}
                    onSettingsOpen={() => setSettingsOpen(true)}
                />

                <main className="relative z-10 flex-1 overflow-y-auto">
                    {renderView(activeTab)}
                </main>

                <NxDock active={activeTab} onChange={setActiveTab} />
                <NxMusicPlayer />

                <NxSidebar
                    open={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                    onOpenSettings={() => { setSidebarOpen(false); setSettingsOpen(true); }}
                    onNavigate={tab => { setSidebarOpen(false); setActiveTab(tab); }}
                />

                <NxSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} />

                {/* Media pleyerlari */}
                <NxVideoPlayer />
                <NxShortsPlayer />
                <NxPlaylist />

                {/* Panellar */}
                <NxSearch />
                <NxNotifications />
                <MessagesWithBridge />
                <NxLiveChat />
                <NxStoriesViewer />
                <NxExplore />
                <NxSaved />
                <NxCalls />
                <NxSubscriptions />

                {/* Chaqiruv oynalari (WebRTC + LiveKit) */}
                <NxIncomingCall />
                <NxGroupCall />
                <NxGroupIncoming />

                {/* Yaratish */}
                <NxGoLive />
                <NxCreatePost />
                <NxStoryCreate />

                {/* Yordamchi */}
                <NxShare />
                <NxReport />
            </div>
        </NxPlayerProvider>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// DM ko'prigi — /nexus?dm=username → xabarlar panelini shu suhbatga ochadi
// ─────────────────────────────────────────────────────────────────────────────
function MessagesWithBridge() {
    const { openDM, dmTarget } = useNxPlayer();
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const dm = params.get("dm");
        if (dm) {
            openDM(dm);
            params.delete("dm");
            const qs = params.toString();
            window.history.replaceState(null, "", window.location.pathname + (qs ? `?${qs}` : ""));
        }
    }, [openDM]);
    return <NxMessages openWithUsername={dmTarget} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fon
// ─────────────────────────────────────────────────────────────────────────────
function NexusBackground() {
    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
            <div className="absolute" style={{
                top: "-15%", left: "-10%", width: "60%", height: "60%",
                background: "radial-gradient(ellipse at center, rgba(43,62,232,0.22) 0%, rgba(43,62,232,0.08) 40%, transparent 70%)",
            }} />
            <div className="absolute" style={{
                bottom: "-15%", right: "-10%", width: "60%", height: "60%",
                background: "radial-gradient(ellipse at center, rgba(0,206,200,0.18) 0%, rgba(0,206,200,0.06) 40%, transparent 70%)",
            }} />
            <div className="absolute" style={{
                top: "30%", left: "25%", width: "50%", height: "40%",
                background: "radial-gradient(ellipse at center, rgba(43,62,232,0.06) 0%, transparent 70%)",
            }} />
            <div className="absolute inset-0" style={{
                backgroundImage: "radial-gradient(circle, rgba(43,62,232,0.12) 1px, transparent 1px)",
                backgroundSize: "32px 32px",
                maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)",
                WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)",
            }} />
        </div>
    );
}
