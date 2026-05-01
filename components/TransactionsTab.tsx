"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageSquare, Calendar, Filter, Send, Loader2, List, CreditCard, PieChart as PieChartIcon, X } from "lucide-react";
import { useFinance, Transaction } from "../context/FinanceContext";
import { GoogleGenAI, Type } from "@google/genai";
import { translations } from "../lib/translations";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export default function TransactionsTab() {
  const { transactions, addTransaction, activeWalletId, setActiveWalletId, wallets, trackAiUsage, language } = useFinance();
  const t = translations[language];
  const [isSmsOpen, setIsSmsOpen] = useState(false);
  const [smsText, setSmsText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [displayLimit, setDisplayLimit] = useState(5);

  const [timeFilter, setTimeFilter] = useState<"all" | "weekly" | "monthly" | "3months" | "more">("all");
  const [isMoreModalOpen, setIsMoreModalOpen] = useState(false);
  const [moreModalTab, setMoreModalTab] = useState<'filter'|'compare'>('filter');

  const [advancedFilter, setAdvancedFilter] = useState<{
    type: 'filter' | 'compare';
    id: string;
    startDate?: string;
    endDate?: string;
  } | null>(null);

  // State for the modal while editing
  const [tempAdvancedFilter, setTempAdvancedFilter] = useState<{
    type: 'filter' | 'compare';
    id: string;
    startDate?: string;
    endDate?: string;
  }>({ type: 'filter', id: 'last_6_months' });

  const [isFilterPopupOpen, setIsFilterPopupOpen] = useState(false);

  const filteredByWallet = React.useMemo(() => 
    activeWalletId === 'all' 
      ? transactions 
      : transactions.filter(t => t.walletId === activeWalletId || (!t.walletId && activeWalletId === 'reflect')),
    [transactions, activeWalletId]
  );

  const filteredByTime = React.useMemo(() => filteredByWallet.filter(t => {
    if (timeFilter === "all") return true;
    const now = new Date();
    const d = new Date(t.date);
    const diffTime = Math.abs(now.getTime() - d.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (timeFilter === "weekly") return diffDays <= 7;
    if (timeFilter === "monthly") return diffDays <= 30;
    if (timeFilter === "3months") return diffDays <= 90;
    if (timeFilter === "more" && advancedFilter) {
      if (advancedFilter.type === 'filter') {
        if (advancedFilter.id === 'last_6_months') return diffDays <= 180;
        if (advancedFilter.id === 'last_12_months') return diffDays <= 365;
        if (advancedFilter.id === 'last_16_months') return diffDays <= 486;
        if (advancedFilter.id === 'custom' && advancedFilter.startDate && advancedFilter.endDate) {
          const s = new Date(advancedFilter.startDate);
          const e = new Date(advancedFilter.endDate);
          e.setHours(23, 59, 59, 999);
          return d >= s && d <= e;
        }
      } else {
        if (advancedFilter.id.includes('24h')) return diffDays <= 1;
        if (advancedFilter.id.includes('7d')) return diffDays <= 7;
        if (advancedFilter.id.includes('28d')) return diffDays <= 28;
        if (advancedFilter.id.includes('3m')) return diffDays <= 90;
        if (advancedFilter.id.includes('6m')) return diffDays <= 180;
        if (advancedFilter.id === 'cmp_custom' && advancedFilter.startDate && advancedFilter.endDate) {
          const s = new Date(advancedFilter.startDate);
          const e = new Date(advancedFilter.endDate);
          e.setHours(23, 59, 59, 999);
          return d >= s && d <= e;
        }
      }
    }
    return true;
  }), [filteredByWallet, timeFilter, advancedFilter]);

  const filteredTransactions = React.useMemo(() => filteredByTime.filter(tx => {
    if (filterType === "all") return true;
    return tx.type === filterType;
  }), [filteredByTime, filterType]);

  const visibleTransactions = React.useMemo(() => filteredTransactions.slice(0, displayLimit), [filteredTransactions, displayLimit]);

  // Calculate chart data (Expenses only)
  const chartData = React.useMemo(() => {
    const data: Record<string, number> = {};
    filteredTransactions.forEach(tx => {
       if (tx.type === 'expense') {
          if (!data[tx.category]) data[tx.category] = 0;
           data[tx.category] += tx.amount;
       }
    });
    return Object.entries(data).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  // Dynamic AI advice based on overall context
  const categorizedAdvice = React.useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'expense');
    const income = transactions.filter(t => t.type === 'income');
    
    if (expenses.length === 0 && income.length === 0) return t.noTransactions;

    const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);
    const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);

    if (totalIncome > totalExpense) {
      return language === 'ar' 
        ? "وضعك المالي جيد، دخلك يغطي نفقاتك بشكل مريح. فكر في زيادة مدخراتك في الجرة." 
        : "Your finances are healthy; your income covers expenses comfortably. Consider increasing your Jar savings.";
    } else if (totalExpense > totalIncome && totalIncome > 0) {
      return language === 'ar'
        ? "مصاريفك تتجاوز دخلك هذا الشهر. حاول مراجعة الفئات الأكثر استهلاكاً لتقليل الهدر."
        : "Your expenses exceed your income this period. Review high-spending categories to reduce waste.";
    }
    
    return language === 'ar' ? "توازنك المالي مستقر. استمر في مراقبة نفقاتك بذكاء." : "Your financial balance is stable. Keep monitoring your expenses smartly.";
  }, [transactions, t, language]);

  const COLORS = ['#22E3A6', '#14F195', '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  // Group transactions by date
  const groupedTxs = React.useMemo(() => visibleTransactions.reduce((acc, tx) => {
    const dateStr = new Date(tx.date).toLocaleDateString("ar-SA", { weekday: 'long', day: 'numeric', month: 'long' });
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(tx);
    return acc;
  }, {} as Record<string, Transaction[]>), [visibleTransactions]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const bottom = e.currentTarget.scrollHeight - e.currentTarget.scrollTop <= e.currentTarget.clientHeight + 20;
    if (bottom && displayLimit < filteredTransactions.length) {
      setDisplayLimit(prev => prev + 5);
    }
  };

  const handleSmsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsText.trim()) return;

    const canUseAi = await trackAiUsage();
    if (!canUseAi) {
      alert(t.upgradeMsg);
      return;
    }

    const defaultWallet = activeWalletId === 'all' ? (wallets[0]?.id || 'reflect') : activeWalletId;
    const defaultBankName = wallets.find(w => w.id === defaultWallet)?.bankName || 'Reflect';

    setIsProcessing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || "" });
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `قم بتحليل رسالة الـ SMS البنكية التالية واستخرج المعطيات:\n"${smsText}"`,
        config: {
          responseMimeType: "application/json",
          systemInstruction: `أنت تقوم بتحليل رسائل SMS المتعلقة بالبنوك والبطاقات. استخرج المبلغ، التاجر/الوصف، وتصنيف العملية (مثل طعام، تسوق، الخ) ونوع العملية (expense، income)، والتاريخ إذا كان موجودا.
الحسابات المتاحة:
${wallets.map(w => `- ID: ${w.id}, Name: ${w.name}, Bank: ${w.bankName}, Card Ends: ${w.number}`).join('\n')}
طابق الحساب بناءً على اسم البنك أو آخر أرقام البطاقة إذا ظهرت في الرسالة. إذا لم يمكن المطابقة، استخدم الحساب الافتراضي "${defaultWallet}".`,
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              amount: { type: Type.NUMBER, description: "المبلغ المالي المذكور. رقم فقط بدون عملة." },
              category: { type: Type.STRING, description: "تصنيف المشتريات (مثلا: طعام، تسوق، مواصلات)" },
              description: { type: Type.STRING, description: "اسم التاجر أو وصف موجز للعملية" },
              type: { type: Type.STRING, description: "expense أو income" },
              icon: { type: Type.STRING, description: "إيموجي واحد يعبر عن العملية" },
              date: { type: Type.STRING, description: "التاريخ والوقت بتنسيق ISO 8601 إذا توفر في الرسالة. حقل اختياري." },
              walletId: { type: Type.STRING, description: "معرف الحساب (ID) الذي تمت عليه العملية" },
              bankName: { type: Type.STRING, description: "اسم البنك المستخرج من الرسالة" }
            },
            required: ["amount", "category", "description", "type", "icon", "walletId", "bankName"],
          }
        }
      });

      if (response.text) {
        const json = JSON.parse(response.text.trim());
        addTransaction({
          amount: json.amount,
          category: json.category,
          description: json.description,
          type: json.type as any,
          icon: json.icon,
          date: json.date || new Date().toISOString(),
          walletId: json.walletId || defaultWallet,
          bankName: json.bankName || defaultBankName,
          source: 'sms',
          originalMsg: smsText
        });
        setSmsText("");
        setIsSmsOpen(false);
      }
    } catch (e) {
      console.error(e);
      // Fallback
      addTransaction({
        amount: 0,
        category: "SMS غير معروف",
        description: "عملية من رسالة نصية",
        type: "expense",
        icon: "💬"
      });
      setSmsText("");
      setIsSmsOpen(false);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="pt-2 px-6 pb-6 h-full flex flex-col gap-6">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-light">{t.transactions}</h1>
        <button 
          onClick={() => setIsSmsOpen(!isSmsOpen)}
          className="w-10 h-10 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] flex items-center justify-center transition-colors relative"
        >
          <MessageSquare size={16} className="text-[var(--color-secondary)] hover:text-white transition-colors" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[var(--color-accent)] rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.6)]"></span>
        </button>
      </header>

      {/* Mini Cards Filter */}
      <div className="flex overflow-x-auto hide-scrollbar gap-3 pb-2 py-[2px] -mx-6 px-6 snap-x snap-mandatory">
        <button 
          onClick={() => setActiveWalletId('all')}
          className={`shrink-0 snap-center w-[140px] h-[80px] rounded-xl p-3 flex flex-col justify-between border transition-all ${activeWalletId === 'all' ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)] text-white shadow-[0_4px_15px_rgba(16,185,129,0.15)]' : 'bg-[var(--color-surface)] border-[var(--color-border)] text-white/50'}`}
        >
          <div className="flex justify-between w-full items-center">
             <List size={16} />
             <span className="text-[10px] font-medium uppercase">{t.all}</span>
          </div>
          <div className="text-left font-mono font-medium mt-auto">
            {t.balance}
          </div>
        </button>
        {wallets.map(w => (
           <button 
            key={w.id}
            onClick={() => setActiveWalletId(w.id)}
            className={`relative shrink-0 snap-center w-[140px] h-[80px] rounded-xl p-3 flex flex-col justify-between border transition-all overflow-hidden ${activeWalletId === w.id ? 'border-[var(--color-accent)] shadow-[0_4px_15px_rgba(16,185,129,0.3)] scale-[1.02]' : 'border-white/10 opacity-70 scale-100 hover:opacity-100'}`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${w.color} opacity-40`}></div>
            <div className="relative z-10 flex justify-between w-full items-center">
               <CreditCard size={16} className="text-white/90 drop-shadow-sm" />
               <span className="text-[9px] font-bold uppercase text-white/80 drop-shadow-sm tracking-wider">{w.bankName}</span>
            </div>
            <div className="relative z-10 text-left w-full">
              <div className="text-[11px] font-bold truncate text-white drop-shadow-sm">{w.name}</div>
              <div className="text-[9px] font-mono mt-0.5 text-white/80 drop-shadow-sm">{w.number}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Dynamic Charts Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#0D2B1E]/40 backdrop-blur-xl border border-[#22E3A6]/10 rounded-[24px] p-5 shadow-lg flex flex-col relative overflow-visible"
      >
        <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none transform -scale-x-100">
          <PieChartIcon size={120} strokeWidth={1} className="text-white" />
        </div>

        {/* Filter Trigger Button */}
        <div className="absolute top-4 left-5 z-20">
          <button 
            onClick={() => setIsFilterPopupOpen(!isFilterPopupOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-[11px] font-medium"
          >
            <Filter size={14} className="text-[var(--color-accent)]" />
            <span>{t.filters}</span>
          </button>
          
          <AnimatePresence>
            {isFilterPopupOpen && (
              <>
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-10"
                  onClick={() => setIsFilterPopupOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -10 }}
                  className="absolute top-full mt-2 left-0 w-[260px] h-[400px] bg-[#071a14] border border-[#22e3a6]/30 rounded-2xl p-5 shadow-2xl z-50 backdrop-blur-3xl flex flex-col gap-5 overflow-hidden"
                  dir="rtl"
                >
                  <div className="flex flex-col gap-3 shrink-0">
                    <label className="text-[10px] uppercase tracking-widest text-[#22e3a6]/60 mb-2 block font-bold">{t.timePeriod}</label>
                    <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'all', label: t.all },
                          { id: 'weekly', label: t.week },
                          { id: 'monthly', label: t.month },
                          { id: '3months', label: t.threeMonths },
                        ].map(opt => (
                          <button
                            key={opt.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setTimeFilter(opt.id as any);
                            }}
                            className={`px-2 py-2 rounded-lg text-[11px] text-center border transition-all ${timeFilter === opt.id ? 'bg-[#22e3a6]/20 border-[#22e3a6] text-white' : 'bg-white/5 border-white/5 text-white/50 hover:bg-white/10'}`}
                          >
                            {opt.label}
                          </button>
                        ))}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsMoreModalOpen(true);
                          }}
                          className={`col-span-2 px-2 py-2 rounded-lg text-[11px] text-center border transition-all ${timeFilter === 'more' ? 'bg-[#22e3a6]/20 border-[#22e3a6] text-white' : 'bg-white/5 border-white/5 text-white/50 hover:bg-white/10'}`}
                        >
                          {t.more}
                        </button>
                      </div>
                    </div>

                  <div className="shrink-0 border-t border-[#22e3a6]/10 pt-4">
                    <label className="text-[10px] uppercase tracking-widest text-[#22e3a6]/60 mb-3 block font-bold">{t.transactionType}</label>
                    <div className="flex flex-col gap-2">
                      {[
                        { id: 'all', label: t.all },
                        { id: 'income', label: t.income },
                        { id: 'expense', label: t.expense },
                      ].map(opt => (
                        <button
                          key={opt.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setFilterType(opt.id as any);
                          }}
                          className={`w-full px-4 py-2.5 rounded-lg text-[12px] text-right border transition-all flex items-center justify-between ${filterType === opt.id ? 'bg-[#22e3a6]/20 border-[#22e3a6] text-white font-bold' : 'bg-white/5 border-white/5 text-white/50 hover:bg-white/10'}`}
                        >
                          <span>{opt.label}</span>
                          {filterType === opt.id && <div className="w-2 h-2 rounded-full bg-[#22e3a6] shadow-[0_0_8px_rgba(34,227,166,0.6)]" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        <h3 className="text-[12px] text-[var(--color-secondary)] mb-4 tracking-wide uppercase font-medium text-right relative z-10">
          {t.aiAdvice} ({activeWalletId === 'all' ? t.all : wallets.find(w=>w.id===activeWalletId)?.name})
        </h3>
        
        {chartData.length > 0 ? (
          <div className="flex flex-col gap-4 relative z-10">
            <div className="w-full h-[180px] min-h-[180px] relative">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                    cornerRadius={5}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(10, 10, 10, 0.8)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
                    itemStyle={{ color: '#fff', fontWeight: 500 }}
                    formatter={(value: any) => [`${Number(value).toFixed(2)} JOD`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="flex flex-col gap-2.5 mt-2 bg-black/20 rounded-xl p-3 border border-white/5">
              <div className="text-[11px] text-white/70 italic mb-2 px-1 text-right leading-relaxed">
                {categorizedAdvice}
              </div>
              <div className="border-t border-white/5 my-1" />
              {chartData.map((item, i) => (
                <div key={i} className="flex justify-between items-center text-[12px]">
                  <div className="font-mono text-white/90">
                    {item.value.toFixed(2)} JOD
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white/70 font-medium">{item.name}</span>
                    <span className="w-3 h-3 rounded-full flex-shrink-0 shadow-[0_0_5px_rgba(0,0,0,0.5)]" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-[var(--color-secondary)] text-[12px] relative z-10">
            <PieChartIcon size={32} className="mb-2 opacity-20" />
            {t.noTransactions}
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {isSmsOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSmsSubmit} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-4 mb-2">
              <p className="text-[11px] text-[var(--color-secondary)] mb-3 flex items-center gap-2 uppercase tracking-widest border-b border-[var(--color-border-subtle)] pb-2 justify-end">
                <span>SMS Parse</span> <MessageSquare size={14} className="text-[var(--color-accent)]" /> 
              </p>
              <div className="relative">
                <textarea
                  value={smsText}
                  onChange={(e) => setSmsText(e.target.value)}
                  placeholder="CARD PURCHASE 15 JD FOOD RESTAURANT..."
                  className="w-full bg-[var(--color-app)] border border-[var(--color-border)] rounded-xl p-3 text-[13px] min-h-[80px] focus:outline-none focus:border-[var(--color-accent)] transition-colors pr-10 resize-none font-mono text-left"
                  dir="ltr"
                />
                <button 
                  type="submit" 
                  disabled={isProcessing || !smsText.trim()}
                  className="absolute bottom-3 right-3 text-[var(--color-accent)] disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </div>
              <div className="flex gap-2 mt-2 overflow-x-auto hide-scrollbar snap-x pb-1" dir="ltr">
                {[
                  "a purchase transationc has been depited from your reflect card from steamgames.com 342342342 amount 3.656 jod on 08-03-2026",
                  "JOD 100,000 has ben creditred to your reflect account on 24/04 14:49",
                  "JOD 100,000 has been depited to your reflect account on 24/04 14:49",
                  "a purchase transaction has been depited from your reflect card from apple.com bill amount 1.455 JOD on 24-04-2026"
                ].map((txt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSmsText(txt)}
                    className="shrink-0 max-w-[200px] text-left text-[10px] bg-[#222] border border-white/5 text-[var(--color-secondary)] p-2 rounded-lg truncate hover:text-white transition-colors"
                  >
                    {txt}
                  </button>
                ))}
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-auto space-y-6 pb-20 mt-2 hide-scrollbar" onScroll={handleScroll}>
        {Object.entries(groupedTxs).length === 0 && (
          <div className="text-center py-20 text-[var(--color-secondary)] text-sm">
            لا يوجد عمليات مطابقة
          </div>
        )}
        {Object.entries(groupedTxs).map(([date, txs]) => (
          <div key={date} className="bg-white/5 border border-white/10 p-4 rounded-3xl">
            <h3 className="text-[11px] font-semibold text-[var(--color-secondary)] uppercase tracking-widest mb-4 pb-2 border-b border-white/5 text-right">
              {date}
            </h3>
            <div className="space-y-4">
              {txs.map((tx, idx) => {
                const wallet = wallets.find(w => w.id === (tx.walletId || 'reflect'));
                return (
                  <div key={tx.id} className="flex flex-col gap-2 border-b border-white/5 pb-3 mb-3 last:border-0 last:pb-0 last:mb-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center text-lg shadow-inner border border-[var(--color-border-subtle)]">
                          {tx.icon}
                        </div>
                        <div>
                          <p className="font-medium text-[13px] text-white/90">{tx.description}</p>
                          <p className="text-[11px] text-[var(--color-secondary)] mt-0.5">{tx.category}</p>
                        </div>
                      </div>
                      <div className={`px-3 py-1.5 rounded-xl font-mono text-[13px] font-medium border ${tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`} dir="ltr">
                        {tx.type === 'income' ? '+' : '-'}{tx.amount.toFixed(2)}
                      </div>
                    </div>
                    {/* Source Indicator */}
                    {activeWalletId === 'all' && wallet && (
                      <div className="flex items-center gap-1.5 justify-end mt-1 text-[10px] text-white/40 tracking-wider uppercase font-mono">
                        <CreditCard size={10} />
                        <span>{wallet.name}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {Object.keys(groupedTxs).length === 0 && (
          <div className="text-center py-12 opacity-50 flex flex-col items-center justify-center">
            <List size={48} className="mb-4 text-white/20" />
            <p>لا يوجد عمليات</p>
          </div>
        )}
      </div>

      {/* Advanced Date Range Modal */}
      <AnimatePresence>
        {isMoreModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
              onClick={() => setIsMoreModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[400px] max-h-[85vh] bg-[#0d2b1e] border border-[#22e3a6]/20 rounded-3xl z-50 text-white shadow-2xl flex flex-col overflow-hidden"
              dir="ltr"
            >
              <div className="p-6 pb-2">
                <h2 className="text-2xl font-light text-white mb-4">Date range</h2>
                
                <div className="flex gap-6 border-b border-white/10">
                  <button 
                    className={`pb-3 font-medium text-sm transition-colors border-b-2 ${moreModalTab === 'filter' ? 'border-[#22e3a6] text-[#22e3a6]' : 'border-transparent text-white/40 hover:text-white'}`}
                    onClick={() => {
                      setMoreModalTab('filter');
                      setTempAdvancedFilter({ type: 'filter', id: 'last_6_months' });
                    }}
                  >
                    Filter
                  </button>
                  <button 
                    className={`pb-3 font-medium text-sm transition-colors border-b-2 ${moreModalTab === 'compare' ? 'border-[#22e3a6] text-[#22e3a6]' : 'border-transparent text-white/40 hover:text-white'}`}
                    onClick={() => {
                      setMoreModalTab('compare');
                      setTempAdvancedFilter({ type: 'compare', id: 'cmp_3m_prev' });
                    }}
                  >
                    Compare
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-2 hide-scrollbar">
                {moreModalTab === 'filter' ? (
                  <div className="flex flex-col gap-5 mt-4">
                    {[
                      { id: 'last_6_months', label: 'Last 6 months' },
                      { id: 'last_12_months', label: 'Last 12 months' },
                      { id: 'last_16_months', label: 'Last 16 months' },
                      { id: 'custom', label: 'Custom' },
                    ].map(opt => (
                      <label key={opt.id} className="flex items-center gap-4 cursor-pointer group">
                        <div className="relative flex items-center justify-center">
                          <input 
                            type="radio" 
                            name="filter_range" 
                            className="peer sr-only" 
                            checked={tempAdvancedFilter.id === opt.id}
                            onChange={() => setTempAdvancedFilter({ ...tempAdvancedFilter, id: opt.id })}
                          />
                          <div className="w-5 h-5 rounded-full border-2 border-white/20 peer-checked:border-[#22e3a6] transition-colors"></div>
                          <div className="absolute w-2.5 h-2.5 bg-[#22e3a6] rounded-full scale-0 peer-checked:scale-100 transition-transform shadow-[0_0_8px_rgba(34,227,166,0.5)]"></div>
                        </div>
                        <span className={`text-[15px] font-normal ${tempAdvancedFilter.id === opt.id ? 'text-white' : 'text-white/50 group-hover:text-white/80'}`}>
                          {opt.label}
                        </span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 mt-4">
                    {[
                      { id: 'cmp_24h_prev', label: 'Compare last 24 hours to previous period' },
                      { id: 'cmp_24h_wow', label: 'Compare last 24 hours week over week' },
                      { id: 'cmp_7d_prev', label: 'Compare last 7 days to previous period' },
                      { id: 'cmp_7d_yoy', label: 'Compare last 7 days year over year' },
                      { id: 'cmp_28d_prev', label: 'Compare last 28 days to previous period' },
                      { id: 'cmp_28d_yoy', label: 'Compare last 28 days year over year' },
                      { id: 'cmp_3m_prev', label: 'Compare last 3 months to previous period' },
                      { id: 'cmp_3m_yoy', label: 'Compare last 3 months year over year' },
                      { id: 'cmp_6m_prev', label: 'Compare last 6 months to previous period' },
                      { id: 'cmp_custom', label: 'Custom' },
                    ].map(opt => (
                      <label key={opt.id} className="flex items-center gap-4 cursor-pointer group">
                        <div className="relative flex items-center justify-center">
                          <input 
                            type="radio" 
                            name="compare_range" 
                            className="peer sr-only" 
                            checked={tempAdvancedFilter.id === opt.id}
                            onChange={() => setTempAdvancedFilter({ ...tempAdvancedFilter, id: opt.id })}
                          />
                          <div className="w-5 h-5 rounded-full border-2 border-white/20 peer-checked:border-[#22e3a6] transition-colors"></div>
                          <div className="absolute w-2.5 h-2.5 bg-[#22e3a6] rounded-full scale-0 peer-checked:scale-100 transition-transform shadow-[0_0_8px_rgba(34,227,166,0.5)]"></div>
                        </div>
                        <span className={`text-[15px] font-normal ${tempAdvancedFilter.id === opt.id ? 'text-white' : 'text-white/50 group-hover:text-white/80'}`}>
                          {opt.label}
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                {/* Custom Date Picker Fields */}
                {(tempAdvancedFilter.id === 'custom' || tempAdvancedFilter.id === 'cmp_custom') && (
                  <div className="mt-8 ml-9 flex items-center gap-3">
                    <div className="relative flex-1">
                      <label className="absolute -top-2 left-2 bg-[#0d2b1e] px-1 text-[10px] text-white/40 uppercase tracking-widest">Start date</label>
                      <div className="border border-white/10 rounded-lg px-3 py-3 flex items-center bg-black/20 focus-within:border-[#22e3a6]/40 transition-colors">
                        <input 
                          type="date" 
                          className="w-full text-white text-[15px] bg-transparent outline-none focus:outline-none" 
                          value={tempAdvancedFilter.startDate || ''}
                          onChange={(e) => setTempAdvancedFilter({...tempAdvancedFilter, startDate: e.target.value})}
                          style={{ colorScheme: 'dark' }}
                        />
                      </div>
                    </div>
                    <div className="text-white/20 mb-1">-</div>
                    <div className="relative flex-1">
                      <label className="absolute -top-2 left-2 bg-[#0d2b1e] px-1 text-[10px] text-white/40 uppercase tracking-widest">End date</label>
                      <div className="border border-white/10 rounded-lg px-3 py-3 flex items-center bg-black/20 focus-within:border-[#22e3a6]/40 transition-colors">
                        <input 
                          type="date" 
                          className="w-full text-white text-[15px] bg-transparent outline-none focus:outline-none" 
                          value={tempAdvancedFilter.endDate || ''}
                          onChange={(e) => setTempAdvancedFilter({...tempAdvancedFilter, endDate: e.target.value})}
                          style={{ colorScheme: 'dark' }}
                        />
                      </div>
                    </div>
                  </div>
                )}
                {tempAdvancedFilter.id === 'cmp_custom' && (
                  <div className="ml-9 mt-4 text-sm text-white/40">vs.</div>
                )}
              </div>

              <div className="p-4 px-6 flex justify-end gap-3 mt-auto border-t border-white/10 bg-[#0d2b1e]">
                <button 
                  className="px-4 py-2 rounded-xl text-sm font-medium text-white/60 hover:text-white transition-colors"
                  onClick={() => setIsMoreModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  className={`px-6 py-2 rounded-xl text-sm font-bold transition-colors ${
                    ((tempAdvancedFilter.id === 'custom' || tempAdvancedFilter.id === 'cmp_custom') && (!tempAdvancedFilter.startDate || !tempAdvancedFilter.endDate))
                      ? 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
                      : 'bg-[#22e3a6] text-black hover:scale-105 active:scale-95 shadow-lg shadow-[#22e3a6]/20'
                  }`}
                  onClick={() => {
                    if ((tempAdvancedFilter.id === 'custom' || tempAdvancedFilter.id === 'cmp_custom') && (!tempAdvancedFilter.startDate || !tempAdvancedFilter.endDate)) {
                      return;
                    }
                    setAdvancedFilter(tempAdvancedFilter);
                    setTimeFilter('more');
                    setIsMoreModalOpen(false);
                  }}
                >
                  Apply
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
