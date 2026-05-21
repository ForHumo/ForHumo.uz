"use client";

import { useState } from "react";
import {
    X, Bell, Shield, Globe, Moon, Wifi, Download, Eye,
    Volume2, Smartphone, CreditCard, ChevronRight, Check,
    Lock, UserCircle, Sliders,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// NxSettings — sozlamalar modali
// ─────────────────────────────────────────────────────────────────────────────
interface Props {
    open: boolean;
    onClose: () => void;
}

type SettingsTab = "account" | "notifications" | "privacy" | "appearance" | "playback" | "payment";

const SETTING_TABS: { id: SettingsTab; icon: React.ElementType; label: string }[] = [
    { id: "account",       icon: UserCircle,  label: "Hisob"         },
    { id: "notifications", icon: Bell,        label: "Bildirishnoma" },
    { id: "privacy",       icon: Shield,      label: "Maxfiylik"     },
    { id: "appearance",    icon: Moon,        label: "Ko'rinish"     },
    { id: "playback",      icon: Sliders,     label: "Ijro"          },
    { id: "payment",       icon: CreditCard,  label: "To'lov"        },
];

export function NxSettings({ open, onClose }: Props) {
    const [activeTab, setActiveTab] = useState<SettingsTab>("account");

    return (
        <>
            {/* ── Backdrop ──────────────────────────────────────────── */}
            <div
                className="fixed inset-0 z-50 transition-opacity duration-300"
                style={{
                    background: "rgba(5,8,24,0.80)",
                    backdropFilter: "blur(8px)",
                    opacity: open ? 1 : 0,
                    pointerEvents: open ? "auto" : "none",
                }}
                onClick={onClose}
            />

            {/* ── Modal ─────────────────────────────────────────────── */}
            <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            >
                <div
                    className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl overflow-hidden pointer-events-auto transition-all duration-300"
                    style={{
                        background: "rgba(8,12,32,0.98)",
                        backdropFilter: "blur(24px)",
                        WebkitBackdropFilter: "blur(24px)",
                        border: "1px solid rgba(43,62,232,0.25)",
                        boxShadow: "0 32px 80px rgba(0,0,0,0.60), 0 0 0 1px rgba(43,62,232,0.10), inset 0 1px 0 rgba(43,62,232,0.15)",
                        opacity: open ? 1 : 0,
                        transform: open ? "scale(1) translateY(0)" : "scale(0.96) translateY(8px)",
                    }}
                >
                    {/* ── Modal header ──────────────────────────────── */}
                    <div
                        className="flex items-center justify-between px-6 py-4 flex-shrink-0"
                        style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}
                    >
                        <div>
                            <h2 className="text-base font-black text-white">Sozlamalar</h2>
                            <p className="text-[11px] mt-0.5" style={{ color: "rgba(100,120,170,0.80)" }}>
                                Nexus tajribangizni moslang
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-150 active:scale-90"
                            style={{
                                background: "rgba(43,62,232,0.10)",
                                border: "1px solid rgba(43,62,232,0.20)",
                            }}
                        >
                            <X className="w-4 h-4" style={{ color: "rgba(160,176,224,0.80)" }} />
                        </button>
                    </div>

                    {/* ── Body ──────────────────────────────────────── */}
                    <div className="flex flex-1 overflow-hidden">
                        {/* Left tab list */}
                        <div
                            className="w-44 flex-shrink-0 flex flex-col gap-0.5 py-3 px-2 overflow-y-auto"
                            style={{
                                borderRight: "1px solid rgba(43,62,232,0.14)",
                                scrollbarWidth: "none",
                            }}
                        >
                            {SETTING_TABS.map(tab => {
                                const active = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all duration-150"
                                        style={{
                                            background: active
                                                ? "rgba(43,62,232,0.15)"
                                                : "transparent",
                                            border: active
                                                ? "1px solid rgba(43,62,232,0.30)"
                                                : "1px solid transparent",
                                        }}
                                    >
                                        <tab.icon
                                            className="w-4 h-4 flex-shrink-0"
                                            style={{
                                                color: active ? "#00CEC8" : "rgba(100,120,170,0.70)",
                                            }}
                                        />
                                        <span
                                            className="text-[13px] font-semibold"
                                            style={{
                                                color: active ? "rgba(220,230,255,0.95)" : "rgba(120,140,190,0.80)",
                                            }}
                                        >
                                            {tab.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Right content */}
                        <div className="flex-1 overflow-y-auto py-4 px-5" style={{ scrollbarWidth: "none" }}>
                            {activeTab === "account"       && <AccountPanel />}
                            {activeTab === "notifications" && <NotificationsPanel />}
                            {activeTab === "privacy"       && <PrivacyPanel />}
                            {activeTab === "appearance"    && <AppearancePanel />}
                            {activeTab === "playback"      && <PlaybackPanel />}
                            {activeTab === "payment"       && <PaymentPanel />}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Yordamchi komponentlar
// ─────────────────────────────────────────────────────────────────────────────
function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="mb-5">
            <p
                className="text-[9px] font-black uppercase tracking-widest mb-2"
                style={{ color: "rgba(43,62,232,0.60)" }}
            >
                {title}
            </p>
            <div
                className="rounded-2xl overflow-hidden"
                style={{ border: "1px solid rgba(43,62,232,0.14)" }}
            >
                {children}
            </div>
        </div>
    );
}

function SettingsRow({
    icon: Icon,
    label,
    description,
    right,
}: {
    icon: React.ElementType;
    label: string;
    description?: string;
    right?: React.ReactNode;
}) {
    return (
        <div
            className="flex items-center gap-3.5 px-4 py-3.5 transition-colors duration-150"
            style={{ borderBottom: "1px solid rgba(43,62,232,0.08)" }}
        >
            <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(43,62,232,0.12)" }}
            >
                <Icon className="w-3.5 h-3.5" style={{ color: "rgba(100,140,220,0.90)" }} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{label}</p>
                {description && (
                    <p className="text-[10px] mt-0.5" style={{ color: "rgba(100,120,170,0.70)" }}>
                        {description}
                    </p>
                )}
            </div>
            {right}
        </div>
    );
}

function Toggle({ defaultOn = false }: { defaultOn?: boolean }) {
    const [on, setOn] = useState(defaultOn);
    return (
        <button
            onClick={() => setOn(p => !p)}
            className="relative flex-shrink-0 w-10 h-5.5 rounded-full transition-all duration-200"
            style={{
                background: on
                    ? "linear-gradient(135deg,#2B3EE8,#00CEC8)"
                    : "rgba(43,62,232,0.18)",
                minWidth: "40px",
                height: "22px",
            }}
        >
            <span
                className="absolute top-0.5 left-0.5 w-[18px] h-[18px] rounded-full bg-white transition-all duration-200 flex items-center justify-center"
                style={{
                    transform: on ? "translateX(18px)" : "translateX(0)",
                    boxShadow: on ? "0 0 8px rgba(0,206,200,0.50)" : "none",
                }}
            >
                {on && <Check className="w-2.5 h-2.5" style={{ color: "#2B3EE8" }} />}
            </span>
        </button>
    );
}

function SelectBadge({ options, defaultVal }: { options: string[]; defaultVal: string }) {
    const [val, setVal] = useState(defaultVal);
    return (
        <div className="flex items-center gap-1.5 flex-shrink-0">
            {options.map(opt => (
                <button
                    key={opt}
                    onClick={() => setVal(opt)}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all duration-150"
                    style={{
                        background: val === opt ? "linear-gradient(135deg,#2B3EE8,#00CEC8)" : "rgba(43,62,232,0.12)",
                        color: val === opt ? "#fff" : "rgba(120,140,190,0.80)",
                        border: val === opt ? "none" : "1px solid rgba(43,62,232,0.16)",
                    }}
                >
                    {opt}
                </button>
            ))}
        </div>
    );
}

function ArrowRight() {
    return <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(43,62,232,0.45)" }} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel — Hisob
// ─────────────────────────────────────────────────────────────────────────────
function AccountPanel() {
    return (
        <>
            <SettingsGroup title="Shaxsiy ma'lumotlar">
                <SettingsRow icon={UserCircle} label="Profil tahrirlash"   description="Ism, rasm, bio"           right={<ArrowRight />} />
                <SettingsRow icon={Lock}       label="Parol va xavfsizlik" description="2FA, login tarix"          right={<ArrowRight />} />
                <SettingsRow icon={Globe}      label="Til sozlamalari"     description="O'zbek / Rus / English"    right={<SelectBadge options={["UZ","RU","EN"]} defaultVal="UZ" />} />
            </SettingsGroup>

            <SettingsGroup title="Ijodkorlik">
                <SettingsRow icon={Smartphone} label="Studio rejimi"       description="Kontent yuklash, analitika" right={<Toggle />} />
                <SettingsRow icon={Globe}      label="Kanal boshqaruvi"    description="Obunachi, post, sharh"      right={<ArrowRight />} />
            </SettingsGroup>
        </>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel — Bildirishnomalar
// ─────────────────────────────────────────────────────────────────────────────
function NotificationsPanel() {
    return (
        <>
            <SettingsGroup title="Push bildirishnomalar">
                <SettingsRow icon={Bell} label="Yangi kontent"         description="Obunalardagi yangi post"  right={<Toggle defaultOn />} />
                <SettingsRow icon={Bell} label="Jonli efir boshlandi"  description="Kuzatayotgan kanallar"    right={<Toggle defaultOn />} />
                <SettingsRow icon={Bell} label="Sharh va reaksiyalar"  description="Postlarimga javoblar"     right={<Toggle />} />
                <SettingsRow icon={Bell} label="Chat xabarlari"        description="Guruh va shaxsiy chatlar" right={<Toggle defaultOn />} />
            </SettingsGroup>

            <SettingsGroup title="Email">
                <SettingsRow icon={Bell} label="Haftalik xulosa"       description="Hafta qamrovi, statistika" right={<Toggle />} />
                <SettingsRow icon={Bell} label="Maxsus takliflar"       description="Pro, chegirmalar"          right={<Toggle />} />
            </SettingsGroup>
        </>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel — Maxfiylik
// ─────────────────────────────────────────────────────────────────────────────
function PrivacyPanel() {
    return (
        <>
            <SettingsGroup title="Ko'rinish">
                <SettingsRow icon={Eye}    label="Profil ochiq / yopiq"  description="Kim ko'ra oladi"            right={<SelectBadge options={["Hammaga","Obunalar","Faqat men"]} defaultVal="Hammaga" />} />
                <SettingsRow icon={Eye}    label="Ko'rish tarixi"        description="Boshqalar ko'rishi"          right={<Toggle />} />
                <SettingsRow icon={Shield} label="Blok ro'yxati"         description="Bloklangan foydalanuvchilar" right={<ArrowRight />} />
            </SettingsGroup>

            <SettingsGroup title="Ma'lumotlar">
                <SettingsRow icon={Shield} label="Ma'lumotlarni yuklab olish" description="Shaxsiy arxiv"         right={<ArrowRight />} />
                <SettingsRow icon={Shield} label="Hisobni o'chirish"          description="Qaytarib bo'lmaydi"    right={<ArrowRight />} />
            </SettingsGroup>
        </>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel — Ko'rinish
// ─────────────────────────────────────────────────────────────────────────────
function AppearancePanel() {
    return (
        <>
            <SettingsGroup title="Mavzu">
                <SettingsRow icon={Moon} label="Qorong'i rejim"     description="Doim yoqiq"                right={<Toggle defaultOn />} />
                <SettingsRow icon={Moon} label="Gradient aksentlar" description="Ko'k-cyan rang sxemasi"    right={<Toggle defaultOn />} />
            </SettingsGroup>

            <SettingsGroup title="Interfeys">
                <SettingsRow icon={Smartphone} label="Karta o'lchami"     description="Feed da kattalik"     right={<SelectBadge options={["S","M","L"]} defaultVal="M" />} />
                <SettingsRow icon={Eye}        label="Avtomatik qisqartma" description="Uzoq sarlavhalar"    right={<Toggle defaultOn />} />
            </SettingsGroup>
        </>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel — Ijro
// ─────────────────────────────────────────────────────────────────────────────
function PlaybackPanel() {
    return (
        <>
            <SettingsGroup title="Video">
                <SettingsRow icon={Sliders} label="Standart sifat"     description="Auto / 1080p / 4K"     right={<SelectBadge options={["Auto","1080p","4K"]} defaultVal="Auto" />} />
                <SettingsRow icon={Sliders} label="Avtomatik ijro"     description="Keyingi kontent"       right={<Toggle defaultOn />} />
                <SettingsRow icon={Wifi}    label="Mobil tarmoq sifat" description="Data tejash"           right={<SelectBadge options={["Auto","480p","720p"]} defaultVal="480p" />} />
            </SettingsGroup>

            <SettingsGroup title="Musiqa">
                <SettingsRow icon={Volume2} label="Audio sifat"        description="Lossless / Standart"   right={<SelectBadge options={["Lossless","Yuqori","Standart"]} defaultVal="Yuqori" />} />
                <SettingsRow icon={Download} label="Oflayn saqlash"    description="Musiqa va videolar"    right={<Toggle />} />
            </SettingsGroup>
        </>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel — To'lov
// ─────────────────────────────────────────────────────────────────────────────
function PaymentPanel() {
    return (
        <>
            <SettingsGroup title="Obuna">
                <SettingsRow
                    icon={CreditCard}
                    label="Nexus Pro"
                    description="Hozirda: Bepul tarif"
                    right={
                        <span
                            className="px-2.5 py-1 rounded-lg text-[10px] font-black"
                            style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}
                        >
                            Yangilash
                        </span>
                    }
                />
            </SettingsGroup>

            <SettingsGroup title="To'lov usullari">
                <SettingsRow icon={CreditCard} label="Payme"         description="Ulangan emas"     right={<ArrowRight />} />
                <SettingsRow icon={CreditCard} label="Click"         description="Ulangan emas"     right={<ArrowRight />} />
                <SettingsRow icon={CreditCard} label="Uzcard / Humo" description="Ulangan emas"     right={<ArrowRight />} />
            </SettingsGroup>

            <SettingsGroup title="Tarix">
                <SettingsRow icon={CreditCard} label="To'lov tarixi" description="Oxirgi 3 oy" right={<ArrowRight />} />
            </SettingsGroup>
        </>
    );
}
