"use client";

// So'rovnoma ovoz beruvchilari — variant bo'yicha guruh + a'zolar ro'yxati.

import { useEffect, useState } from "react";
import { X, Loader2, BarChart2 } from "lucide-react";

type VoterProfile = { id: string; name: string | null; username: string | null; image: string | null } | null;
type Group = {
    optionIndex: number;
    optionText: string;
    voters: VoterProfile[];
};

export function NxGroupPollVoters({
    open, channelId, messageId, onClose,
}: {
    open: boolean;
    channelId: string;
    messageId: string;
    onClose: () => void;
}) {
    const [groups, setGroups] = useState<Group[]>([]);
    const [question, setQuestion] = useState("");
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open) return;
        setLoading(true);
        fetch(`/api/nexus/channels/${channelId}/messages/${messageId}/poll-voters`)
            .then(r => r.ok ? r.json() : { groups: [] })
            .then(d => {
                setGroups(d.groups ?? []);
                setQuestion(d.question ?? "");
                setTotal(d.totalVoters ?? 0);
            })
            .finally(() => setLoading(false));
    }, [open, channelId, messageId]);

    if (!open) return null;

    return (
        <>
            <div className="fixed inset-0 z-[320] bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed inset-x-0 bottom-0 z-[321] flex max-h-[85vh] flex-col overflow-hidden rounded-t-3xl md:inset-y-0 md:right-0 md:inset-x-auto md:max-h-full md:w-[440px] md:rounded-none md:rounded-l-3xl"
                style={{ background: "var(--nx-elevated)", border: "1px solid rgb(var(--nx-accent-rgb) / 0.3)" }}
                onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
                    style={{ borderBottom: "1px solid rgb(var(--nx-accent-rgb) / 0.14)" }}>
                    <h3 className="text-base font-black text-[var(--nx-text)] flex items-center gap-2">
                        <BarChart2 className="w-4 h-4" style={{ color: "var(--nx-accent)" }} /> Ovoz beruvchilar · {total}
                    </h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: "rgb(var(--nx-accent-rgb) / 0.12)" }}>
                        <X className="w-4 h-4 text-[var(--nx-text)]" />
                    </button>
                </div>
                <div className="px-5 py-3 flex-shrink-0" style={{ borderBottom: "1px solid rgb(var(--nx-accent-rgb) / 0.10)" }}>
                    <p className="text-sm font-bold text-[var(--nx-text)] line-clamp-2">{question}</p>
                </div>
                <div className="flex-1 overflow-y-auto p-3" style={{ scrollbarWidth: "none" }}>
                    {loading ? (
                        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--nx-accent)" }} /></div>
                    ) : groups.map(g => (
                        <div key={g.optionIndex} className="mb-3">
                            <p className="text-xs font-black mb-2 px-1" style={{ color: "var(--nx-accent)" }}>
                                {g.optionText} · {g.voters.length}
                            </p>
                            {g.voters.length === 0 ? (
                                <p className="text-[11px] italic px-3 py-2" style={{ color: "var(--nx-text-3)" }}>Hech kim ovoz bermagan</p>
                            ) : g.voters.map((v, i) => v && (
                                <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg mb-0.5"
                                    style={{ background: "var(--nx-surface)" }}>
                                    <img src={v.image ?? "/logos/forhumo.png"} alt=""
                                        className="w-7 h-7 rounded-full object-cover"
                                        style={{ border: "1px solid rgb(var(--nx-accent-rgb) / 0.25)" }} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-[var(--nx-text)] truncate">{v.name ?? v.username ?? "?"}</p>
                                        {v.username && <p className="text-[10px]" style={{ color: "var(--nx-text-3)" }}>@{v.username}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
