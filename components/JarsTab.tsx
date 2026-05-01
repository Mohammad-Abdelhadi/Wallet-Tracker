"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Target, ChevronRight, Check, X } from "lucide-react";
import { useFinance, Jar } from "../context/FinanceContext";
import confetti from "canvas-confetti";

const JarSvg = ({ progress }: { progress: number }) => (
  <svg width="48" height="56" viewBox="0 0 60 80" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-lg">
    <defs>
      <clipPath id="jar-clip">
        <path d="M 15 10 L 45 10 L 45 15 L 55 25 L 55 75 Q 55 80 50 80 L 10 80 Q 5 80 5 75 L 5 25 L 15 15 Z" />
      </clipPath>
      <linearGradient id="gold-gradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fde047" />
        <stop offset="50%" stopColor="#eab308" />
        <stop offset="100%" stopColor="#ca8a04" />
      </linearGradient>
    </defs>
    <path d="M 15 10 L 45 10 L 45 15 L 55 25 L 55 75 Q 55 80 50 80 L 10 80 Q 5 80 5 75 L 5 25 L 15 15 Z" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
    <g clipPath="url(#jar-clip)">
       <rect x="0" y={80 - (80 * progress / 100)} width="60" height={80 * progress / 100} fill="url(#gold-gradient)" />
       {progress > 0 && <path d="M 0 {80 - (80 * progress / 100)} Q 15 {85 - (80 * progress / 100)} 30 {80 - (80 * progress / 100)} T 60 {80 - (80 * progress / 100)}" stroke="rgba(255,255,255,0.5)" strokeWidth="2" fill="none" opacity="0.6" />}
    </g>
    <path d="M 15 15 L 45 15 M 10 25 L 50 25 M 20 10 L 20 15 M 40 10 L 40 15" stroke="rgba(255,255,255,0.3)" strokeWidth="1" fill="none" />
    <path d="M 20 30 Q 25 35 20 60" stroke="rgba(255,255,255,0.2)" strokeWidth="3" fill="none" strokeLinecap="round" />
  </svg>
);

export default function JarsTab() {
  const { jars, addToJar, addJar } = useFinance();
  const [selectedJar, setSelectedJar] = useState<Jar | null>(null);
  const [isAddingJar, setIsAddingJar] = useState(false);
  const [addAmount, setAddAmount] = useState("");
  const [newJarName, setNewJarName] = useState("");
  const [newJarTarget, setNewJarTarget] = useState("");
  const [newJarIcon, setNewJarIcon] = useState("🚗");

  const triggerConfetti = () => {
    const duration = 2000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#c084fc', '#ffffff', '#FFD700']
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#c084fc', '#ffffff', '#FFD700']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJar || !addAmount) return;
    
    const amount = parseFloat(addAmount);
    if (isNaN(amount) || amount <= 0) return;

    addToJar(selectedJar.id, amount);
    
    // Check if goal met
    if (selectedJar.currentAmount + amount >= selectedJar.targetAmount) {
       triggerConfetti();
    }
    
    setAddAmount("");
    setSelectedJar(null);
  };

  const handleCreateJar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJarName || !newJarTarget) return;

    const targetAmount = parseFloat(newJarTarget);
    if (isNaN(targetAmount) || targetAmount <= 0) return;

    addJar({
      name: newJarName,
      targetAmount,
      icon: newJarIcon
    });

    setNewJarName("");
    setNewJarTarget("");
    setNewJarIcon("🚗");
    setIsAddingJar(false);
  };

  return (
    <div className="pt-2 px-6 pb-6 h-full flex flex-col gap-6 relative">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-light">الحصالات</h1>
        <button onClick={() => setIsAddingJar(true)} className="w-10 h-10 rounded-full bg-[var(--color-surface)] flex items-center justify-center border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] transition-colors text-[var(--color-secondary)] hover:text-white shadow-sm">
          <Plus size={18} />
        </button>
      </header>

      <div className="flex flex-col gap-4">
        {jars.map((jar, i) => {
          const progress = Math.min((jar.currentAmount / jar.targetAmount) * 100, 100);
          const isComplete = progress === 100;

          return (
            <motion.div
              key={jar.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => !isComplete && setSelectedJar(jar)}
              className={`bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-app)] p-5 rounded-3xl border border-[var(--color-border)] flex flex-col gap-4 shadow-lg cursor-pointer ${isComplete ? 'opacity-60 grayscale-[50%]' : 'hover:border-[var(--color-accent)]'} transition-all`}
            >
              <div className="flex justify-between items-start">
                 <div className="flex items-center gap-3">
                    <div className="bg-black/20 p-2 rounded-2xl border border-white/5 relative flex items-center justify-center min-w-[70px]">
                       <JarSvg progress={progress} />
                       <div className="absolute -bottom-2 -right-2 text-xl bg-[var(--color-surface-hover)] rounded-full w-8 h-8 flex items-center justify-center border border-white/10 shadow-lg">{jar.icon}</div>
                    </div>
                    <div className="flex flex-col ml-1">
                       <h3 className="font-medium text-[16px] text-white/90">{jar.name}</h3>
                       <p className="text-[12px] text-white/50">{jar.currentAmount.toFixed(2)} JOD / {jar.targetAmount.toFixed(2)} JOD</p>
                    </div>
                 </div>
                 <div className="flex flex-col items-end">
                    <span className="text-[20px] font-bold text-[var(--color-accent)] drop-shadow-md">{Math.floor(progress)}%</span>
                    {isComplete && <span className="text-[10px] text-emerald-400 font-medium">مكتمل</span>}
                 </div>
              </div>
              
              <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden relative border border-white/5">
                <div 
                  className={`absolute left-0 top-0 bottom-0 rounded-full transition-all duration-1000 ${isComplete ? 'bg-emerald-400' : 'bg-gradient-to-r from-yellow-400 to-[#ca8a04]'}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </motion.div>
          );
        })}
        {jars.length === 0 && (
           <div className="text-center py-20 opacity-50 flex flex-col items-center justify-center">
             <Target size={48} className="mb-4 text-white/20" />
             <p>لا يوجد أهداف حالياً</p>
             <button onClick={() => setIsAddingJar(true)} className="mt-4 px-6 py-2 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-full text-sm">أضف هدفاً جديداً</button>
           </div>
        )}
      </div>

      <AnimatePresence>
        {selectedJar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <span className="text-2xl">{selectedJar.icon}</span> تمويل {selectedJar.name}
                </h2>
                <button onClick={() => setSelectedJar(null)} className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[var(--color-secondary)] hover:text-white transition-colors">
                  <X size={16} />
                </button>
              </div>

              <div className="mb-6 bg-[#0A0A0A] rounded-2xl p-4 flex items-center justify-between border border-[var(--color-border)]">
                <div className="text-[var(--color-secondary)] text-[12px] font-medium tracking-wide">المتبقي للهدف</div>
                <div className="font-mono text-lg font-bold text-white/90" dir="ltr">{(selectedJar.targetAmount - selectedJar.currentAmount).toFixed(2)} JOD</div>
              </div>

              <form onSubmit={handleAddSubmit}>
                <div className="relative mb-6">
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={addAmount}
                    onChange={(e) => setAddAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-transparent text-5xl font-mono text-center font-bold border-b border-[var(--color-border)] pb-4 focus:outline-none focus:border-[var(--color-accent)] transition-colors placeholder:text-white/10"
                    dir="ltr"
                    autoFocus
                  />
                  <span className="absolute right-0 bottom-6 text-xl text-[var(--color-secondary)] font-medium">JOD</span>
                </div>
                
                <button 
                  type="submit"
                  disabled={!addAmount}
                  className="w-full py-4 bg-[var(--color-accent)] text-black rounded-xl font-bold uppercase tracking-wider text-sm hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(16,185,129,0.3)]"
                >
                  <Target size={18} /> إضافة للحصالة
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* Add New Jar Modal */}
        {isAddingJar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-gradient-to-br from-[var(--color-surface)] to-[#111] border border-[var(--color-border)] rounded-3xl p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold flex items-center gap-2">إضافة هدف جديد</h2>
                <button onClick={() => setIsAddingJar(false)} className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[var(--color-secondary)] hover:text-white transition-colors">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateJar} className="flex flex-col gap-5 text-right" dir="rtl">
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="text-[11px] text-[var(--color-secondary)] mb-2 block uppercase tracking-widest font-medium">اسم الهدف</label>
                    <input
                      type="text"
                      required
                      value={newJarName}
                      onChange={(e) => setNewJarName(e.target.value)}
                      placeholder="مثال: سيارة جديدة"
                      className="w-full bg-[var(--color-app)] border border-[var(--color-border)] rounded-xl p-4 text-[14px] focus:outline-none focus:border-[var(--color-accent)] transition-colors placeholder:text-white/20"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[var(--color-secondary)] mb-2 block uppercase tracking-widest font-medium">اختر أيقونة</label>
                    <div className="flex flex-wrap gap-2">
                      {["🚗", "🏠", "✈️", "💻", "💍", "📚", "🏥", "🎯", "🎮", "📱", "🎁", "🏃"].map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setNewJarIcon(emoji)}
                          className={`w-[45px] h-[45px] rounded-xl text-2xl flex items-center justify-center transition-all ${newJarIcon === emoji ? 'bg-[var(--color-accent)] border-[var(--color-accent)] scale-110 shadow-lg' : 'bg-[var(--color-app)] border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]'}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-2">
                  <label className="text-[11px] text-[var(--color-secondary)] mb-2 block uppercase tracking-widest font-medium">المبلغ المستهدف (JOD)</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    value={newJarTarget}
                    onChange={(e) => setNewJarTarget(e.target.value)}
                    placeholder="5000"
                    className="w-full bg-[var(--color-app)] border border-[var(--color-border)] rounded-xl p-4 text-[16px] font-mono focus:outline-none focus:border-[var(--color-accent)] transition-colors placeholder:text-white/20"
                    dir="ltr"
                  />
                </div>
                
                <button 
                  type="submit"
                  disabled={!newJarName || !newJarTarget}
                  className="w-full mt-4 py-4 bg-[var(--color-accent)] text-black rounded-xl font-bold uppercase tracking-wider hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(16,185,129,0.3)]"
                >
                  <Plus size={18} /> إنشاء الهدف
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
