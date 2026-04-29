"use client";

import React from "react";
import { ContentRow } from "./content-row";
import { 
    GCinemaCard, 
    VCinemaCard,
    MusicCard, 
    PostCard, 
    GVideoCard, 
    GStreamCard, 
    VStreamCard,
    VVideoCard, 
    ProfileCard,
    ChatPreviewCard
} from "./content-cards";
import { motion } from "framer-motion";

interface NexusFeedProps {
    onTabChange?: (tab: string) => void;
}

export function NexusFeed({ onTabChange }: NexusFeedProps) {
    return (
        <div className="flex flex-col gap-12">
            {/* Top Avatars (Chats) */}
            <ContentRow 
                title="Chatlar" 
                subtitle="oxirgi xabarlar" 
                badge="1"
                onSeeAll={() => onTabChange?.("chats")}
            >
                <ChatPreviewCard 
                    name="Islomjon" 
                    avatar="https://api.dicebear.com/7.x/avataaars/svg?seed=Islom" 
                    message="Salom, yangi loyiha..." 
                    time="14:32" 
                    unread 
                />
                <ChatPreviewCard 
                    name="Dizayn jamoasi" 
                    avatar="https://api.dicebear.com/7.x/identicon/svg?seed=Design" 
                    message="Fayl: mockup.fig" 
                    time="12:45" 
                    isGroup
                />
                <ChatPreviewCard 
                    name="Madina" 
                    avatar="https://api.dicebear.com/7.x/avataaars/svg?seed=Madina" 
                    message="Rahmat! Juda zo'r 😍" 
                    time="11:20" 
                />
                <ChatPreviewCard 
                    name="Do'stlar" 
                    avatar="https://api.dicebear.com/7.x/initials/svg?seed=Friends" 
                    message="Sardor: Qayerdasiz?" 
                    time="10:05" 
                    isGroup
                />
                {[5, 6, 7, 8].map((i) => (
                    <ChatPreviewCard 
                        key={i}
                        name={`User ${i}`} 
                        avatar={`https://api.dicebear.com/7.x/avataaars/svg?seed=user${i}`} 
                        message="Hey, how are you?" 
                        time="09:00" 
                    />
                ))}
            </ContentRow>

            {/* Cinema Row */}
            <ContentRow title="Cinema" onSeeAll={() => onTabChange?.("gcinema")}>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <GCinemaCard 
                        key={i} 
                        title={`Cinematic Masterpiece ${i}`} 
                        image={`https://picsum.photos/seed/cinema${i}/800/450`} 
                        duration="2h 15m"
                        views="1.2M"
                        rating="4.8"
                        likes="450k"
                        year="2024"
                        postedTime="2h ago"
                    />
                ))}
            </ContentRow>

            {/* V. Cinema Row */}
            <ContentRow title="V. Cinema" onSeeAll={() => onTabChange?.("vcinema")}>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <VCinemaCard 
                        key={i} 
                        title={`Vertical Tale ${i}`} 
                        image={`https://picsum.photos/seed/vcinema${i}/400/600`} 
                        duration="1h 05m"
                        views="850k"
                        rating="4.5"
                        likes="120k"
                        year="2024"
                        postedTime="1d ago"
                    />
                ))}
            </ContentRow>

            {/* Music Row */}
            <ContentRow title="Musics" onSeeAll={() => onTabChange?.("musics")}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <MusicCard 
                        key={i} 
                        title={`Sonic Echo ${i}`} 
                        artist={`Artist ${i}`} 
                        image={`https://picsum.photos/seed/music${i}/400/400`} 
                        duration="3:45"
                        rating="4.9"
                        listens="2.5M"
                        likes="800k"
                        year="2023"
                        postedTime="3h ago"
                    />
                ))}
            </ContentRow>

            {/* Blogs Row */}
            <ContentRow title="Blogs" onSeeAll={() => onTabChange?.("blogs")}>
                {[1, 2, 3, 4, 5].map((i) => (
                    <PostCard 
                        key={i} 
                        author={`Thinker_${i}`} 
                        time={`${i}h ago`} 
                        content="Nexus is finally here! The glassmorphism UI feels incredibly smooth. Can't wait to see the new AI agents in action. #HumoNexus #SuperApp" 
                    />
                ))}
            </ContentRow>

            {/* G. Videos Row */}
            <ContentRow title="G. Videos" onSeeAll={() => onTabChange?.("gvideos")}>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <GVideoCard 
                        key={i} 
                        title={`Deep Dive into Nexus Architecture: Part ${i}`} 
                        author="Nexus Dev" 
                        views={`${i * 10}k`} 
                        time={`${i} days ago`} 
                        image={`https://picsum.photos/seed/video${i}/800/450`} 
                        duration="12:45"
                        postedTime="2d ago"
                    />
                ))}
            </ContentRow>

            {/* G. Streams Row */}
            <ContentRow title="G. Streams" onSeeAll={() => onTabChange?.("gstreams")}>
                <GStreamCard 
                    title="Global Nexus Launch Event" 
                    author="Nexus Official" 
                    status="LIVE" 
                    viewers="14.2k" 
                    startTime="10:00"
                    image="https://picsum.photos/seed/stream1/800/450" 
                    postedTime="Now"
                />
                <GStreamCard 
                    title="Code with Nexus Agents" 
                    author="AgentX" 
                    status="UPCOMING" 
                    waiting="5.4k"
                    image="https://picsum.photos/seed/stream2/800/450" 
                    postedTime="In 2h"
                />
                <GStreamCard 
                    title="Nexus Community Q&A" 
                    author="Humo Team" 
                    status="ENDED" 
                    viewers="45k"
                    likes="12k"
                    image="https://picsum.photos/seed/stream3/800/450" 
                    postedTime="Yesterday"
                />
            </ContentRow>

            {/* V. Videos Row */}
            <ContentRow title="V. Videos" onSeeAll={() => onTabChange?.("vvideos")}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <VVideoCard 
                        key={i} 
                        author={`Creator_${i}`} 
                        image={`https://picsum.photos/seed/vert${i}/400/711`} 
                        views="120k"
                        likes="15k"
                        duration="0:45"
                        postedTime="4h ago"
                    />
                ))}
            </ContentRow>

            {/* V. Streams Row */}
            <ContentRow title="V. Streams" onSeeAll={() => onTabChange?.("vstreams")}>
                <VStreamCard 
                    title="Vertical Live Vibes" 
                    author="V-Creator" 
                    status="LIVE" 
                    viewers="2.1k" 
                    startTime="10:30"
                    image="https://picsum.photos/seed/vstream1/400/711" 
                    postedTime="Now"
                />
                <VStreamCard 
                    title="Upcoming Vertical Show" 
                    author="ShowRunner" 
                    status="UPCOMING" 
                    waiting="800"
                    image="https://picsum.photos/seed/vstream2/400/711" 
                    postedTime="Tomorrow"
                />
                <VStreamCard 
                    title="Ended Vertical Stream" 
                    author="HumoLive" 
                    status="ENDED" 
                    viewers="10k"
                    likes="2.5k"
                    image="https://picsum.photos/seed/vstream3/400/711" 
                    postedTime="2d ago"
                />
            </ContentRow>

            {/* Profile Recommendations */}
            <ContentRow title="Suggested For You">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <ProfileCard 
                        key={i} 
                        name={`Influencer ${i}`} 
                        handle={`@nexus_star_${i}`} 
                        image={`https://api.dicebear.com/7.x/avataaars/svg?seed=user${i}`} 
                    />
                ))}
            </ContentRow>
            
            {/* Spacing for Dock */}
            <div className="h-20" />
        </div>
    );
}
