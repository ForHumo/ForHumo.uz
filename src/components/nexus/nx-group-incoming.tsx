"use client";

// Kelayotgan guruh chaqiruv taklifi — Pusher 'group-call:invite' event'ini kuzatadi,
// overlay + ringtone chiqaradi. Accept → openGroupCall (avtomatik xonaga kiradi).

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { Users, PhoneOff, BadgeCheck } from "lucide-react";
import { useNxPlayer, type IncomingGroupInvite } from "./nx-player-ctx";
import { getPusherClient } from "@/lib/pusher-client";
import { playRingtone, stopRingtone } from "@/lib/nexus-ringtone";

export function NxGroupIncoming() {
    const { data: session } = useSession();
    // @ts-ignore
    const myProfileId: string | null = session?.user?.profileId ?? null;
    const { incomingGroup, setIncomingGroup, openGroupCall, activeCall, groupCallOpen } = useNxPlayer();

    // Pusher subscribe
    useEffect(() => {
        if (!myProfileId) return;
        const pusher = getPusherClient();
        if (!pusher) return;
        const channel = pusher.subscribe(`private-user-${myProfileId}`);
        const onInvite = (data: IncomingGroupInvite) => {
            // Faol 1:1 yoki guruh xonasi ochiq bo'lsa yangi taklif overlay chiqarilmaydi
            if (activeCall || groupCallOpen) return;
            setIncomingGroup(data);
        };
        channel.bind("group-call:invite", onInvite);
        return () => { channel.unbind("group-call:invite", onInvite); };
    }, [myProfileId, activeCall, groupCallOpen, setIncomingGroup]);

    // Ringtone
    useEffect(() => {
        if (incomingGroup) {
            playRingtone();
            return () => stopRingtone();
        }
        stopRingtone();
    }, [incomingGroup]);

    if (!incomingGroup) return null;

    const invLabel = incomingGroup.inviter.name
        || (incomingGroup.inviter.username ? `@${incomingGroup.inviter.username}` : incomingGroup.inviter.humoId || "Kimdir");

    const accept = () => {
        const id = incomingGroup.callId;
        setIncomingGroup(null);
        openGroupCall(id);
    };
    const decline = () => setIncomingGroup(null);

    return (
        <div className="fixed inset-0 z-[290] flex items-end justify-center bg-black/70 sm:items-center">
            <div className="w-full max-w-sm rounded-t-3xl bg-gradient-to-br from-indigo-950 via-violet-900 to-black p-6 shadow-2xl sm:rounded-3xl">
                <div className="mb-4 flex items-center gap-3">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-white/15">
                        {incomingGroup.inviter.image
                            ? <Image src={incomingGroup.inviter.image} alt="" width={56} height={56} className="h-full w-full object-cover" />
                            : <div className="flex h-full w-full items-center justify-center text-lg font-black text-white">
                                {invLabel.slice(0, 2).toUpperCase()}
                            </div>}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                            <p className="truncate text-base font-black text-white">{invLabel}</p>
                            {incomingGroup.inviter.verified && <BadgeCheck className="h-4 w-4 text-sky-400" />}
                        </div>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-white/70">
                            <Users className="h-3.5 w-3.5" /> Guruh chaqiruv
                            {incomingGroup.title ? ` · ${incomingGroup.title}` : ""}
                        </p>
                    </div>
                </div>
                <div className="flex items-center justify-around gap-4">
                    <button onClick={decline}
                        className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-600 shadow-lg transition-transform hover:scale-105 active:scale-95">
                        <PhoneOff className="h-6 w-6 text-white" />
                    </button>
                    <button onClick={accept}
                        className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 shadow-lg transition-transform hover:scale-105 active:scale-95">
                        <Users className="h-6 w-6 text-white" />
                    </button>
                </div>
            </div>
        </div>
    );
}
