"use client";

import React from "react";
import { 
    X, 
    Moon, 
    Sun, 
    Globe, 
    Bell, 
    Lock, 
    User, 
    Settings, 
    Palette,
    LogOut
} from "lucide-react";
import { motion } from "framer-motion";

interface NexusSettingsPanelProps {
    onClose: () => void;
}

export function NexusSettingsPanel({ onClose }: NexusSettingsPanelProps) {
    return (
        <>
            {/* Backdrop */}
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-black/80 backdrop-blur-md z-[80]"
            />

            {/* Modal */}
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-2xl max-h-[80vh] z-[90] glass-effect border border-white/10 rounded-[2.5rem] overflow-hidden flex flex-col shadow-[0_30px_100px_rgba(0,0,0,0.8)]"
            >
                {/* Header */}
                <div className="p-8 flex items-center justify-between border-b border-white/5">
                    <div>
                        <h2 className="text-2xl font-bold">Preferences</h2>
                        <p className="text-sm text-gray-500">Manage your Nexus experience</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-3 hover:bg-white/5 rounded-2xl transition-colors"
                    >
                        <X className="w-6 h-6 text-gray-400" />
                    </button>
                </div>

                {/* Grid Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Theme Toggle */}
                    <div className="p-6 bg-white/5 rounded-[2rem] border border-white/5 hover:border-primary/30 transition-all group">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                                <Palette className="w-5 h-5" />
                            </div>
                            <div className="flex bg-black/40 p-1 rounded-lg">
                                <button className="p-1.5 rounded-md bg-white/10 text-white"><Moon className="w-4 h-4" /></button>
                                <button className="p-1.5 rounded-md text-gray-500 hover:text-white"><Sun className="w-4 h-4" /></button>
                            </div>
                        </div>
                        <h4 className="font-bold mb-1">Appearance</h4>
                        <p className="text-[10px] text-gray-500">Switch between dark and light themes</p>
                    </div>

                    {/* Language */}
                    <div className="p-6 bg-white/5 rounded-[2rem] border border-white/5 hover:border-primary/30 transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-500">
                                <Globe className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-bold bg-white/5 px-2 py-1 rounded">EN (US)</span>
                        </div>
                        <h4 className="font-bold mb-1">Language</h4>
                        <p className="text-[10px] text-gray-500">Select your preferred language</p>
                    </div>

                    {/* Notifications */}
                    <div className="p-6 bg-white/5 rounded-[2rem] border border-white/5 hover:border-primary/30 transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-500">
                                <Bell className="w-5 h-5" />
                            </div>
                            <div className="w-10 h-5 bg-primary rounded-full relative">
                                <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
                            </div>
                        </div>
                        <h4 className="font-bold mb-1">Notifications</h4>
                        <p className="text-[10px] text-gray-500">Control your alert preferences</p>
                    </div>

                    {/* Privacy */}
                    <div className="p-6 bg-white/5 rounded-[2rem] border border-white/5 hover:border-primary/30 transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-500">
                                <Lock className="w-5 h-5" />
                            </div>
                        </div>
                        <h4 className="font-bold mb-1">Privacy</h4>
                        <p className="text-[10px] text-gray-500">Manage your visibility and security</p>
                    </div>

                    {/* Account */}
                    <div className="p-6 bg-white/5 rounded-[2rem] border border-white/5 hover:border-primary/30 transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center text-green-500">
                                <User className="w-5 h-5" />
                            </div>
                        </div>
                        <h4 className="font-bold mb-1">Account Management</h4>
                        <p className="text-[10px] text-gray-500">Update profile info and security</p>
                    </div>

                    {/* Algorithm */}
                    <div className="p-6 bg-white/5 rounded-[2rem] border border-white/5 hover:border-primary/30 transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 rounded-xl bg-pink-500/20 flex items-center justify-center text-pink-500">
                                <Settings className="w-5 h-5" />
                            </div>
                        </div>
                        <h4 className="font-bold mb-1">Personalization</h4>
                        <p className="text-[10px] text-gray-500">Tune the recommendation algorithm</p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-white/5 flex items-center justify-between">
                    <button className="flex items-center gap-2 text-red-500 text-sm font-bold hover:bg-red-500/10 px-4 py-2 rounded-xl transition-colors">
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                    <p className="text-[10px] text-gray-600">Nexus Version 2.0.4 - "Supernova"</p>
                </div>
            </motion.div>
        </>
    );
}
