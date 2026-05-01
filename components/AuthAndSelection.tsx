import React, { useState, useEffect, useCallback } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Wallet, Check, AlertCircle, Globe } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestoreError';
import { Language, translations } from '../lib/translations';

interface AuthProps {
  onComplete: () => void;
}

export const AVAILABLE_BANKS = [
  { id: 'reflect', name: 'Reflect', shortName: 'RE', bankName: 'Reflect - Arab Bank', color: 'bg-gradient-to-br from-[#8E2DE2] to-[#4A00E0] border-[#9b4dff]' },
  { id: 'arab_bank', name: 'Arab Bank', shortName: 'AB', bankName: 'Arab Bank PLC', color: 'bg-gradient-to-br from-[#E11927] to-[#A30F1A] border-[#ff4d5a]' },
  { id: 'bank_etihad', name: 'Bank Etihad', shortName: 'BE', bankName: 'Bank Etihad', color: 'bg-gradient-to-br from-[#F05A28] to-[#C93B0C] border-[#F68058]' },
  { id: 'safwa_bank', name: 'Safwa Bank', shortName: 'SA', bankName: 'Safwa Bank', color: 'bg-gradient-to-br from-[#006837] to-[#004022] border-[#22b573]' },
  { id: 'jib', name: 'JIB Bank', shortName: 'JI', bankName: 'Jordan Investment Bank', color: 'bg-gradient-to-br from-[#1B365D] to-[#12243D] border-[#d4af37]' },
  { id: 'hbtf', name: 'Housing Bank', shortName: 'HB', bankName: 'HBTF Jordan', color: 'bg-gradient-to-br from-[#00529B] to-[#003B70] border-[#FFD700]' },
];

export default function AuthAndSelection({ onComplete }: AuthProps) {
  const [step, setStep] = useState<'splash' | 'auth' | 'selection' | 'onboarding'>('splash');
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [selectedBanks, setSelectedBanks] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>('ar');
  const t = translations[language];

  const checkUserSelection = useCallback(async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.language) setLanguage(data.language as Language);
        
        // If they finished onboarding, they are done
        if (data.hasCompletedOnboarding) {
          console.log("User already completed onboarding, completing auth.");
          onComplete();
          return;
        }
        
        // Otherwise, show onboarding
        setStep('onboarding');
        return;
      }
      
      // Definitely new user
      console.log("New user detected, showing onboarding.");
      setStep('onboarding');
    } catch (e: any) {
      console.warn("Check selection handled as new user:", e);
      setStep('onboarding');
    }
  }, [onComplete]);

  useEffect(() => {
    // Splash screen timer - shorter if already logged in
    const checkImmediately = async () => {
      if (auth.currentUser) {
        await checkUserSelection(auth.currentUser.uid);
      } else {
        setStep('auth');
      }
    };

    const timer = setTimeout(() => {
      if (step === 'splash') {
        checkImmediately();
      }
    }, step === 'splash' && auth.currentUser ? 1000 : 2000);
    
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user && step === 'auth') {
        checkUserSelection(user.uid);
      }
    });

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [step, checkUserSelection]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
      // onAuthStateChanged will handle the rest
    } catch (e: any) {
      console.error("Sign-in failed:", e);
      setError(e.message || "فشل تسجيل الدخول");
      setLoading(false);
    }
  };

  const toggleBank = (bankId: string) => {
    setSelectedBanks(prev => 
      prev.includes(bankId) ? prev.filter(id => id !== bankId) : [...prev, bankId]
    );
  };

  const saveSelection = async () => {
    if (selectedBanks.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      if (!auth.currentUser) throw new Error("Not authenticated");
      const userPath = `users/${auth.currentUser.uid}`;
      try {
        await setDoc(doc(db, 'users', auth.currentUser.uid), {
          selectedBanks,
          email: auth.currentUser.email,
          name: auth.currentUser.displayName,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        setStep('onboarding');
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, userPath);
      }
    } catch (e: any) {
      console.error("Save selection failed:", e);
      let errorMsg = "فشل حفظ البيانات";
      try {
        if (e.message?.startsWith('{')) {
          const errInfo = JSON.parse(e.message);
          errorMsg = `خطأ في قاعدة البيانات: ${errInfo.error}`;
        }
      } catch (parseErr) {
        // Fallback to default message
      }
      setError(errorMsg);
      setLoading(false);
    }
  };

  const completeOnboarding = async () => {
    setLoading(true);
    try {
      if (!auth.currentUser) throw new Error("Not authenticated");
      await setDoc(doc(db, 'users', auth.currentUser.uid), {
        hasCompletedOnboarding: true,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      onComplete();
    } catch (e) {
      console.error("Failed to complete onboarding:", e);
      onComplete(); // Move on anyway
    }
  };

  if (step === 'splash') {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full min-h-screen bg-black relative overflow-hidden">
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           className="absolute inset-0"
        >
          <img 
            src="/images/FirstSplash.jpg" 
            alt="Splash" 
            className="w-full h-full object-cover opacity-60"
          />
        </motion.div>
        <motion.div
           initial={{ scale: 0.8, opacity: 0 }}
           animate={{ scale: 1, opacity: 1 }}
           transition={{ duration: 1, ease: "easeOut" }}
           className="relative z-10 flex flex-col items-center"
        >
          <div className="mb-8 flex items-center justify-center p-4">
             <img src="/images/logowallettracker.svg" alt="Wallet Tracker Logo" className="w-[190px] h-[130px] object-contain" />
          </div>
        </motion.div>
      </div>
    );
  }

  if (step === 'auth') {
    return (
      <div className="flex flex-col w-full h-full min-h-screen bg-black relative overflow-hidden">
        {/* Splash Background Integration */}
        <div className="absolute inset-0">
          <img 
            src="/images/FirstSplash.jpg" 
            alt="Background" 
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
        </div>

        <button 
          onClick={() => setLanguage(prev => prev === 'ar' ? 'en' : 'ar')}
          className="absolute top-10 right-6 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-white/70 backdrop-blur-md"
        >
          <Globe size={14} />
          {language === 'ar' ? 'English' : 'العربية'}
        </button>

        <div className="relative z-10 flex-1 flex flex-col justify-center items-center w-full p-8">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex flex-col items-center mb-12"
          >
            <div className="mb-8 flex items-center justify-center p-4">
             <img src="/images/logowallettracker.svg" alt="Wallet Tracker Logo" className="w-[190px] h-[130px] object-contain" />
            </div>
            <div className="flex items-center gap-3 opacity-60">
               <div className="h-[1px] w-8 bg-[var(--color-accent)]/30"></div>
               <p className="text-[var(--color-secondary)] text-[12px] tracking-[0.2em] font-poppins font-medium uppercase drop-shadow-md">
                 {language === 'ar' ? 'مساعدك المالي' : 'Smart Finance'}
               </p>
               <div className="h-[1px] w-8 bg-[var(--color-accent)]/30"></div>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="w-full max-w-sm bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[32px] p-6 shadow-2xl"
          >
            <div className="text-right mb-6" dir="rtl">
              <h2 className="text-xl font-bold mb-1 text-white">{language === 'ar' ? 'أهلاً بك' : 'Welcome'}</h2>
              <p className="text-[13px] text-white/50">{language === 'ar' ? 'سجل دخولك لتتمكن من متابعة وإدارة نفقاتك بذكاء.' : 'Sign in to start tracking and managing your expenses smartly.'}</p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl p-4 w-full mb-6 flex items-center gap-3 text-xs">
                <AlertCircle size={16} />
                {error}
              </div>
            )}
            
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full bg-white text-black py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-gray-100 transition-colors disabled:opacity-50 shadow-xl"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <span>{language === 'ar' ? "المتابعة باستخدام Google" : "Continue with Google"}</span>
                </>
              )}
            </button>
            <p className="text-[10px] text-white/30 text-center mt-6 uppercase tracking-widest">{language === 'ar' ? 'تشفير آمن للبيانات' : 'Secure Data Encryption'}</p>
          </motion.div>
        </div>
      </div>
    );
  }

  // Onboarding Step
  if (step === 'onboarding') {
    return (
      <div className="flex flex-col w-full h-full min-h-screen bg-black relative overflow-hidden" dir="rtl">
        <div className="absolute inset-0">
          <img 
            src="/images/FirstSplash.jpg" 
            alt="Background" 
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#0d2b1e] via-[#020617] to-black opacity-90"></div>
        </div>

        <div className="relative z-10 flex-1 flex flex-col pt-12 overflow-hidden h-full">
          <div className="px-8 flex items-center gap-2 mb-8">
            <div className={`h-1 flex-1 rounded-full ${onboardingStep >= 1 ? 'bg-[#22e3a6]' : 'bg-white/10'}`}></div>
            <div className={`h-1 flex-1 rounded-full ${onboardingStep >= 2 ? 'bg-[#22e3a6]' : 'bg-white/10'}`}></div>
            <div className={`h-1 flex-1 rounded-full ${onboardingStep >= 3 ? 'bg-[#22e3a6]' : 'bg-white/10'}`}></div>
          </div>

          <div className="flex-1 overflow-y-auto px-8 hide-scrollbar">
            <AnimatePresence mode="wait">
              <motion.div
                key={onboardingStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col pb-32"
              >
                {onboardingStep === 1 ? (
                  <div className="flex flex-col">
                    <div className="w-16 h-16 bg-[#22e3a6]/20 rounded-2xl flex items-center justify-center mb-6 border border-[#22e3a6]/30">
                      <Globe className="text-[#22e3a6]" size={32} />
                    </div>
                    <h2 className="text-3xl font-bold mb-4 text-white">تثبيت التطبيق</h2>
                    <p className="text-white/60 mb-6 leading-relaxed">
                      للحصول على أفضل تجربة، قم بإضافة التطبيق إلى الشاشة الرئيسية (Shortcut) على هاتفك. هذا سيتيح لك استخدامه كتطبيق حقيقي.
                    </p>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
                      <p className="text-xs text-white/40 uppercase tracking-widest mb-3">خطوات التثبيت</p>
                      <ul className="space-y-3">
                        <li className="flex items-center gap-3 text-sm">
                          <div className="w-5 h-5 rounded-full bg-[#22e3a6]/20 flex items-center justify-center text-[#22e3a6] text-[10px] font-bold">1</div>
                          اضغط على زر المشاركة (Share) في Safari.
                        </li>
                        <li className="flex items-center gap-3 text-sm">
                          <div className="w-5 h-5 rounded-full bg-[#22e3a6]/20 flex items-center justify-center text-[#22e3a6] text-[10px] font-bold">2</div>
                          اختر &quot;إضافة إلى الشاشة الرئيسية&quot; (Add to Home Screen).
                        </li>
                      </ul>
                    </div>
                  </div>
                ) : onboardingStep === 2 ? (
                  <div className="flex flex-col">
                    <div className="w-16 h-16 bg-[#22e3a6]/20 rounded-2xl flex items-center justify-center mb-6 border border-[#22e3a6]/30">
                      <Wallet className="text-[#22e3a6]" size={32} />
                    </div>
                    <h2 className="text-3xl font-bold mb-4 text-white">تحميل الشورت كت</h2>
                    <p className="text-white/60 mb-6 leading-relaxed">
                       كل ما عليك فعله هو تحميل الشورت كت الخاص بنا. هو المسؤول عن <span className="text-[#22e3a6] font-bold">قراءة وإرسال رسائل الـ SMS تلقائياً</span> إلى التطبيق فور وصولها، مما يلغي الحاجة للإدخال اليدوي تماماً.
                    </p>
                    <a 
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        window.open('https://www.icloud.com/shortcuts/YOUR_SHORTCUT_ID', '_blank');
                      }}
                      className="w-full mb-6 bg-[#007AFF] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl shadow-[#007AFF]/30 transition-all active:scale-95 border border-white/10"
                    >
                      <div className="w-8 h-8 bg-black/20 rounded-lg flex items-center justify-center">
                        <Globe size={18} />
                      </div>
                      <div className="flex flex-col items-start leading-tight">
                        <span className="text-xs opacity-80 font-medium font-poppins">iOS Shortcuts</span>
                        <span className="text-sm font-bold">{language === 'ar' ? 'تثبيت الشورت كت التلقائي' : 'Install Auto-Shortcut'}</span>
                      </div>
                    </a>
                    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden mb-4 relative aspect-[4/3]">
                       <img 
                         src="/images/shortcutsc.png" 
                         className="w-full h-full object-cover opacity-90 shadow-2xl"
                         alt="Shortcut Setup"
                       />
                       <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col">
                    <div className="w-16 h-16 bg-[#22e3a6]/20 rounded-2xl flex items-center justify-center mb-6 border border-[#22e3a6]/30">
                      <Check className="text-[#22e3a6]" size={32} />
                    </div>
                    <h2 className="text-3xl font-bold mb-2 text-white">اختر بطاقتك</h2>
                    <p className="text-white/60 mb-6 text-sm">
                      اختر البطاقة التي ترغب بتجربتها في النسخة المجانية (حد أقصى: بطاقة واحدة). ستتمكن أيضاً من رؤية <span className="text-[#22e3a6] font-medium">البطاقة المجمعة (Total)</span> التي تجمع كافة حساباتك.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-3 pb-8">
                      {AVAILABLE_BANKS.map((bank) => {
                        const isSelected = selectedBanks.includes(bank.id);
                        return (
                          <div
                            key={bank.id}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedBanks(prev => prev.filter(id => id !== bank.id));
                              } else {
                                setSelectedBanks([bank.id]);
                              }
                            }}
                            className="relative cursor-pointer transition-all duration-300 w-full aspect-square rounded-2xl p-3 flex flex-col justify-between border-2 border-white/10 bg-white/5 hover:border-white/20 active:scale-95"
                            style={isSelected ? { borderColor: '#22e3a6', backgroundColor: 'rgba(34,227,166,0.1)' } : {}}
                          >
                            <div className="flex justify-between items-start">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bank.color} border shadow-lg`}>
                                <span className="font-bold text-sm text-white">{bank.shortName}</span>
                              </div>
                              {isSelected && (
                                <div className="w-5 h-5 bg-[#22e3a6] rounded-full flex items-center justify-center text-black">
                                  <Check size={12} strokeWidth={4} />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-xs mb-0.5 text-white">{bank.name}</p>
                              <p className="text-[9px] text-white/40">{bank.bankName}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="absolute bottom-0 left-0 right-0 top-[730px] p-8 pt-3  bg-gradient-to-t from-black via-black/80 to-transparent">
             <div className="flex flex-col gap-3 pb-8">
                <button
                  onClick={() => {
                    if (onboardingStep === 1) setOnboardingStep(2);
                    else if (onboardingStep === 2) setOnboardingStep(3);
                    else {
                      if (selectedBanks.length === 0) return;
                      setLoading(true);
                      const doComplete = async () => {
                         try {
                            if (!auth.currentUser) return;
                            await setDoc(doc(db, 'users', auth.currentUser.uid), {
                              selectedBanks,
                              hasCompletedOnboarding: true,
                              email: auth.currentUser.email,
                              name: auth.currentUser.displayName,
                              updatedAt: new Date().toISOString()
                            }, { merge: true });
                            onComplete();
                         } catch (e) {
                            console.error(e);
                            onComplete();
                         }
                      };
                      doComplete();
                    }
                  }}
                  disabled={onboardingStep === 3 && selectedBanks.length === 0}
                  className="w-full bg-[#22e3a6] text-black py-4 rounded-2xl font-bold text-lg shadow-xl shadow-[#22e3a6]/20 transition-all active:scale-95 disabled:opacity-30"
                >
                  {onboardingStep === 3 ? (loading ? 'ابدأ الاستخدام' : 'ابدأ الاستخدام') : 'فهمت، التالي'}
                </button>
             </div>
          </div>
        </div>
      </div>
    );
  }

  // Selection Step
  return (
    <div className="flex flex-col w-full h-full min-h-screen bg-[var(--color-app)] text-white p-6 pt-12">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">{language === 'ar' ? 'اختر بنوكك' : 'Choose Your Banks'}</h2>
        <p className="text-[var(--color-secondary)] text-sm">
          {language === 'ar' ? 'حدد البنوك والمحافظ التي تستخدمها لتخصيص تجربتك.' : 'Select the banks and wallets you use to personalize your experience.'}
        </p>
      </div>
      
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-500 rounded-xl p-4 w-full mb-6 flex items-center gap-3 text-sm">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 flex-1 content-start">
        {AVAILABLE_BANKS.map((bank) => {
          const isSelected = selectedBanks.includes(bank.id);
          return (
            <div
              key={bank.id}
              onClick={() => toggleBank(bank.id)}
              className={`relative cursor-pointer transition-all duration-300 w-full aspect-square rounded-3xl p-4 flex flex-col justify-between border-2 ${isSelected ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10' : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-white/20'}`}
            >
              <div className="flex justify-between items-start">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bank.color} border shadow-lg`}>
                  <span className="font-bold text-lg text-white">{bank.shortName[0]}</span>
                </div>
                {isSelected && (
                  <div className="w-6 h-6 bg-[var(--color-accent)] rounded-full flex items-center justify-center text-black">
                    <Check size={14} strokeWidth={3} />
                  </div>
                )}
              </div>
              <div>
                <p className="font-bold mb-0.5">{bank.name}</p>
                <p className="text-[10px] text-[var(--color-secondary)]">{bank.bankName}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-6 mt-auto">
        <button
          onClick={saveSelection}
          disabled={selectedBanks.length === 0 || loading}
          className="w-full bg-[var(--color-accent)] text-black py-4 rounded-2xl font-bold text-lg disabled:opacity-50 disabled:bg-[var(--color-surface)] disabled:text-[var(--color-secondary)] transition-colors"
        >
          {loading ? (language === 'ar' ? "جاري الحفظ..." : "Saving...") : (language === 'ar' ? "البدء باستخدام مالي" : "Get Started with MALI")}
        </button>
      </div>
    </div>
  );
}
