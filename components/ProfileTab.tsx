"use client";

import React, { useState } from "react";
import { motion } from "motion/react";
import { Send, Wallet, QrCode, ArrowRightLeft, Link, LogOut } from "lucide-react";
import { useFinance } from "../context/FinanceContext";
import { ethers } from "ethers";
import { auth } from "../lib/firebase";
import { signOut } from "firebase/auth";
import { AVAILABLE_BANKS } from "./AuthAndSelection";
import { translations, SUBSCRIPTION_MODELS, SubTier } from "../lib/translations";

export default function ProfileTab() {
  const { 
    balance, 
    addTransaction, 
    ethAddress, 
    ethBalance, 
    connectWallet, 
    isConnecting, 
    updateEthBalance, 
    toggleWallet, 
    wallets,
    language,
    subscriptionTier,
    setSubscription,
    aiUsageCount
  } = useFinance();
  const t = translations[language];
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isManagingCards, setIsManagingCards] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Logout failed:", e);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient || !amount) return;

    if (ethAddress) {
      // Execute Real Web3 Transaction if MetaMask is connected
      try {
        setIsSending(true);
        if (typeof window !== "undefined" && (window as any).ethereum) {
          const provider = new ethers.BrowserProvider((window as any).ethereum);
          const signer = await provider.getSigner();
          const tx = await signer.sendTransaction({
            to: recipient,
            value: ethers.parseEther(amount)
          });
          
          await tx.wait(); // Wait for confirmation
          completeTransfer(tx.hash);
          updateEthBalance(); // Refresh balance after transfer
        }
      } catch (e) {
        console.error("Transaction failed:", e);
        alert("فشلت عملية التحويل. تأكد من الرصيد والشبكة.");
      } finally {
        setIsSending(false);
      }
    } else {
      // Fallback local simulated transaction
      const val = parseFloat(amount);
      if (isNaN(val) || val <= 0 || val > balance) return;
      completeTransfer("SIMULATED_TX");
    }
  };

  const completeTransfer = (hash: string) => {
    addTransaction({
      amount: parseFloat(amount),
      category: language === 'ar' ? "حوالة صادرة" : "Outgoing Transfer",
      description: `${language === 'ar' ? 'إلى' : 'To'}: ${recipient.substring(0, 6)}...${recipient.substring(recipient.length - 4)}`,
      type: "transfer",
      icon: "💸",
      walletId: ethAddress ? "web3" : undefined
    });

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      setRecipient("");
      setAmount("");
    }, 5000);
  };

  const getAiCostEstimate = () => {
    // Simulated logical costs
    const baseCostPerReq = 0.0005; // $
    return (aiUsageCount * baseCostPerReq).toFixed(4);
  };

  const getProductivitySavings = () => {
    // Logic: Every AI interaction saves ~5 mins of manual entry.
    // Hourly rate avg for freelancers $30 -> $0.5/min
    return (aiUsageCount * 5 * 0.5).toFixed(2);
  };

  return (
    <div className="pt-2 px-6 pb-6 h-full flex flex-col gap-8 overflow-y-auto hide-scrollbar">
      <header className="flex justify-between items-center relative">
        <div className="flex-1 text-center">
          <h1 className="text-2xl font-light mb-1">{t.smartWallet}</h1>
          <p className="text-[11px] uppercase tracking-widest text-[var(--color-secondary)]">{t.syncBlockchain}</p>
        </div>
        <button 
          onClick={handleLogout}
          className={`${language === 'ar' ? 'absolute left-0' : 'absolute right-0'} p-2 text-red-500 hover:bg-red-500/10 rounded-full transition-colors`}
          title={t.logout}
        >
          <LogOut size={20} />
        </button>
      </header>

      <div className="bg-gradient-to-br from-[var(--color-surface-hover)] to-[#111] border border-[var(--color-border)] rounded-[32px] p-6 relative overflow-hidden shadow-2xl">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-[var(--color-accent)] opacity-10 rounded-full blur-2xl flex items-center justify-center"></div>
        <div className="flex justify-between items-start mb-8 relative z-10">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-secondary)] mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              {ethAddress ? "HEDERA NETWORK" : "LOCAL DEMO NETWORK"}
            </p>
            {ethAddress ? (
              <p className="text-[13px] text-white/80 font-mono tracking-widest bg-black/40 px-3 py-1.5 rounded-full border border-[var(--color-border)]">
                {ethAddress.substring(0, 6)}...{ethAddress.substring(ethAddress.length - 4)}
              </p>
            ) : (
              <button 
                onClick={connectWallet}
                disabled={isConnecting}
                className="text-[12px] text-black bg-[var(--color-accent)] font-medium px-4 py-1.5 rounded-full flex items-center gap-1.5 hover:scale-105 transition-transform"
              >
                <Link size={12} /> {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
              </button>
            )}
          </div>
          <QrCode size={24} className="text-[var(--color-accent)] opacity-60" />
        </div>
        <div className="relative z-10">
          <p className="text-[11px] uppercase tracking-widest text-[var(--color-secondary)] mb-1">{t.balance}</p>
          <div className="flex items-baseline gap-1">
            <p className="text-[42px] font-mono leading-none tracking-tight font-light" dir="ltr">
              {ethAddress ? parseFloat(ethBalance).toFixed(4) : balance.toFixed(2)}
            </p>
            <span className="text-[18px] text-[var(--color-secondary)] leading-none ml-1">
              {ethAddress ? "HBAR" : "JOD"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[32px] p-6">
        <div className="flex items-center gap-2 mb-6">
          <ArrowRightLeft size={18} className="text-[var(--color-accent)]" />
          <h2 className="font-bold">{language === 'ar' ? 'تحويل فوري' : 'Quick Transfer'} {ethAddress ? "(Web3)" : ""}</h2>
        </div>

        {isSuccess ? (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center justify-center h-48 text-center"
          >
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-4 border border-emerald-500/30">
              <Send size={24} />
            </div>
            <h3 className="font-bold text-lg mb-1">{t.success}</h3>
            <p className="text-sm text-[var(--color-secondary)] font-mono" dir="ltr">{amount} {ethAddress ? "HBAR" : "JOD"}</p>
          </motion.div>
        ) : (
          <form onSubmit={handleTransfer} className="space-y-4">
            <div>
              <label className="block text-[11px] text-[var(--color-secondary)] mb-2 uppercase tracking-widest text-left">{t.recipient}</label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="0x..."
                className="w-full bg-[var(--color-app)] border border-[var(--color-border)] rounded-xl p-4 text-[13px] focus:outline-none focus:border-[var(--color-accent)] transition-colors font-mono"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-[11px] text-[var(--color-secondary)] mb-2 uppercase tracking-widest text-left">{t.amount} ({ethAddress ? "HBAR" : "JOD"})</label>
              <input
                type="number"
                step="0.0001"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-[var(--color-app)] border border-[var(--color-border)] rounded-xl p-4 text-[13px] focus:outline-none focus:border-[var(--color-accent)] transition-colors font-mono"
                dir="ltr"
              />
            </div>
            <button
              type="submit"
              disabled={!recipient || !amount || isSending}
              className="w-full py-4 mt-2 bg-[var(--color-accent)] text-black rounded-xl font-bold text-sm hover:brightness-110 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(16,185,129,0.2)]"
            >
              {isSending ? <span className="animate-pulse">{t.sending}</span> : <><Send size={16} /> {t.transfer}</>}
            </button>
          </form>
        )}
      </div>

      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[32px] p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Wallet size={18} className="text-[var(--color-accent)]" />
            <h2 className="font-bold">{t.manageCards}</h2>
          </div>
          <button 
            onClick={() => setIsManagingCards(!isManagingCards)}
            className="text-[11px] uppercase tracking-widest text-[var(--color-accent)] font-medium"
          >
            {isManagingCards ? t.close : t.edit}
          </button>
        </div>

        {isManagingCards ? (
          <div className="grid grid-cols-2 gap-3">
            {AVAILABLE_BANKS.map((bank) => {
              const isActive = wallets.some(w => w.id === bank.id);
              return (
                <button
                  key={bank.id}
                  onClick={() => toggleWallet(bank.id)}
                  className={`p-3 rounded-2xl flex flex-col items-center gap-2 border transition-all ${isActive ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)]' : 'bg-[var(--color-app)] border-[var(--color-border)] opacity-60'}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bank.color} border shadow-inner`}>
                    <span className="font-bold text-xs text-white">{bank.shortName}</span>
                  </div>
                  <span className="text-[10px] font-medium text-center">{bank.name}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {wallets.filter(w => w.type === 'fiat').map(w => (
              <div key={w.id} className="flex items-center gap-2 bg-[var(--color-app)] border border-[var(--color-border)] px-3 py-2 rounded-full">
                <div className={`w-4 h-4 rounded-full ${AVAILABLE_BANKS.find(b => b.id === w.id)?.color || 'bg-gray-500'}`}></div>
                <span className="text-[11px] font-medium">{w.name}</span>
              </div>
            ))}
            {wallets.length === 0 && <p className="text-[11px] text-[var(--color-secondary)] italic">{language === 'ar' ? 'لا توجد بطاقات مضافة' : 'No cards added'}</p>}
          </div>
        )}
      </div>

      {/* Subscription & AI Usage Section */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[32px] p-6 mb-10">
         <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span className="text-lg">💎</span>
              <h2 className="font-bold">{t.subscription}</h2>
            </div>
            <button 
              onClick={() => alert(t.upgradeMsg)}
              className="text-[10px] font-bold text-[var(--color-accent)] border border-[var(--color-accent)] px-3 py-1 rounded-full hover:bg-[var(--color-accent)] hover:text-black transition-all"
            >
              {t.upgrade}
            </button>
         </div>
         
         <div className="grid grid-cols-3 gap-2 mb-6">
            {(['free', 'mid', 'pro'] as SubTier[]).map((tier) => (
              <button
                key={tier}
                onClick={() => setSubscription(tier)}
                className={`flex flex-col items-center p-3 rounded-2xl border transition-all ${subscriptionTier === tier ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-black' : 'bg-[var(--color-app)] border-[var(--color-border)] opacity-60'}`}
              >
                <div className="text-[9px] font-bold uppercase tracking-tighter text-center h-4 flex items-center">
                   {SUBSCRIPTION_MODELS[tier].name[language]}
                </div>
                <span className="text-[14px] font-mono mt-1 font-bold">{SUBSCRIPTION_MODELS[tier].cost} JOD</span>
              </button>
            ))}
         </div>

         {/* Plan Features */}
         <div className="mb-6 space-y-2">
            {SUBSCRIPTION_MODELS[subscriptionTier].features[language].map((feature, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px] text-[var(--color-secondary)]">
                <span className="text-[var(--color-accent)]">✓</span>
                <span>{feature}</span>
              </div>
            ))}
         </div>

         <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-[var(--color-app)] p-3 rounded-2xl border border-[var(--color-border)]">
               <p className="text-[9px] text-[var(--color-secondary)] uppercase mb-1">{t.voiceLimitLabel}</p>
               <p className="text-[14px] font-bold">{SUBSCRIPTION_MODELS[subscriptionTier].voiceLimit === 'unlimited' ? t.unlimited : `${SUBSCRIPTION_MODELS[subscriptionTier].voiceLimit} / ${t.perMonth}`}</p>
            </div>
            <div className="bg-[var(--color-app)] p-3 rounded-2xl border border-[var(--color-border)]">
               <p className="text-[9px] text-[var(--color-secondary)] uppercase mb-1">{t.smsLimitLabel}</p>
               <p className="text-[14px] font-bold">{SUBSCRIPTION_MODELS[subscriptionTier].smsLimit} / {t.perMonth}</p>
            </div>
         </div>

         <div className="bg-[var(--color-app)] rounded-3xl p-5 border border-[var(--color-border)] shadow-inner">
            <div className="flex justify-between items-center mb-5">
               <div className="flex flex-col">
                  <span className="text-[12px] font-bold">{t.aiUsage}</span>
                  <span className="text-[10px] text-[var(--color-secondary)]">{t.attemptsLeft}</span>
               </div>
               <span className="text-[14px] font-mono font-bold bg-black/40 px-3 py-1 rounded-xl text-white border border-white/5">
                  {aiUsageCount} / {SUBSCRIPTION_MODELS[subscriptionTier].voiceLimit === 'unlimited' ? '∞' : SUBSCRIPTION_MODELS[subscriptionTier].voiceLimit}
               </span>
            </div>
            
            <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden mb-5">
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: `${Math.min(100, (aiUsageCount / (typeof SUBSCRIPTION_MODELS[subscriptionTier].voiceLimit === 'number' ? SUBSCRIPTION_MODELS[subscriptionTier].voiceLimit : 1)) * 100)}%` }}
                 className="h-full bg-gradient-to-r from-[var(--color-accent)] to-emerald-300"
               />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               <div className="flex flex-col">
                  <span className="text-[10px] text-[var(--color-secondary)] uppercase tracking-widest">{t.aiCost}</span>
                  <span className="text-[14px] font-mono font-medium text-white">{getAiCostEstimate()} JOD</span>
               </div>
               <div className="flex flex-col text-left">
                  <span className="text-[10px] text-[var(--color-secondary)] uppercase tracking-widest">{t.savings}</span>
                  <span className="text-[14px] font-bold text-emerald-400">+{getProductivitySavings()} JOD</span>
               </div>
            </div>

            {subscriptionTier === 'free' && aiUsageCount > 0 && (
              <div className="mt-5 p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 text-center">
                 <p className="text-[11px] text-[var(--color-accent)] font-medium leading-relaxed">{t.upgradeMsg}</p>
              </div>
            )}
         </div>
      </div>
    </div>
  );
}
