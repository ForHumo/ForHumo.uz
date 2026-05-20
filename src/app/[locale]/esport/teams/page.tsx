'use client';
export const dynamic = 'force-dynamic';

import { useTranslations } from 'next-intl';
import { TeamsGrid } from '@/components/esport/teams/TeamsGrid';

export default function TeamsPage() {
    const t = useTranslations('Esport');

    return (
        <div className="min-h-screen bg-[#020617] text-white pt-24 pb-20 px-4">
            <div className="container mx-auto max-w-7xl">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-white/50 mb-2">
                            {t('teams_list')}
                        </h1>
                        <p className="text-neutral-400 font-medium max-w-lg leading-relaxed">
                            {t('teams_subtitle')}
                        </p>
                    </div>
                </div>

                {/* Main Grid Component */}
                <TeamsGrid />
            </div>
        </div>
    );
}
