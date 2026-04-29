"use client";

import React, { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

interface ContentRowProps {
    title: string;
    children: React.ReactNode;
}

export function ContentRow({ title, children }: ContentRowProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const { scrollLeft, clientWidth } = scrollRef.current;
            const scrollTo = direction === 'left' ? scrollLeft - clientWidth * 0.8 : scrollLeft + clientWidth * 0.8;
            scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
        }
    };

    return (
        <section className="mb-12 relative group/row">
            <div className="flex items-center justify-between mb-6 px-4">
                <h3 className="text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2">
                    <div className="w-1.5 h-6 bg-primary rounded-full shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]" />
                    {title}
                </h3>
                <button className="text-xs font-bold text-gray-500 hover:text-primary transition-colors flex items-center gap-1 uppercase tracking-widest group">
                    See All
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
            </div>

            {/* Scroll Buttons */}
            <div className="absolute top-1/2 -translate-y-1/2 left-0 z-20 opacity-0 group-hover/row:opacity-100 transition-opacity hidden md:block">
                <button 
                    onClick={() => scroll('left')}
                    className="w-12 h-12 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-center -ml-6 hover:bg-primary transition-all text-white shadow-2xl"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
            </div>
            
            <div className="absolute top-1/2 -translate-y-1/2 right-0 z-20 opacity-0 group-hover/row:opacity-100 transition-opacity hidden md:block">
                <button 
                    onClick={() => scroll('right')}
                    className="w-12 h-12 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-center -mr-6 hover:bg-primary transition-all text-white shadow-2xl"
                >
                    <ChevronRight className="w-6 h-6" />
                </button>
            </div>

            {/* Scrollable Container */}
            <div 
                ref={scrollRef}
                className="flex items-start gap-4 md:gap-6 overflow-x-auto custom-scrollbar-hide px-4 pb-4 scroll-smooth"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {children}
                {/* Spacer at the end for padding */}
                <div className="flex-shrink-0 w-8 h-full" />
            </div>

            <style jsx>{`
                .custom-scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
        </section>
    );
}
