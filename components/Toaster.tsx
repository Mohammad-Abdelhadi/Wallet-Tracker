"use client";

import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { useFinance } from "../context/FinanceContext";
import { ArrowDownRight, ArrowUpRight, ArrowRightLeft, X } from "lucide-react";

export default function Toaster() {
  const { notifications, dismissNotification } = useFinance();

  return (
    <div className="absolute top-12 left-0 right-0 z-[100] flex flex-col items-center gap-3 px-4 pointer-events-none">
      <AnimatePresence>
        {notifications.map((notif) => (
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="bg-[#1C1C1E]/95 backdrop-blur-xl border border-white/10 p-4 rounded-3xl shadow-2xl flex items-center gap-4 w-full max-w-[360px] pointer-events-auto overflow-hidden relative group"
            onClick={() => dismissNotification(notif.id)}
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner relative z-10 ${
              notif.type === 'income' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 
              notif.type === 'expense' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 
              'bg-blue-500/20 text-blue-400 border border-blue-500/30'
            }`}>
              {notif.type === 'income' && <ArrowDownRight size={24} />}
              {notif.type === 'expense' && <ArrowUpRight size={24} />}
              {notif.type === 'transfer' && <ArrowRightLeft size={24} />}
            </div>
            
            <div className="flex-1 flex flex-col justify-center relative z-10 pt-1">
              <h4 className="text-[13px] font-bold text-white/90 mb-0.5">{notif.title}</h4>
              <p className="text-[11px] text-white/60 leading-tight">{notif.message}</p>
            </div>
            
            <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-white/40 opacity-0 group-hover:opacity-100 transition-opacity">
              <X size={14} />
            </div>

            {/* Reflection / Glow effect */}
            <div className={`absolute -right-10 -top-10 w-24 h-24 blur-3xl rounded-full opacity-20 pointer-events-none ${
               notif.type === 'income' ? 'bg-emerald-500' : 
               notif.type === 'expense' ? 'bg-rose-500' : 
               'bg-blue-500'
            }`}></div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
