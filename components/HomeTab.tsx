"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Wallet, Mic, Send, CreditCard, PieChart as PieChartIcon, Target } from "lucide-react";
import { useFinance } from "../context/FinanceContext";
import { auth } from "../lib/firebase";
import { AVAILABLE_BANKS } from "./AuthAndSelection";
import { translations } from "../lib/translations";

export default function HomeTab() {
  const { balance, transactions, wallets, activeWalletId, setActiveWalletId, getWalletBalance, ethAddress, ethBalance, language, toggleLanguage } = useFinance();
  const t = translations[language];
  const [userName, setUserName] = useState("User");
  const [showNotifications, setShowNotifications] = useState(false);
  const [timeFilter, setTimeFilter] = useState<"all" | "monthly" | "weekly" | "3months" | "6months">("all");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        const full = user.displayName || user.email?.split('@')[0] || "User";
        setUserName(full.split(' ')[0]);
      }
    });
    return () => unsubscribe();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (language === 'ar') {
      if (hour < 12) return "صباح الخير،";
      return "مساء الخير،";
    } else {
      if (hour < 12) return "Good Morning,";
      return "Good Evening,";
    }
  };

  const greeting = getGreeting();

  const handleOpenVoice = () => {
    window.dispatchEvent(new CustomEvent('open-voice'));
  };

  const filteredByTime = transactions.filter(t => {
    if (timeFilter === "all") return true;
    const now = new Date();
    const d = new Date(t.date);
    const diffTime = Math.abs(now.getTime() - d.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (timeFilter === "weekly") return diffDays <= 7;
    if (timeFilter === "monthly") return diffDays <= 30;
    if (timeFilter === "3months") return diffDays <= 90;
    if (timeFilter === "6months") return diffDays <= 180;
    return true;
  });

  const filteredTransactions = activeWalletId === 'all' 
    ? filteredByTime 
    : filteredByTime.filter(t => t.walletId === activeWalletId || (!t.walletId && activeWalletId === 'reflect'));

  const recentTransactions = filteredTransactions.slice(0, 4);

  // Combine "all" and wallets into a single array for mapping
  const allCardIds = ["all", ...wallets.map(w => w.id)];

  const activeIndex = allCardIds.includes(activeWalletId) ? allCardIds.indexOf(activeWalletId) : 0;

  const renderCard = (type: "all" | string, index: number) => {
    const isActive = index === activeIndex;
    const diff = index - activeIndex;
    
    // Smooth infinite-like offset calculation
    let translateX = (language === 'ar' ? -diff : diff) * 70;
    let scale = 1 - Math.abs(diff) * 0.1;
    let zIndex = 30 - Math.abs(diff);
    let opacity = 1 - Math.abs(diff) * 0.4;

    if (Math.abs(diff) > 2) opacity = 0; // Only show 5 cards at once max

    if (type === "all") {
      return (
        <motion.div 
          key="all"
          layout
          initial={false}
          animate={{ x: translateX, scale, zIndex, opacity }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          onClick={() => setActiveWalletId("all")}
          className={`absolute w-[280px] h-[170px] bg-gradient-to-br from-[#0D2B1E] via-[#05110d] to-[#0D2B1E] backdrop-blur-3xl border border-[#22E3A6]/20 rounded-[24px] p-5 flex flex-col justify-between cursor-pointer shadow-[0_15px_30px_rgba(0,0,0,0.3)] origin-center`}
          style={{ left: '50%', marginLeft: '-140px' }}
        >
          <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none transform -scale-x-100">
            <PieChartIcon size={120} strokeWidth={1} className="text-[#22E3A6]" />
          </div>
          <div className="absolute inset-0 bg-[#22E3A6]/5 rounded-[24px] pointer-events-none"></div>

          <div className="relative z-10 flex justify-between items-start">
            <div className="w-10 h-10 rounded-full bg-[#22E3A6]/10 flex items-center justify-center backdrop-blur-sm shadow-sm border border-[#22E3A6]/20">
              <span className="text-xl">📊</span>
            </div>
            <span className="text-[12px] font-bold tracking-[0.1em] text-[#22E3A6] uppercase">{language === 'ar' ? 'المحفظة المجمعة' : 'TOTAL WALLET'}</span>
          </div>
          <div className="relative z-10 flex flex-col">
            <span className="text-[10px] uppercase tracking-[0.1em] text-white/50 font-semibold mb-1">{language === 'ar' ? 'إجمالي الأرصدة المربوطة' : 'SUM OF ALL ACCOUNTS'}</span>
            <div className="flex items-baseline gap-1">
              <h2 className="text-[32px] font-bold tracking-tight text-white drop-shadow-sm" dir="ltr">
                <span className="text-[18px] text-[#22E3A6] mr-1">JOD</span>
                {(balance + (ethAddress ? parseFloat(ethBalance) : 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
            </div>
          </div>
        </motion.div>
      );
    }

    const wallet = wallets.find(w => w.id === type);
    if (!wallet) return null;

    if (wallet.type === "web3") {
      return (
        <motion.div 
          key={wallet.id}
          layout
          initial={false}
          animate={{ x: translateX, scale, zIndex, opacity }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          onClick={() => setActiveWalletId(wallet.id)}
          className="absolute w-[280px] h-[170px] bg-white rounded-[24px] p-5 flex flex-col justify-between cursor-pointer shadow-[0_15px_30px_rgba(0,0,0,0.1)] origin-center border border-gray-200"
          style={{ left: '50%', marginLeft: '-140px' }}
        >
          <div className="relative z-10 flex justify-between items-start">
            <div className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center bg-gray-50 text-gray-500">
              <span className="text-xl">🌐</span>
            </div>
            <span className="text-[12px] font-bold tracking-[0.1em] text-black/60 uppercase">{wallet.name}</span>
          </div>
          <div className="relative z-10 flex flex-col">
            <span className="text-[10px] uppercase tracking-[0.1em] text-black/40 font-semibold mb-1">الرصيد المتاح</span>
            <div className="flex items-baseline gap-1">
              <h2 className="text-[32px] font-bold tracking-tight text-black drop-shadow-sm" dir="ltr">
                 <span className="text-[18px] text-black/50 mr-1">{ethAddress ? "HBAR" : "ETH"}</span>
                 {ethAddress ? parseFloat(ethBalance).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 4 }) : parseFloat('0').toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 4 })}
              </h2>
            </div>
            <div className="flex justify-between items-center mt-2">
              <div className="text-[11px] text-black/40 font-mono tracking-widest" dir="ltr">
                {ethAddress ? `${ethAddress.substring(0, 6)}...${ethAddress.substring(ethAddress.length - 4)}` : wallet.number}
              </div>
            </div>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div 
        key={wallet.id}
        layout
        initial={false}
        animate={{ x: translateX, scale, zIndex, opacity }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        onClick={() => setActiveWalletId(wallet.id)}
        className={`absolute w-[280px] h-[170px] ${wallet.color} rounded-[24px] p-5 flex flex-col justify-between cursor-pointer shadow-[0_15px_30px_rgba(0,0,0,0.2)] origin-center overflow-hidden border border-white/10`}
        style={{ left: '50%', marginLeft: '-140px' }}
      >
        {/* Subtle decorative overlays to make it look like a physical card */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
        
        {/* Specific Design Elements based on Bank */}
        {wallet.id === 'reflect' && (
          <div className="absolute -top-10 -left-10 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
        )}
        {wallet.id === 'arab_bank' && (
          <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 10px 10px, white 1px, transparent 0)', backgroundSize: '20px 20px' }}></div>
        )}
        {wallet.id === 'etihad' && (
          <div className="absolute top-0 left-0 w-full h-1 bg-white/20"></div>
        )}
        {wallet.id === 'islamic_intl' && (
          <div className="absolute bottom-0 right-0 w-24 h-24 border-4 border-white/5 rounded-full transform translate-x-12 translate-y-12"></div>
        )}
        {wallet.id === 'jib' && (
          <div className="absolute top-1/2 left-0 w-full h-px bg-white/10 transform rotate-12"></div>
        )}
        {wallet.id === 'hbtf' && (
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
        )}

        <div className="relative z-10 flex justify-between items-start">
          <div className="flex gap-2">
            {/* Card Chip */}
            <div className="w-10 h-7 bg-gradient-to-br from-[#E8D19F] to-[#B39356] rounded-md opacity-90 shadow-sm border border-white/20 flex items-center justify-center overflow-hidden">
               <div className="w-full h-[1px] bg-black/10 absolute top-1/2 transform -translate-y-1/2"></div>
               <div className="w-[1px] h-full bg-black/10 absolute left-1/2 transform -translate-x-1/2"></div>
               <div className="w-[80%] h-[60%] border border-black/10 rounded-sm"></div>
            </div>
          </div>
          <div className="flex flex-col items-end">
             <span className="text-[14px] font-bold tracking-[0.1em] text-white drop-shadow-md uppercase">{wallet.name}</span>
             <span className="text-[9px] text-white/70 tracking-widest mt-0.5">{wallet.bankName}</span>
          </div>
        </div>
        <div className="relative z-10 flex flex-col">
          <span className="text-[10px] uppercase tracking-[0.15em] text-white/70 font-medium mb-1">الرصيد المتاح</span>
          <div className="flex items-baseline gap-1">
            <h2 className="text-[28px] font-bold tracking-tight text-white drop-shadow-md" dir="ltr">
              <span className="text-[16px] text-white/80 mr-1 opacity-90">JOD</span>
              {getWalletBalance(wallet.id).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>
          </div>
          <div className="flex justify-between items-end mt-2">
            <div className="text-[13px] text-white/80 font-mono tracking-[0.15em] drop-shadow-sm font-medium" dir="ltr">
              {wallet.number || '**** **** **** 4022'}
            </div>
            {/* Logo Logic */}
            <div className="flex items-center">
              {wallet.id === 'reflect' ? (
                  <div className="flex">
                     <div className="w-4 h-4 rounded-full bg-red-500/80 mix-blend-screen"></div>
                     <div className="w-4 h-4 rounded-full bg-yellow-500/80 mix-blend-screen -ml-2"></div>
                  </div>
              ) : (
                  <div className="font-bold italic text-white/90 text-[12px] tracking-wider">VISA</div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  // Calculate advice based on transactions (more general as requested)
  const getAIAdvice = () => {
    if (transactions.length === 0) return { title: t.noTransactions, body: t.noTransactions, trend: "neutral" as const };
    
    const expenses = transactions.filter(t => t.type === 'expense');
    const income = transactions.filter(t => t.type === 'income');
    
    const totalExp = expenses.reduce((s, t) => s + t.amount, 0);
    const totalInc = income.reduce((s, t) => s + t.amount, 0);

    // General trend analysis
    if (totalInc > totalExp * 1.5) {
      return {
        title: t.excellent,
        body: language === 'ar' 
          ? "أنت تقوم بعمل رائع! دخلك يغطي نفقاتك ويزيد بنسبة ممتازة. فكر في استثمار بعض الفائض أو توفيره للأهداف الكبيرة."
          : "You're doing great! Your income exceeds your expenses significantly. Consider investing the surplus or saving for big goals.",
        trend: "up" as const
      };
    }

    // Category analysis (still useful but framed generally)
    const expensesByCategory = expenses.reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

    let maxCat = "";
    let maxAmt = 0;
    for (const [cat, amt] of Object.entries(expensesByCategory)) {
      if (amt > maxAmt) {
        maxAmt = amt;
        maxCat = cat;
      }
    }

    if (maxCat && maxAmt > totalExp * 0.4) {
      return { 
        title: t.advisoryAlert, 
        body: language === 'ar' 
          ? `بشكل عام، تستهلك فئة "${maxCat}" جزءاً كبيراً من ميزانيتك. حاول مراجعة استهلاكك في هذا الجانب لتحسين تدفقاتك النقدية.`
          : `Generally, "${maxCat}" takes up a large portion of your budget. reviewing your spending here could improve your cash flow.`, 
        trend: "down" as const 
      };
    }
    
    return { 
      title: t.aiAdvice, 
      body: language === 'ar'
        ? "توازنك المالي مستقر حالياً. نقترح الاستمرار في تسجيل كافة العمليات صوتياً لضمان دقة التحليلات المستقبلية."
        : "Your financial balance is currently stable. We suggest continuing to log all transactions via voice for accurate future insights.", 
      trend: "neutral" as const 
    };
  };

  const advice = getAIAdvice();

  return (
    <div className="pt-2 pb-6 h-full flex flex-col gap-6 overflow-y-auto hide-scrollbar">
      {/* Header */}
      <header className="flex justify-between items-center px-6">
        <div>
          <p className="text-[var(--color-secondary)] text-[12px] font-medium mb-1 tracking-widest text-right">{greeting}</p>
          <h1 className="text-2xl font-light" dir="ltr">{userName}</h1>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleLanguage}
            className="px-4 h-10 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center relative hover:bg-[var(--color-surface-hover)] transition-all group shadow-sm active:scale-95"
          >
            <span className="text-[12px] font-bold tracking-widest">{language === 'ar' ? 'ENGLISH' : 'العربية'}</span>
          </button>
          <button 
            onClick={() => setShowNotifications(true)}
            className="w-10 h-10 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center relative hover:bg-[var(--color-surface-hover)] transition-colors"
          >
            <span className="absolute top-2.5 right-3 w-2 h-2 bg-[var(--color-accent)] rounded-full border-2 border-[var(--color-surface)]"></span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-secondary)]">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </button>
        </div>
      </header>

      {/* Cards Stack */}
      <div className="relative h-[190px] w-full pt-4 mb-2 perspective-1000 overflow-hidden">
        {allCardIds.length > 0 ? (
          allCardIds.map((id, index) => renderCard(id, index))
        ) : (
          <div className="w-full flex justify-center mt-6 text-sm text-[var(--color-secondary)] text-center">لا توجد بطاقات مضافة حتى الآن.</div>
        )}
      </div>

      <div className="px-6 flex flex-col gap-6">
        
        

        {/* Quick Services Grid */}
        <section className="grid grid-cols-3 gap-3">
          <motion.div 
            onClick={() => window.dispatchEvent(new CustomEvent('change-tab', { detail: 'profile' }))}
            whileTap={{ scale: 0.95 }}
            className="bg-[#0D2B1E]/40 backdrop-blur-md border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 shadow-sm cursor-pointer hover:bg-[#0D2B1E]/60 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center mb-1">
              <Send size={20} className="transform -rotate-45 ml-1" />
            </div>
            <span className="text-[11px] font-medium text-white/70">{t.quickTransfer}</span>
          </motion.div>

          <motion.div 
            onClick={() => window.dispatchEvent(new CustomEvent('change-tab', { detail: 'jars' }))}
            whileTap={{ scale: 0.95 }}
            className="bg-[#0D2B1E]/40 backdrop-blur-md border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 shadow-sm cursor-pointer hover:bg-[#0D2B1E]/60 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-[#22E3A6]/10 text-[#22E3A6] flex items-center justify-center mb-1">
              <Target size={20} />
            </div>
            <span className="text-[11px] font-medium text-white/70">{t.goals}</span>
          </motion.div>

          <motion.div 
            onClick={() => window.dispatchEvent(new CustomEvent('change-tab', { detail: 'profile' }))}
            whileTap={{ scale: 0.95 }}
            className="bg-[#0D2B1E]/40 backdrop-blur-md border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 shadow-sm cursor-pointer hover:bg-[#0D2B1E]/60 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center mb-1">
              <CreditCard size={20} />
            </div>
            <span className="text-[11px] font-medium text-white/70">{t.cards}</span>
          </motion.div>
        </section>

        {/* AI Advice Card */}
        <div className="flex flex-col gap-3">
          <motion.section
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="bg-[#0D2B1E]/40 backdrop-blur-md border border-[#22E3A6]/10 rounded-[24px] p-5 shadow-sm relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#22E3A6]/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
            
            <div className="flex justify-between items-start mb-2 relative z-10">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-[#22E3A6]/10 text-[#22E3A6] flex items-center justify-center">
                  <PieChartIcon size={18} />
                </div>
                <h3 className="font-bold text-[13px]">{advice.title}</h3>
              </div>
              {advice.trend === 'down' && (
                <span className="text-[10px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full font-medium">تنبيه</span>
              )}
              {advice.trend === 'up' && (
                <span className="text-[10px] bg-[#22E3A6]/10 text-[#22E3A6] px-2 py-0.5 rounded-full font-medium">ممتاز</span>
              )}
            </div>
            <p className="text-[12px] text-white/70 font-poppins leading-relaxed relative z-10 w-11/12 mt-1">
              {advice.body}
            </p>
          </motion.section>
        </div>

        {/* Voice Integration Hero Focus */}
        <motion.section
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden rounded-[32px] p-6 border border-[var(--color-accent-subtle)] shadow-[0_0_40px_rgba(16,185,129,0.05)] bg-[#111]"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-accent-subtle)] to-transparent opacity-20"></div>
          <div className="relative z-10 flex flex-col items-center justify-center text-center py-4">
            <h2 className="text-lg font-light mb-1 text-white">{t.aiHeroTitle}</h2>
            <p className="text-[12px] text-[var(--color-secondary)] mb-6">{t.aiHeroSub}</p>
            
            <div 
              onClick={handleOpenVoice}
              className="relative group cursor-pointer w-20 h-20 flex items-center justify-center"
            >
              {/* Pulsing rings */}
              <div className="absolute inset-0 bg-[var(--color-accent)] rounded-full opacity-20 group-hover:animate-ping"></div>
              <div className="absolute inset-2 bg-[var(--color-accent)] rounded-full opacity-40"></div>
              
              <div className="relative z-10 w-16 h-16 bg-gradient-to-tr from-[var(--color-accent)] to-emerald-200 rounded-full flex items-center justify-center text-black shadow-lg shadow-[var(--color-accent-subtle)] transition-transform group-hover:scale-110">
                <Mic size={28} strokeWidth={2.5} />
              </div>
            </div>
          </div>
        </motion.section>

        {/* Recent Activity */}
        <section className="flex-1 pb-10">
          <div className="bg-[var(--color-surface)] p-4 rounded-3xl border border-[var(--color-border)] mt-2">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[var(--color-border-subtle)]">
              <span className="text-[11px] uppercase tracking-widest opacity-50">{t.recentActivity}</span>
              <span className="text-[10px] text-[var(--color-accent)] font-medium bg-[var(--color-accent-subtle)] px-2 py-0.5 rounded">{activeWalletId === 'all' ? t.all : wallets.find(w=>w.id===activeWalletId)?.name}</span>
            </div>

            <div className="space-y-4">
              {recentTransactions.map((tx, index) => (
                <motion.div 
                  key={tx.id}
                  className="flex items-center justify-between"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 + (index * 0.1) }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center text-lg shadow-inner border border-[var(--color-border-subtle)]">
                      {tx.icon || "💸"}
                    </div>
                    <div>
                      <div className="font-medium text-[13px] text-white/90">{tx.category}</div>
                      <div className="text-[11px] text-[var(--color-secondary)] mt-0.5">{tx.description}</div>
                    </div>
                  </div>
                  <div className="text-left font-mono">
                    <div className={`px-3 py-1 rounded-xl text-[12px] font-medium border ${tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`} dir="ltr">
                      {tx.type === 'income' ? '+' : '-'}{tx.amount.toFixed(2)}
                    </div>
                  </div>
                </motion.div>
              ))}
              {recentTransactions.length === 0 && (
                <p className="text-center text-[var(--color-secondary)] text-sm py-4">{t.noTransactions}</p>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Notifications Modal */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/60 flex items-end justify-center sm:items-center sm:bg-black/40 backdrop-blur-sm"
            onClick={() => setShowNotifications(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-[var(--color-surface)] w-full h-[85vh] sm:h-[600px] sm:w-[400px] sm:rounded-3xl rounded-t-[32px] flex flex-col overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center p-6 border-b border-[var(--color-border)]">
                <h2 className="text-xl font-bold">{t.messages}</h2>
                <button 
                  onClick={() => setShowNotifications(false)}
                  className="w-8 h-8 rounded-full bg-[var(--color-background)] flex items-center justify-center text-[var(--color-secondary)]"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {transactions.length === 0 ? (
                  <p className="text-center text-[var(--color-secondary)] text-sm py-4">{t.noTransactions}</p>
                ) : (
                  transactions.slice(0, 50).map((t) => (
                    <div key={t.id} className="p-3 bg-[var(--color-background)] rounded-2xl flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[var(--color-surface)] flex items-center justify-center border border-[var(--color-border)]">
                        {t.icon || '📝'}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-sm tracking-tight">{t.category}</h4>
                        <p className="text-[11px] text-[var(--color-secondary)]">{t.description}</p>
                      </div>
                      <div className="text-left flex flex-col items-end">
                        <span className={`font-mono font-bold ${t.type === 'expense' ? 'text-red-500' : 'text-emerald-500'}`}>
                          {t.type === 'expense' ? '-' : '+'}{t.amount.toLocaleString()} <span className="text-[10px]">{(t.walletId === 'web3' || t.walletId === 'metamask') ? 'HBAR' : 'JOD'}</span>
                        </span>
                        <span className="text-[9px] text-[var(--color-secondary)]">{new Date(t.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
