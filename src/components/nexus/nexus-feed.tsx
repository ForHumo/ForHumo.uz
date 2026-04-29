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
    ProfileCard 
} from "./content-cards";
import { motion } from "framer-motion";

export function NexusFeed() {
    return (
        <div className="flex flex-col">
            {/* Chats Preview Row (Mental model: circular avatars like stories but for chats) */}
            <section className="mb-12 px-4">
                <div className="flex items-center gap-6 overflow-x-auto custom-scrollbar-hide py-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                        <motion.div 
                            key={i}
                            whileHover={{ scale: 1.1 }}
                            className="flex-shrink-0 flex flex-col items-center gap-2 cursor-pointer group"
                        >
                            <div className="relative">
                                <div className="w-16 h-16 md:w-20 md:h-20 rounded-[2rem] bg-gradient-to-tr from-primary to-blue-600 p-[2px]">
                                    <div className="w-full h-full rounded-[1.8rem] bg-black p-0.5 overflow-hidden">
                                        <img 
                                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`} 
                                            className="w-full h-full object-cover rounded-[1.8rem]" 
                                            alt="Chat avatar" 
                                        />
                                    </div>
                                </div>
                                {i < 4 && (
                                    <div className="absolute top-0 right-0 w-5 h-5 bg-primary text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-[#050505] shadow-lg">
                                        {i * 2}
                                    </div>
                                )}
                            </div>
                            <span className="text-[10px] font-medium text-gray-400 group-hover:text-white transition-colors">
                                User {i}
                            </span>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Cinema Row */}
            <ContentRow title="Cinema">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <GCinemaCard 
                        key={i} 
                        title={`Cinematic Masterpiece ${i}`} 
                        image={`https://picsum.photos/seed/cinema${i}/800/450`} 
                        duration="2h 15m"
                        views="1.2M"
                        rating="4.8"
                        likes="450k"
                    />
                ))}
            </ContentRow>

            {/* V. Cinema Row */}
            <ContentRow title="V. Cinema">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <VCinemaCard 
                        key={i} 
                        title={`Vertical Tale ${i}`} 
                        image={`https://picsum.photos/seed/vcinema${i}/400/600`} 
                        duration="1h 05m"
                        views="850k"
                        rating="4.5"
                        likes="120k"
                    />
                ))}
            </ContentRow>

            {/* Music Row */}
            <ContentRow title="Musics">
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
                    />
                ))}
            </ContentRow>

            {/* Blogs Row */}
            <ContentRow title="Blogs">
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
            <ContentRow title="G. Videos">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <GVideoCard 
                        key={i} 
                        title={`Deep Dive into Nexus Architecture: Part ${i}`} 
                        author="Nexus Dev" 
                        views={`${i * 10}k`} 
                        time={`${i} days ago`} 
                        image={`https://picsum.photos/seed/video${i}/800/450`} 
                        duration="12:45"
                    />
                ))}
            </ContentRow>

            {/* G. Streams Row */}
            <ContentRow title="G. Streams">
                <GStreamCard 
                    title="Global Nexus Launch Event" 
                    author="Nexus Official" 
                    status="LIVE" 
                    viewers="14.2k" 
                    startTime="10:00"
                    image="https://picsum.photos/seed/stream1/800/450" 
                />
                <GStreamCard 
                    title="Code with Nexus Agents" 
                    author="AgentX" 
                    status="UPCOMING" 
                    waiting="5.4k"
                    image="https://picsum.photos/seed/stream2/800/450" 
                />
                <GStreamCard 
                    title="Nexus Community Q&A" 
                    author="Humo Team" 
                    status="ENDED" 
                    viewers="45k"
                    likes="12k"
                    image="https://picsum.photos/seed/stream3/800/450" 
                />
            </ContentRow>

            {/* V. Videos Row */}
            <ContentRow title="V. Videos">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <VVideoCard 
                        key={i} 
                        author={`Creator_${i}`} 
                        image={`https://picsum.photos/seed/vert${i}/400/711`} 
                        views="120k"
                        likes="15k"
                        duration="0:45"
                    />
                ))}
            </ContentRow>

            {/* V. Streams Row */}
            <ContentRow title="V. Streams">
                <VStreamCard 
                    title="Vertical Live Vibes" 
                    author="V-Creator" 
                    status="LIVE" 
                    viewers="2.1k" 
                    startTime="10:30"
                    image="https://picsum.photos/seed/vstream1/400/711" 
                />
                <VStreamCard 
                    title="Upcoming Vertical Show" 
                    author="ShowRunner" 
                    status="UPCOMING" 
                    waiting="800"
                    image="https://picsum.photos/seed/vstream2/400/711" 
                />
                <VStreamCard 
                    title="Ended Vertical Stream" 
                    author="HumoLive" 
                    status="ENDED" 
                    viewers="10k"
                    likes="2.5k"
                    image="https://picsum.photos/seed/vstream3/400/711" 
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
