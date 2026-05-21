"use client";

import { ContentRow } from "./content-row";
import {
    GCinemaCard, VCinemaCard, MusicCard, PostCard,
    GVideoCard, GStreamCard, VStreamCard, VVideoCard,
    ProfileCard, ChatPreviewCard,
} from "./content-cards";

interface Props {
    onTabChange?: (tab: string) => void;
}

export function NexusFeed({ onTabChange }: Props) {
    return (
        <div className="flex flex-col gap-2 pb-8">

            {/* Chats */}
            <ContentRow
                title="Xabarlar"
                subtitle="so'nggi"
                badge="3"
                onSeeAll={() => onTabChange?.("chats")}
            >
                <ChatPreviewCard name="Islomjon"      avatar="https://api.dicebear.com/7.x/avataaars/svg?seed=Islom"   message="Salom, yangi loyiha haqida..."  time="14:32" unread  />
                <ChatPreviewCard name="Dizayn jamoasi" avatar="https://api.dicebear.com/7.x/identicon/svg?seed=Design"  message="Fayl: mockup.fig yuklab olindi"  time="12:45" isGroup />
                <ChatPreviewCard name="Madina"         avatar="https://api.dicebear.com/7.x/avataaars/svg?seed=Madina"  message="Rahmat! Juda ajoyib chiqibdi"    time="11:20" unread  />
                <ChatPreviewCard name="Do'stlar"       avatar="https://api.dicebear.com/7.x/initials/svg?seed=Friends"  message="Sardor: Qayerdasiz?"             time="10:05" isGroup />
                {[5, 6, 7, 8].map(i => (
                    <ChatPreviewCard
                        key={i}
                        name={`Foydalanuvchi ${i}`}
                        avatar={`https://api.dicebear.com/7.x/avataaars/svg?seed=user${i}`}
                        message="Nexus platformasi zo'r bo'libdi!"
                        time="09:00"
                    />
                ))}
            </ContentRow>

            {/* G. Cinema */}
            <ContentRow title="G. Kino" onSeeAll={() => onTabChange?.("gcinema")}>
                {Array.from({ length: 6 }, (_, i) => (
                    <GCinemaCard key={i}
                        title={`Kinematografik Asar ${i + 1}`}
                        image={`https://picsum.photos/seed/cinema${i}/800/450`}
                        duration="2s 15d" views="1.2M" rating="4.8" likes="450k" year="2024" postedTime="2 soat oldin"
                    />
                ))}
            </ContentRow>

            {/* V. Cinema */}
            <ContentRow title="V. Kino" onSeeAll={() => onTabChange?.("vcinema")}>
                {Array.from({ length: 7 }, (_, i) => (
                    <VCinemaCard key={i}
                        title={`Vertikal Film ${i + 1}`}
                        image={`https://picsum.photos/seed/vcinema${i}/400/600`}
                        duration="1s 05d" views="850k" rating="4.5" likes="120k" year="2024" postedTime="1 kun oldin"
                    />
                ))}
            </ContentRow>

            {/* Musics */}
            <ContentRow title="Musiqa" onSeeAll={() => onTabChange?.("musics")}>
                {Array.from({ length: 8 }, (_, i) => (
                    <MusicCard key={i}
                        title={`Sonic Echo ${i + 1}`}
                        artist={`Artist ${i + 1}`}
                        image={`https://picsum.photos/seed/music${i}/400/400`}
                        duration="3:45" rating="4.9" listens="2.5M" likes="800k" year="2024" postedTime="3 soat oldin"
                    />
                ))}
            </ContentRow>

            {/* Posts */}
            <ContentRow title="Postlar" onSeeAll={() => onTabChange?.("blogs")}>
                {Array.from({ length: 5 }, (_, i) => (
                    <PostCard key={i}
                        author={`@nexus_${i + 1}`}
                        time={`${i + 1} soat oldin`}
                        content="Nexus platformasi nihoyat ishga tushdi! Glassmorphism interfeysi juda yumshoq his qildiryapti. AI agentlarni kutib qolaman. #HumoNexus #SuperApp"
                    />
                ))}
            </ContentRow>

            {/* G. Videos */}
            <ContentRow title="G. Videolar" onSeeAll={() => onTabChange?.("gvideos")}>
                {Array.from({ length: 6 }, (_, i) => (
                    <GVideoCard key={i}
                        title={`Nexus Arxitekturasi: ${i + 1}-qism`}
                        author="Nexus Dev"
                        views={`${(i + 1) * 10}k`}
                        time={`${i + 1} kun`}
                        image={`https://picsum.photos/seed/video${i}/800/450`}
                        duration="12:45"
                        postedTime={`${i + 1} kun oldin`}
                    />
                ))}
            </ContentRow>

            {/* G. Streams */}
            <ContentRow title="G. Efirlar" onSeeAll={() => onTabChange?.("gstreams")}>
                <GStreamCard title="Global Nexus Launch"    author="Nexus Official" status="LIVE"     viewers="14.2k" startTime="10:00" image="https://picsum.photos/seed/stream1/800/450" postedTime="Hozir"    />
                <GStreamCard title="AI Agentlar bilan kod"  author="AgentX"         status="UPCOMING" waiting="5.4k"                    image="https://picsum.photos/seed/stream2/800/450" postedTime="2 soatda" />
                <GStreamCard title="Nexus Hamjamiyat Q&A"   author="Humo Team"      status="ENDED"    viewers="45k"   likes="12k"        image="https://picsum.photos/seed/stream3/800/450" postedTime="Kecha"    />
            </ContentRow>

            {/* V. Videos / Shorts */}
            <ContentRow title="Shorts" onSeeAll={() => onTabChange?.("vvideos")}>
                {Array.from({ length: 8 }, (_, i) => (
                    <VVideoCard key={i}
                        author={`@creator_${i + 1}`}
                        image={`https://picsum.photos/seed/vert${i}/400/711`}
                        views="120k" likes="15k" duration="0:45"
                        postedTime={`${i + 1} soat oldin`}
                    />
                ))}
            </ContentRow>

            {/* V. Streams */}
            <ContentRow title="V. Efirlar" onSeeAll={() => onTabChange?.("vstreams")}>
                <VStreamCard title="Vertikal Jonli Efir"   author="V-Creator"   status="LIVE"     viewers="2.1k" startTime="10:30" image="https://picsum.photos/seed/vstream1/400/711" postedTime="Hozir"    />
                <VStreamCard title="Kutilayotgan Ko'rsatuv" author="ShowRunner"   status="UPCOMING" waiting="800"                    image="https://picsum.photos/seed/vstream2/400/711" postedTime="Ertaga"   />
                <VStreamCard title="Tugagan Efir"           author="HumoLive"    status="ENDED"    viewers="10k"  likes="2.5k"       image="https://picsum.photos/seed/vstream3/400/711" postedTime="2 kun oldin" />
            </ContentRow>

            {/* Suggested profiles */}
            <ContentRow title="Siz uchun tavsiyalar">
                {Array.from({ length: 6 }, (_, i) => (
                    <ProfileCard key={i}
                        name={`Influencer ${i + 1}`}
                        handle={`@nexus_star_${i + 1}`}
                        image={`https://api.dicebear.com/7.x/avataaars/svg?seed=suggest${i}`}
                    />
                ))}
            </ContentRow>

            <div className="h-16" aria-hidden />
        </div>
    );
}
