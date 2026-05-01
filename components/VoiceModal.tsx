"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Mic, X, Check, Loader2, Send } from "lucide-react";
import { useFinance } from "../context/FinanceContext";
import { GoogleGenAI, Type } from "@google/genai";
import { translations } from "../lib/translations";

interface VoiceModalProps {
  onClose: () => void;
}

export default function VoiceModal({ onClose }: VoiceModalProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedData, setParsedData] = useState<any[] | null>(null);
  
  const { addTransaction, wallets, activeWalletId, trackAiUsage, language } = useFinance();
  const t = translations[language];
  const recognitionRef = useRef<any>(null);

  const defaultWallet = activeWalletId === 'all' ? (wallets[0]?.id || 'reflect') : activeWalletId;
  const defaultBankName = wallets.find(w => w.id === defaultWallet)?.bankName || 'Reflect';

  useEffect(() => {
    // Setup Speech Recognition
    if (typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "ar-SA";

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
        // We do not auto-process here to allow user to edit/review the text, or they can click stop.
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      setTranscript("");
      setParsedData(null);
      recognitionRef.current?.start();
    }
  };

  const processTextWithAI = async (textToProcess: string = transcript) => {
    if (!textToProcess.trim()) return;
    
    const canUseAi = await trackAiUsage();
    if (!canUseAi) {
      alert(t.upgradeMsg);
      return;
    }

    setIsProcessing(true);
    setParsedData(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || "" });
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `قم بتحليل النص التالي واستخرج جميع المعطيات المالية منه (قد يحتوي النص على أكثر من عملية، افصلهم عن بعض). النص:\n"${textToProcess}"`,
        config: {
          responseMimeType: "application/json",
          systemInstruction: `أنت مساعد مالي ذكي. تستقبل وصف لعمليات مالية باللهجة العربية. استخرج المبلغ، التصنيف، الوصف، والنوع لكل عملية تم ذكرها وأرجع مصفوفة (array) من العمليات.
الحسابات المتاحة هي:
${wallets.map(w => `- ID: ${w.id}, Name: ${w.name}, Bank: ${w.bankName}`).join('\n')}
إذا تم ذكر حساب معين، قم بتحديد المعرف (ID) الخاص به. إذا لم يتم ذكر حساب محدد، اختر الحساب الافتراضي "${defaultWallet}".`,
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              transactions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    amount: { type: Type.NUMBER, description: "المبلغ المالي المذكور. رقم." },
                    category: { type: Type.STRING, description: "تصنيف العملية (مثلا: مواصلات، طعام، فواتير)" },
                    description: { type: Type.STRING, description: "وصف العملية باختصار" },
                    type: { type: Type.STRING, description: "استخدم إما 'expense' أو 'income' أو 'transfer'" },
                    icon: { type: Type.STRING, description: "اختر إيموجي واحد 1 emoji يعبر عن التصنيف" },
                    walletId: { type: Type.STRING, description: "معرف الحساب (ID) الذي تمت عليه العملية" },
                    bankName: { type: Type.STRING, description: "اسم البنك المرتبط بالعملية" }
                  },
                  required: ["amount", "category", "description", "type", "icon", "walletId", "bankName"],
                }
              }
            },
            required: ["transactions"],
          }
        }
      });

      if (response.text) {
        const json = JSON.parse(response.text.trim());
        const augmentedTransactions = json.transactions.map((tx: any) => ({
          ...tx,
          source: 'voice',
          originalMsg: textToProcess
        }));
        setParsedData(augmentedTransactions);
      }
    } catch (e) {
      console.error(e);
      // fallback just in case
      setParsedData([{
        amount: 0,
        category: "غير معروف",
        description: textToProcess,
        type: "expense",
        icon: "❓",
        bankName: defaultBankName,
        source: 'voice',
        originalMsg: textToProcess,
        walletId: defaultWallet
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const saveTransaction = () => {
    if (parsedData && parsedData.length > 0) {
      parsedData.forEach((data) => {
        addTransaction({
          amount: data.amount,
          category: data.category,
          description: data.description,
          type: data.type as "expense" | "income" | "transfer",
          icon: data.icon,
          walletId: data.walletId || defaultWallet,
          bankName: data.bankName || defaultBankName,
          source: data.source || 'voice',
          originalMsg: data.originalMsg || transcript
        });
      });
      onClose();
    }
  };

  // Allow simulating SMS parsing directly from text input here for demo purposes as well
  const handleKeyboardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processTextWithAI(transcript);
  }

  return (
    <div className="absolute inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, y: 100, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 100, scale: 0.9 }}
        className="w-full max-w-sm max-h-[85vh] overflow-y-auto bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl p-6 relative shadow-2xl hide-scrollbar"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 left-4 p-2 bg-white/5 rounded-full text-white/50 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="text-center mb-8 pt-4">
          <h2 className="text-xl font-bold mb-2">{t.voiceRecord}</h2>
          <p className="text-sm text-[var(--color-secondary)]">{t.aiHeroSub}</p>
        </div>

        {!parsedData && (
          <div className="flex flex-col items-center">
            
            <div className="relative mb-8">
              {isRecording && (
                <motion.div 
                  className="absolute inset-0 bg-[var(--color-accent)] rounded-full opacity-20"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.5, 0.2] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                />
              )}
              <button
                onClick={toggleRecording}
                className={`w-24 h-24 rounded-full flex items-center justify-center relative z-10 transition-all duration-300 ${isRecording ? 'bg-[var(--color-accent)] text-black shadow-[0_0_30px_rgba(16,185,129,0.4)] scale-110' : 'bg-[var(--color-app)] text-white hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)]'}`}
              >
                <Mic size={32} />
              </button>
            </div>

            <form onSubmit={handleKeyboardSubmit} className="w-full relative mb-4">
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder={t.typeYourMsg}
                className="w-full bg-[var(--color-app)] border border-[var(--color-border)] rounded-2xl p-4 min-h-[140px] text-center resize-none focus:outline-none focus:border-[var(--color-accent)] transition-colors pr-10"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleKeyboardSubmit(e as any);
                  }
                }}
              />
              {transcript && !isRecording && (
                <button type="submit" disabled={isProcessing} className="absolute bottom-4 left-4 p-2 bg-[var(--color-surface)] rounded-full text-[var(--color-accent)] shadow border border-[var(--color-border)]">
                   {isProcessing ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                </button>
              )}
            </form>

            <div className="h-6 flex items-center justify-center w-full">
              {isProcessing && <p className="text-sm text-[var(--color-accent)] animate-pulse">{language === 'ar' ? 'جاري التحليل...' : 'Analyzing...'}</p>}
            </div>
          </div>
        )}

        {parsedData && parsedData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col gap-4 max-h-[70vh]"
          >
            <div className="flex-1 overflow-y-auto pr-1 hide-scrollbar">
              <div className="bg-[var(--color-surface)] p-4 rounded-3xl border border-[var(--color-border)]">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--color-accent-subtle)] flex items-center justify-center text-xs">✨</div>
                  <span className="text-[13px] font-medium">{language === 'ar' ? 'تحليل الذكاء الاصطناعي' : 'AI Analysis'}</span>
                </div>
                
                <div className="text-[12px] text-[var(--color-tertiary)] mb-4 italic text-right px-2">
                  &quot;{transcript}&quot;
                </div>

                <div className="flex flex-col gap-3">
                  {parsedData.map((data, idx) => (
                    <div key={idx} className="bg-[#0A0A0A] rounded-2xl p-4 border border-[#1A1A1A]">
                      <div className="flex justify-between items-center text-left" dir="ltr">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-[var(--color-tertiary)] uppercase tracking-widest text-left">Category</span>
                          <span className="text-[13px] mt-0.5">{data.icon} {data.category}</span>
                          <span className="text-[11px] text-[var(--color-secondary)] mt-1">{data.description}</span>
                        </div>
                        <div className="text-right">
                          <div className={`text-[15px] font-semibold font-mono ${data.type === 'income' ? 'text-emerald-400' : 'text-[var(--color-accent)]'}`}>
                            {data.type === 'income' ? '+' : '-'}{Number(data.amount).toFixed(2)} JD
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-auto pt-4 border-t border-white/5">
              <button 
                onClick={saveTransaction}
                className="w-full py-4 bg-[var(--color-accent)] text-black rounded-2xl text-lg font-bold flex justify-center items-center gap-3 hover:brightness-110 active:scale-[0.98] transition-all shadow-xl shadow-[var(--color-accent)]/20"
              >
                <Check size={22} strokeWidth={3} /> {language === 'ar' ? 'حفظ العملية الآن' : 'Save Transaction Now'}
              </button>
              <button 
                onClick={() => setParsedData(null)}
                className="w-full py-4 bg-white/5 border border-white/10 hover:bg-white/10 rounded-2xl text-base font-medium transition-colors text-white/70"
              >
                {language === 'ar' ? 'إعادة المحاولة / تعديل النص' : 'Try Again / Edit Text'} ✏️
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
