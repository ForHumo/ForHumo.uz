"use client";

import { Plus } from "lucide-react";
import { useSession } from "next-auth/react";

// ─────────────────────────────────────────────────────────────────────────────
// Mock stories ma'lumotlari
// ─────────────────────────────────────────────────────────────────────────────
const STORIES = [
    { id: 1,  name: "Islomjon",   avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=Islom",    seen: false, live: true  },
    { id: 2,  name: "Madina",     avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=Madina",   seen: false, live: false },
    { id: 3,  name: "Sardor",     avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=Sardor",   seen: false, live: false },
    { id: 4,  name: "Zulfiya",    avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=Zulfiya",  seen: true,  live: false },
    { id: 5,  name: "Humo AI",    avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=HumoAI",   seen: false, live: true  },
    { id: 6,  name: "Nexus Dev",  avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=Dev",      seen: true,  live: false },
    { id: 7,  name: "Kamola",     avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=Kamola",   seen: false, live: false },
    { id: 8,  name: "Bobur",      avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=Bobur",    seen: true,  live: false },
    { id: 9,  name: "Dilnoza",    avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=Dilnoza",  seen: false, live: false },
    { id: 10, name: "Jasur",      avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=Jasur",    seen: true,  live: false },
];

// ─────────────────────────────────────────────────────────────────────────────
// NxStories
// ─────────────────────────────────────────────────────────────────────────────
export function NxStories() {
    const { data: session } = useSession();
    const myName   = session?.user?.name?.split(" ")[0] ?? "Siz";
    const myImage  = session?.user?.image ?? null;
    const myLetter = myName[0].toUpperCase();

    return (
        <div
            className="relative flex-shrink-0"
            style={{ borderBottom: "1px solid rgba(43,62,232,0.12)" }}
        >
            {/* O'ng tomonga gradient fade */}
            <div
                className="absolute right-0 top-0 bottom-0 w-12 z-10 pointer-events-none"
                style={{ background: "linear-gradient(to right, transparent, #050818)" }}
            />

            <div className="flex items-start gap-4 overflow-x-auto px-4 py-3 scrollbar-none"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>

                {/* ── Sizning hikoyangiz ─────────────────────────── */}
                <MyStory name={myName} image={myImage} letter={myLetter} />

                {/* ── Boshqa foydalanuvchilar ────────────────────── */}
                {STORIES.map(story => (
                    <StoryItem key={story.id} {...story} />
                ))}

                {/* Scroll uchun bo'shliq */}
                <div className="flex-shrink-0 w-4" aria-hidden />
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// "Sizning hikoyangiz" — birinchi element
// ─────────────────────────────────────────────────────────────────────────────
function MyStory({ name, image, letter }: { name: string; image: string | null; letter: string }) {
    return (
        <button className="flex flex-col items-center gap-1.5 flex-shrink-0 group active:scale-95 transition-transform duration-150">
            <div className="relative">
                {/* Avatar doirasi */}
                <div
                    className="w-[58px] h-[58px] rounded-full p-[2px]"
                    style={{ background: "rgba(43,62,232,0.20)", border: "2px dashed rgba(43,62,232,0.40)" }}
                >
                    <div
                        className="w-full h-full rounded-full overflow-hidden flex items-center justify-center text-lg font-black text-white"
                        style={{ background: image ? "transparent" : "linear-gradient(135deg,rgba(43,62,232,0.30),rgba(0,206,200,0.20))" }}
                    >
                        {image
                            ? <img src={image} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            : <span style={{ color: "rgba(43,62,232,0.80)" }}>{letter}</span>
                        }
                    </div>
                </div>

                {/* + belgisi */}
                <div
                    className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{
                        background: "linear-gradient(135deg,#2B3EE8,#00CEC8)",
                        border: "2px solid #050818",
                        boxShadow: "0 0 8px rgba(0,206,200,0.60)",
                    }}
                >
                    <Plus className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                </div>
            </div>

            <span className="text-[10px] font-medium text-center truncate w-16"
                style={{ color: "rgba(160,176,224,0.70)" }}>
                Hikoya
            </span>
        </button>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Oddiy story elementi
// ─────────────────────────────────────────────────────────────────────────────
function StoryItem({ name, avatar, seen, live }: {
    name: string; avatar: string; seen: boolean; live: boolean;
}) {
    return (
        <button className="flex flex-col items-center gap-1.5 flex-shrink-0 group active:scale-95 transition-transform duration-150">
            <div className="relative">
                {/* Gradient ring yoki seen ring */}
                <div
                    className="w-[58px] h-[58px] rounded-full p-[2.5px]"
                    style={seen ? {
                        background: "rgba(60,70,100,0.40)",
                        padding: "2.5px",
                    } : live ? {
                        background: "linear-gradient(135deg, #FF4444 0%, #FF8800 100%)",
                        padding: "2.5px",
                        boxShadow: "0 0 12px rgba(255,68,68,0.50)",
                    } : {
                        background: "linear-gradient(135deg, #2B3EE8 0%, #00CEC8 100%)",
                        padding: "2.5px",
                        boxShadow: "0 0 12px rgba(43,62,232,0.40)",
                    }}
                >
                    <div
                        className="w-full h-full rounded-full overflow-hidden"
                        style={{ border: "2px solid #050818" }}
                    >
                        <img
                            src={avatar}
                            alt={name}
                            className="w-full h-full object-cover"
                        />
                    </div>
                </div>

                {/* LIVE badge */}
                {live && (
                    <div
                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-[1px] rounded text-[8px] font-black tracking-wide flex items-center gap-1"
                        style={{
                            background: "linear-gradient(90deg,#FF4444,#FF8800)",
                            boxShadow: "0 2px 8px rgba(255,68,68,0.50)",
                        }}
                    >
                        <span className="w-1 h-1 bg-white rounded-full animate-pulse" />
                        LIVE
                    </div>
                )}
            </div>

            <span
                className="text-[10px] font-medium text-center truncate w-16 group-hover:text-white transition-colors duration-150"
                style={{ color: seen ? "rgba(100,120,160,0.60)" : "rgba(180,195,230,0.90)" }}
            >
                {name}
            </span>
        </button>
    );
}
