"use client";

import { useSession, signOut } from "next-auth/react";
import { Link } from "@/i18n/routing";
import {
    X, Home, Play, Radio, LibraryBig, MessagesSquare,
    Compass, MessageCircle, Bell,
    Bookmark, History, Users, PlusSquare,
    Wallet, ShoppingBag, Fingerprint,
    Settings, HelpCircle, LogOut,
    Film, Sparkles,
} from "lucide-react";
import { useNxPlayer } from "./nx-player-ctx";
import type { NxTab } from "./nx-dock";

// ─────────────────────────────────────────────────────────────────────────────
// NxSidebar — faqat REAL manzillar: tablar, real panellar va boshqa modullar.
// Mock modallarga olib boruvchi eshiklar olib tashlangan.
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
    open: boolean;
    onClose: () => void;
    onOpenSettings?: () => void;
    onNavigate?: (tab: NxTab) => void;
}

export function NxSidebar({ open, onClose, onOpenSettings, onNavigate }: Props) {
    const { data: session } = useSession();
    const { setExploreOpen, setMessagesOpen, setNotifOpen, setSavedOpen, openSavedHistory, setSubsOpen, setGoLiveOpen, setStoryCreateOpen } = useNxPlayer();
    const name = session?.user?.name ?? "Mehmon";
    const image = session?.user?.image ?? null;
    const email = session?.user?.email ?? "";
    const letter = name[0]?.toUpperCase() ?? "U";

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[52] transition-opacity duration-300"
                style={{
                    background: "rgba(5,8,24,0.70)", backdropFilter: "blur(4px)",
                    opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none",
                }}
                onClick={onClose}
            />

            {/* Drawer */}
            <aside
                className="fixed top-0 left-0 bottom-0 z-[56] flex flex-col w-72 max-w-[88vw] transition-transform duration-300"
                style={{
                    background: "rgba(8,12,32,0.97)",
                    backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
                    borderLeft: "1px solid rgba(43,62,232,0.22)",
                    boxShadow: "-8px 0 48px rgba(43,62,232,0.12)",
                    transform: open ? "translateX(0)" : "translateX(-100%)",
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 h-[60px] flex-shrink-0" style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                    <span className="text-base font-black tracking-tight"
                        style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                        Humo Nexus
                    </span>
                    <button onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150 active:scale-90"
                        style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.20)" }}>
                        <X className="w-4 h-4" style={{ color: "rgba(160,176,224,0.80)" }} />
                    </button>
                </div>

                {/* Scroll */}
                <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                    {/* User card (real sessiya) */}
                    <div className="px-4 pt-4 pb-3">
                        <button onClick={() => { onClose(); onNavigate?.("profile"); }}
                            className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-left transition-all duration-150 active:scale-[0.99]"
                            style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.18)" }}>
                            <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center text-base font-black text-white"
                                style={{ background: image ? "transparent" : "linear-gradient(135deg,#2B3EE8,#00CEC8)", border: "2px solid rgba(43,62,232,0.35)" }}>
                                {image
                                    ? <img src={image} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    : letter}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-white truncate">{name}</p>
                                <p className="text-[10px] truncate mt-0.5" style={{ color: "rgba(100,120,170,0.80)" }}>{email}</p>
                            </div>
                        </button>
                    </div>

                    {/* Kontent */}
                    <SidebarSection title="Kontent">
                        <SidebarItem icon={Home} label="Asosiy lenta" onClick={() => { onClose(); onNavigate?.("feed"); }} />
                        <SidebarItem icon={Play} label="Videolar" onClick={() => { onClose(); onNavigate?.("video"); }} />
                        <SidebarItem icon={Radio} label="Jonli efirlar" onClick={() => { onClose(); onNavigate?.("live"); }} />
                        <SidebarItem icon={LibraryBig} label="Media — musiqa, podkast" onClick={() => { onClose(); onNavigate?.("media"); }} />
                        <SidebarItem icon={MessagesSquare} label="Ijtimoiy — postlar, chat" onClick={() => { onClose(); onNavigate?.("social"); }} />
                    </SidebarSection>

                    {/* Kashfiyot */}
                    <SidebarSection title="Kashfiyot">
                        <SidebarItem icon={Compass} label="Kashfiyot" onClick={() => { onClose(); setExploreOpen(true); }} />
                        <SidebarItem icon={MessageCircle} label="Xabarlar (DM)" onClick={() => { onClose(); setMessagesOpen(true); }} />
                        <SidebarItem icon={Bell} label="Bildirishnomalar" onClick={() => { onClose(); setNotifOpen(true); }} />
                    </SidebarSection>

                    {/* Mening Nexus */}
                    <SidebarSection title="Mening Nexus">
                        <SidebarItem icon={Bookmark} label="Saqlangan" onClick={() => { onClose(); setSavedOpen(true); }} />
                        <SidebarItem icon={History} label="Ko'rish tarixi" onClick={() => { onClose(); openSavedHistory(); }} />
                        <SidebarItem icon={Users} label="Obunalarim" onClick={() => { onClose(); setSubsOpen(true); }} />
                        <SidebarItem icon={Radio} label="Jonli efir boshlash" onClick={() => { onClose(); setGoLiveOpen(true); }} />
                        <SidebarItem icon={PlusSquare} label="Story yaratish" onClick={() => { onClose(); setStoryCreateOpen(true); }} />
                    </SidebarSection>

                    {/* Agentlar — GIF va Sticker pack'lar boshqaruvi */}
                    <SidebarSection title="Agentlar">
                        <SidebarLink icon={Film} label="@GIF — GIF pack'larim" href="/nexus/agent/gif" onClose={onClose} />
                        <SidebarLink icon={Sparkles} label="@Sticker — Sticker pack'larim" href="/nexus/agent/sticker" onClose={onClose} />
                    </SidebarSection>

                    {/* Boshqa For Humo modullari */}
                    <SidebarSection title="For Humo">
                        <SidebarLink icon={Wallet} label="For Pay — hamyon" href="/pay" onClose={onClose} />
                        <SidebarLink icon={ShoppingBag} label="Humo Market" href="/market" onClose={onClose} />
                        <SidebarLink icon={Fingerprint} label="Humo ID" href="/id" onClose={onClose} />
                    </SidebarSection>

                    {/* Sozlamalar / Yordam / Chiqish */}
                    <div className="px-4 pb-4 pt-1">
                        <SidebarItem icon={Settings} label="Sozlamalar" onClick={() => { onClose(); onOpenSettings?.(); }} />
                        <SidebarItem icon={HelpCircle} label="Humo Support" onClick={() => { onClose(); window.dispatchEvent(new Event("support:open")); }} />
                        <button onClick={() => signOut()}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-red-400 transition-colors duration-150 mt-1"
                            style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.16)" }}>
                            <LogOut className="w-4 h-4" />
                            Chiqish
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
function SidebarSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="px-4 pb-3">
            <p className="px-2 pb-1.5 text-[9px] font-black uppercase tracking-widest" style={{ color: "rgba(43,62,232,0.60)" }}>{title}</p>
            <div className="flex flex-col gap-0.5">{children}</div>
        </div>
    );
}

function SidebarItem({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick?: () => void }) {
    return (
        <button onClick={onClick}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all duration-150 hover:bg-white/5 active:scale-[0.99]"
            style={{ color: "rgba(190,205,240,0.88)" }}>
            <Icon className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(43,62,232,0.85)" }} />
            <span className="truncate">{label}</span>
        </button>
    );
}

function SidebarLink({ icon: Icon, label, href, onClose }: { icon: React.ElementType; label: string; href: string; onClose: () => void }) {
    return (
        <Link href={href} onClick={onClose}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all duration-150 hover:bg-white/5 active:scale-[0.99]"
            style={{ color: "rgba(190,205,240,0.88)" }}>
            <Icon className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(43,62,232,0.85)" }} />
            <span className="truncate">{label}</span>
        </Link>
    );
}
