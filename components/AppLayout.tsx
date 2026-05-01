"use client";

import React, { useState, useEffect } from "react";
import { Home, Mic, List, Wallet, User, PlusCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import VoiceModal from "./VoiceModal";
import Toaster from "./Toaster";

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function AppLayout({ children, activeTab, onTabChange }: LayoutProps) {
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);

  useEffect(() => {
    const handleOpenVoice = () => setIsVoiceOpen(true);
    window.addEventListener('open-voice', handleOpenVoice);
    return () => window.removeEventListener('open-voice', handleOpenVoice);
  }, []);

  const navItems = [
    { id: "home", icon: Home, label: "الرئيسية" },
    { id: "transactions", icon: List, label: "المعاملات" },
    { id: "voice", icon: Mic, label: "تسجيل 🎙️", isAccent: true },
    { id: "jars", icon: Wallet, label: "الحصالة" },
    { id: "profile", icon: User, label: "حسابي" },
  ];

  return (
    <>
      <Toaster />
      <div className="pt-6 px-6 pb-2 text-[11px] font-medium opacity-50 font-mono tracking-widest flex justify-between items-center z-50 relative pointer-events-none" dir="ltr">
      </div>
      <div className="flex-1 overflow-y-auto pb-40 relative hide-scrollbar">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="min-h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Sticky Bottom Navigation */}
      <div className="absolute bottom-0 w-full bg-[var(--color-surface)] backdrop-blur-xl border-t border-white/5 px-6 py-4 flex justify-between items-center z-40 pb-[env(safe-area-inset-bottom,16px)]">
        {navItems.filter(item => !item.isAccent).map((item, index) => (
          <React.Fragment key={item.id}>
            {index === 2 && (
                <button
                onClick={() => setIsVoiceOpen(true)}
                className="w-14 h-14 bg-[var(--color-accent)] text-[#000] rounded-full flex items-center justify-center hover:scale-110 transition-transform -translate-y-4 shadow-[0_4px_25px_rgba(16,185,129,0.4)] relative border-4 border-[var(--color-app)]"
              >
                <Mic size={24} strokeWidth={2.5} />
              </button>
            )}
            <button
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center justify-center relative transition-all duration-300 w-12 ${
                activeTab === item.id ? "text-[var(--color-accent)]" : "text-[var(--color-secondary)] hover:text-white"
              }`}
            >
              <item.icon size={22} strokeWidth={activeTab === item.id ? 2.5 : 2} />
              <span className={`text-[9px] mt-1 font-medium ${activeTab === item.id ? 'opacity-100' : 'opacity-0'} transition-opacity`}>{item.label}</span>
            </button>
          </React.Fragment>
        ))}
      </div>

      <AnimatePresence>
        {isVoiceOpen && <VoiceModal onClose={() => setIsVoiceOpen(false)} />}
      </AnimatePresence>
    </>
  );
}
