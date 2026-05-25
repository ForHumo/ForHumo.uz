"use client";

import { useState } from "react";
import { NxHeader } from "./nx-header";
import { NxDock, type NxTab } from "./nx-dock";
import { NxSidebar } from "./nx-sidebar";
import { NxSettings } from "./nx-settings";
import { NxPlayerProvider } from "./nx-player-ctx";
import { NxMusicPlayer } from "./nx-music-player";
import { NxVideoPlayer } from "./nx-video-player";
import { NxShortsPlayer } from "./nx-shorts-player";
import { NxSearch } from "./nx-search";
import { NxCreatorStudio } from "./nx-creator-studio";
import { NxPro } from "./nx-pro";
import { NxChannel } from "./nx-channel";
import { FeedView, VideoView, LiveView, MediaView, SocialView, ProfileView } from "./nx-views";
import { NxNotifications }  from "./nx-notifications";
import { NxMessages }        from "./nx-messages";
import { NxComments }        from "./nx-comments";
import { NxLiveChat }        from "./nx-live-chat";
import { NxPlaylist }        from "./nx-playlist";
import { NxAnalytics }       from "./nx-analytics";
import { NxStoriesViewer }   from "./nx-stories-viewer";
import { NxExplore }         from "./nx-explore";
import { NxSaved }           from "./nx-saved";
import { NxGroups }          from "./nx-groups";
import { NxCalls }           from "./nx-calls";
import { NxSubscriptions }   from "./nx-subscriptions";
import { NxSpaces }          from "./nx-spaces";
import { NxMarketplace }     from "./nx-marketplace";
import { NxWallet }          from "./nx-wallet";
import { NxEvents }          from "./nx-events";
import { NxDownloads }       from "./nx-downloads";
import { NxJobs }            from "./nx-jobs";
import { NxTrending }        from "./nx-trending";
import { NxAI }              from "./nx-ai";
import { NxGoLive }          from "./nx-go-live";
import { NxGifts }           from "./nx-gifts";
import { NxLeaderboard }     from "./nx-leaderboard";
import { NxCreatePost }      from "./nx-create-post";
import { NxSuggestions }     from "./nx-suggestions";
import { NxWatchParty }      from "./nx-watch-party";
import { NxHighlights }      from "./nx-highlights";
import { NxLyrics }          from "./nx-lyrics";
import { NxQrShare }         from "./nx-qr-share";
import { NxCommunity }       from "./nx-community";
import { NxClips }           from "./nx-clips";
import { NxSuperChat }       from "./nx-super-chat";
import { NxAchievements }    from "./nx-achievements";
import { NxMiniApps }        from "./nx-mini-apps";
import { NxSchedule }        from "./nx-schedule";
import { NxShop }            from "./nx-shop";
import { NxReader }          from "./nx-reader";
import { NxFundraiser }      from "./nx-fundraiser";
import { NxForum }           from "./nx-forum";
import { NxPodcasts }        from "./nx-podcasts";
import { NxCollab }          from "./nx-collab";
import { NxReminders }       from "./nx-reminders";
import { NxPolls }           from "./nx-polls";
import { NxStats }           from "./nx-stats";
import { NxDrafts }          from "./nx-drafts";
import { NxBadges }          from "./nx-badges";
import { NxReport }          from "./nx-report";
import { NxAffiliate }       from "./nx-affiliate";
import { NxAlbums }          from "./nx-albums";
import { NxStoryCreate }     from "./nx-story-create";
import { NxMeeting }         from "./nx-meeting";
import { NxShare }           from "./nx-share";

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
// NexusShell — asosiy qobiq
// ─────────────────────────────────────────────────────────────────────────────
export function NexusShell() {
    const [activeTab, setActiveTab]       = useState<NxTab>("feed");
    const [sidebarOpen, setSidebarOpen]   = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);

    return (
        <NxPlayerProvider>
            <div
                className="w-full h-full flex flex-col overflow-hidden text-white select-none"
                style={{ background: "#050818" }}
            >
                {/* ── Ambient background ────────────────────────────────── */}
                <NexusBackground />

                {/* ── Header ────────────────────────────────────────────── */}
                <NxHeader
                    onMenuOpen={() => setSidebarOpen(true)}
                    onSettingsOpen={() => setSettingsOpen(true)}
                />

                {/* ── Asosiy kontent ────────────────────────────────────── */}
                <main className="relative z-10 flex-1 overflow-y-auto">
                    {renderView(activeTab)}
                </main>

                {/* ── Dock ──────────────────────────────────────────────── */}
                <NxDock active={activeTab} onChange={setActiveTab} />

                {/* ── Musiqa mini-player ────────────────────────────────── */}
                <NxMusicPlayer />

                {/* ── Sidebar ───────────────────────────────────────────── */}
                <NxSidebar
                    open={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                    onOpenSettings={() => { setSidebarOpen(false); setSettingsOpen(true); }}
                />

                {/* ── Settings ──────────────────────────────────────────── */}
                <NxSettings
                    open={settingsOpen}
                    onClose={() => setSettingsOpen(false)}
                />

                {/* ── Video player ──────────────────────────────────────── */}
                <NxVideoPlayer />

                {/* ── Shorts player ─────────────────────────────────────── */}
                <NxShortsPlayer />

                {/* ── Qidiruv ───────────────────────────────────────────── */}
                <NxSearch />

                {/* ── Creator Studio ────────────────────────────────────── */}
                <NxCreatorStudio />

                {/* ── Nexus Pro obuna ───────────────────────────────────── */}
                <NxPro />

                {/* ── Kanal modali ───────────────────────────────────────── */}
                <NxChannel />

                {/* ── Bildirishnomalar ───────────────────────────────────── */}
                <NxNotifications />

                {/* ── Xabarlar / DM ─────────────────────────────────────── */}
                <NxMessages />

                {/* ── Izohlar ───────────────────────────────────────────── */}
                <NxComments />

                {/* ── Jonli efir chat ───────────────────────────────────── */}
                <NxLiveChat />

                {/* ── Playlistlar ───────────────────────────────────────── */}
                <NxPlaylist />

                {/* ── Analitika ─────────────────────────────────────────── */}
                <NxAnalytics />

                {/* ── Stories viewer ────────────────────────────────────── */}
                <NxStoriesViewer />

                {/* ── Explore / Kashfiyot ───────────────────────────────── */}
                <NxExplore />

                {/* ── Saqlangan ─────────────────────────────────────────── */}
                <NxSaved />

                {/* ── Guruhlar va kanallar ──────────────────────────────── */}
                <NxGroups />

                {/* ── Qo'ng'iroqlar ─────────────────────────────────────── */}
                <NxCalls />

                {/* ── Obunalar ──────────────────────────────────────────── */}
                <NxSubscriptions />

                {/* ── Spaces (audio rooms) ──────────────────────────────── */}
                <NxSpaces />

                {/* ── Bozor (Marketplace) ───────────────────────────────── */}
                <NxMarketplace />

                {/* ── Hamyon (Wallet) ───────────────────────────────────── */}
                <NxWallet />

                {/* ── Tadbirlar (Events) ────────────────────────────────── */}
                <NxEvents />

                {/* ── Yuklangan (Downloads) ─────────────────────────────── */}
                <NxDownloads />

                {/* ── Ish o'rinlari (Jobs) ──────────────────────────────── */}
                <NxJobs />

                {/* ── Trendlar ──────────────────────────────────────────── */}
                <NxTrending />

                {/* ── AI yordamchi ──────────────────────────────────────── */}
                <NxAI />

                {/* ── Go Live ───────────────────────────────────────────── */}
                <NxGoLive />

                {/* ── Virtual sovg'alar ─────────────────────────────────── */}
                <NxGifts />

                {/* ── Leaderboard ───────────────────────────────────────── */}
                <NxLeaderboard />

                {/* ── Post yaratish ─────────────────────────────────────── */}
                <NxCreatePost />

                {/* ── Tavsiyalar (kim kuzatish) ─────────────────────────── */}
                <NxSuggestions />

                {/* ── Watch Party (birga tomosha) ───────────────────────── */}
                <NxWatchParty />

                {/* ── Highlights (story kolleksiyalar) ──────────────────── */}
                <NxHighlights />

                {/* ── Lyrics (qo'shiq so'zlari) ─────────────────────────── */}
                <NxLyrics />

                {/* ── QR Share (profil ulashish) ────────────────────────── */}
                <NxQrShare />

                {/* ── Community (yaratuvchi jamiyati) ───────────────────── */}
                <NxCommunity />

                {/* ── Kliplar ───────────────────────────────────────────── */}
                <NxClips />

                {/* ── Super Chat ────────────────────────────────────────── */}
                <NxSuperChat />

                {/* ── Yutuqlar ──────────────────────────────────────────── */}
                <NxAchievements />

                {/* ── Mini Ilovalar ─────────────────────────────────────── */}
                <NxMiniApps />

                {/* ── Kontent jadvali ───────────────────────────────────── */}
                <NxSchedule />

                {/* ── Do'kon ────────────────────────────────────────────── */}
                <NxShop />

                {/* ── Maqolalar / Reader ────────────────────────────────── */}
                <NxReader />

                {/* ── Moliyalashtirish ──────────────────────────────────── */}
                <NxFundraiser />

                {/* ── Forum (muhokama) ──────────────────────────────────── */}
                <NxForum />

                {/* ── Podkastlar ────────────────────────────────────────── */}
                <NxPodcasts />

                {/* ── Hamkorlik ─────────────────────────────────────────── */}
                <NxCollab />

                {/* ── Eslatmalar ────────────────────────────────────────── */}
                <NxReminders />

                {/* ── So'rovnomalar ─────────────────────────────────────── */}
                <NxPolls />

                {/* ── Statistika ────────────────────────────────────────── */}
                <NxStats />

                {/* ── Qoralamalar ───────────────────────────────────────── */}
                <NxDrafts />

                {/* ── Nishonlar ─────────────────────────────────────────── */}
                <NxBadges />

                {/* ── Shikoyat ──────────────────────────────────────────── */}
                <NxReport />

                {/* ── Tavsiya dasturi (Affiliate) ───────────────────────── */}
                <NxAffiliate />

                {/* ── Albomlar ──────────────────────────────────────────── */}
                <NxAlbums />

                {/* ── Story yaratish ────────────────────────────────────── */}
                <NxStoryCreate />

                {/* ── Video Majlis (Zoom/Meet uslubi) ───────────────────── */}
                <NxMeeting />

                {/* ── Universal ulashish modali ──────────────────────────── */}
                <NxShare />
            </div>
        </NxPlayerProvider>
    );
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
