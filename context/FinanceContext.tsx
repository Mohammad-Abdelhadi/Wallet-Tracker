"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { ethers } from "ethers";
import { db, auth } from "../lib/firebase";
import { collection, doc, onSnapshot, query, orderBy, setDoc, getDoc, addDoc } from "firebase/firestore";
import { OperationType, handleFirestoreError } from "../lib/firestoreError";
import { AVAILABLE_BANKS } from "../components/AuthAndSelection";
import { Language, SubTier, translations, SUBSCRIPTION_MODELS } from "../lib/translations";

export type TransactionType = "expense" | "income" | "transfer";

export interface Transaction {
  id: string;
  amount: number;
  category: string;
  description: string;
  type: TransactionType;
  date: string;
  merchant?: string;
  icon?: string;
  walletId?: string;
}

export interface Jar {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  icon: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: "income" | "expense" | "transfer";
}

export interface Wallet {
  id: string;
  name: string;
  bankName: string;
  color: string;
  type: "fiat" | "web3";
  number: string;
  logo?: string;
}

interface FinanceState {
  balance: number;
  transactions: Transaction[];
  jars: Jar[];
  addTransaction: (tx: Omit<Transaction, "id" | "date" | "walletId"> & { date?: string, walletId?: string }) => void;
  addToJar: (jarId: string, amount: number) => void;
  addJar: (jar: Omit<Jar, "id" | "currentAmount">) => void;
  notifications: AppNotification[];
  dismissNotification: (id: string) => void;
  activeWalletId: string;
  setActiveWalletId: (id: string) => void;
  wallets: Wallet[];
  toggleWallet: (bankId: string) => Promise<void>;
  subscriptionTier: SubTier;
  setSubscription: (tier: SubTier) => Promise<void>;
  language: Language;
  toggleLanguage: () => void;
  aiUsageCount: number;
  trackAiUsage: () => Promise<boolean>;
  getWalletBalance: (walletId: string) => number;
  ethAddress: string | null;
  ethBalance: string;
  isConnecting: boolean;
  connectWallet: () => Promise<void>;
  updateEthBalance: () => Promise<void>;
}

const defaultState: FinanceState = {
  balance: 0,
  transactions: [],
  jars: [],
  addTransaction: () => {},
  addToJar: () => {},
  addJar: () => {},
  notifications: [],
  dismissNotification: () => {},
  activeWalletId: "all",
  setActiveWalletId: () => {},
  wallets: [],
  toggleWallet: async () => {},
  subscriptionTier: 'free',
  setSubscription: async () => {},
  language: 'ar',
  toggleLanguage: () => {},
  aiUsageCount: 0,
  trackAiUsage: async () => false,
  getWalletBalance: () => 0,
  ethAddress: null,
  ethBalance: "0",
  isConnecting: false,
  connectWallet: async () => {},
  updateEthBalance: async () => {}
};

const FinanceContext = createContext<FinanceState>(defaultState);

export const FinanceProvider = ({ children }: { children: React.ReactNode }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [jars, setJars] = useState<Jar[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [activeWalletId, setActiveWalletId] = useState("all");
  const [language, setLanguage] = useState<Language>('ar');
  const [subscriptionTier, setSubscriptionTier] = useState<SubTier>('free');
  const [aiUsageCount, setAiUsageCount] = useState(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [ethAddress, setEthAddress] = useState<string | null>(null);
  const [ethBalance, setEthBalance] = useState("0");
  const [isConnecting, setIsConnecting] = useState(false);

  const updateEthBalance = async () => {
    if (ethAddress && typeof window !== "undefined" && (window as any).ethereum) {
      try {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const bal = await provider.getBalance(ethAddress);
        setEthBalance(ethers.formatEther(bal));
      } catch (err) {
        console.error("Failed to update eth balance", err);
      }
    }
  };

  useEffect(() => {
    if (ethAddress) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      updateEthBalance();
      // Also set up listener for new blocks or just interval
      const interval = setInterval(updateEthBalance, 10000);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ethAddress]);

  const connectWallet = async () => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      try {
        setIsConnecting(true);
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        await provider.send("eth_requestAccounts", []);
        
        // Switch to Hedera Testnet
        try {
          await provider.send("wallet_switchEthereumChain", [{ chainId: "0x128" }]);
        } catch (switchError: any) {
          if (switchError.code === 4902 || switchError.code === -32603) {
            try {
              await provider.send("wallet_addEthereumChain", [
                {
                  chainId: "0x128",
                  chainName: "Hedera Testnet",
                  nativeCurrency: {
                    name: "HBAR",
                    symbol: "HBAR",
                    decimals: 18,
                  },
                  rpcUrls: ["https://testnet.hashio.io/api"],
                  blockExplorerUrls: ["https://hashscan.io/testnet/dashboard"],
                },
              ]);
            } catch (addError) {
              console.error("Failed to add Hedera Network", addError);
            }
          } else {
             console.error("Failed to switch Hedera Network", switchError);
          }
        }

        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        const bal = await provider.getBalance(address);
        
        setEthAddress(address);
        setEthBalance(ethers.formatEther(bal));
      } catch (err) {
        console.error("User denied account access or error occurred", err);
      } finally {
        setIsConnecting(false);
      }
    } else {
      alert("Please install MetaMask!");
    }
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  useEffect(() => {
    let unsubs: (() => void)[] = [];

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      // Clean up previous listeners if any
      unsubs.forEach(unsub => unsub());
      unsubs = [];

      if (user) {
        // Fetch User Banks
        const userRef = doc(db, 'users', user.uid);
        const unsubUser = onSnapshot(userRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            if (data.language) setLanguage(data.language);
            if (data.subscriptionTier) setSubscriptionTier(data.subscriptionTier);
            if (data.aiUsageCount) setAiUsageCount(data.aiUsageCount);
            
            if (data.selectedBanks) {
              const userWallets: Wallet[] = data.selectedBanks.map((bankId: string) => {
                const bankMeta = AVAILABLE_BANKS.find(b => b.id === bankId);
                return {
                  id: bankId,
                  name: bankMeta?.shortName || bankId,
                  bankName: bankMeta?.bankName || '',
                  color: bankMeta?.color || 'bg-gray-800',
                  type: "fiat",
                  number: "****" // Placeholder
                };
              });
              setWallets(userWallets);
            }
          }
        }, (error) => {
          if (auth.currentUser) handleFirestoreError(error, OperationType.GET, 'users/' + user.uid);
        });
        unsubs.push(unsubUser);

        // Fetch Transactions
        let initialLoad = true;
        const txRef = collection(db, 'users', user.uid, 'transactions');
        const qTx = query(txRef, orderBy('date', 'desc'));
        const unsubTx = onSnapshot(qTx, (snapshot) => {
          const txs: Transaction[] = [];
          snapshot.forEach(doc => txs.push({ id: doc.id, ...doc.data() } as Transaction));
          setTransactions(txs);
          
          if (!initialLoad) {
            snapshot.docChanges().forEach((change) => {
               if (change.type === 'added') {
                   const data = change.doc.data() as Transaction;
                   const targetBank = AVAILABLE_BANKS.find(b => b.id === data.walletId);
                   const bankName = data.walletId === 'web3' ? 'MetaMask' : (targetBank?.shortName || '');
                   const currency = data.walletId === 'web3' ? 'HBAR' : 'JOD';
                   
                   setNotifications(prev => [...prev, {
                      id: change.doc.id,
                      title: data.type === 'income' ? 'إيداع جديد' : data.type === 'expense' ? 'سحب/مشتريات' : 'تحويل',
                      message: `تم ${data.type === 'income' ? 'إيداع' : 'خصم'} ${data.amount.toFixed(2)} ${currency} ${bankName ? 'على حساب ' + bankName : ''}`,
                      type: data.type
                   }]);
                   
                   setTimeout(() => {
                     setNotifications(curr => curr.filter(n => n.id !== change.doc.id));
                   }, 5000);
               }
            });
          }
          initialLoad = false;
        }, (error) => {
          if (auth.currentUser) handleFirestoreError(error, OperationType.LIST, 'users/'+user.uid+'/transactions');
        });
        unsubs.push(unsubTx);

        // Fetch Jars
        const jarsRef = collection(db, 'users', user.uid, 'jars');
        const unsubJars = onSnapshot(jarsRef, (snapshot) => {
          const loadedJars: Jar[] = [];
          snapshot.forEach(doc => loadedJars.push({ id: doc.id, ...doc.data() } as Jar));
          setJars(loadedJars);
        }, (error) => {
          if (auth.currentUser) handleFirestoreError(error, OperationType.LIST, 'users/'+user.uid+'/jars');
        });
        unsubs.push(unsubJars);
      } else {
        // Clear state on logout
        setTransactions([]);
        setJars([]);
        setWallets([]);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubs.forEach(unsub => unsub());
    };
  }, []);

  const getWalletBalance = (walletId: string) => {
    const txsToSum = walletId === 'all' 
      ? transactions 
      : transactions.filter(t => t.walletId === walletId || (!t.walletId && wallets.length > 0 && walletId === wallets[0]?.id));
      
    return txsToSum.reduce((acc, tx) => {
      if (tx.type === 'income') return acc + tx.amount;
      if (tx.type === 'expense' || tx.type === 'transfer') return acc - tx.amount;
      return acc;
    }, 0);
  };

  const balance = getWalletBalance(activeWalletId);

  const addTransaction = async (txInfo: Omit<Transaction, "id" | "date" | "walletId"> & { date?: string, walletId?: string }) => {
    if (!auth.currentUser) return;
    const targetWalletId = txInfo.walletId || (activeWalletId === 'all' ? wallets[0]?.id : activeWalletId);
    
    const newTx = {
      ...txInfo,
      date: txInfo.date || new Date().toISOString(),
      walletId: targetWalletId
    };

    try {
      await addDoc(collection(db, 'users', auth.currentUser.uid, 'transactions'), newTx);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'users/'+auth.currentUser.uid+'/transactions');
    }
  };

  const addToJar = async (jarId: string, amount: number) => {
    if (!auth.currentUser) return;
    try {
      const jarRef = doc(db, 'users', auth.currentUser.uid, 'jars', jarId);
      const jarSnap = await getDoc(jarRef);
      if (jarSnap.exists()) {
        const currentAmount = jarSnap.data().currentAmount || 0;
        await setDoc(jarRef, { currentAmount: currentAmount + amount }, { merge: true });
        
        await addTransaction({
          amount: amount,
          category: language === 'ar' ? "توفير" : "Savings",
          description: language === 'ar' ? "تحويل إلى الجرة" : "Transfer to Savings Jar",
          type: "expense",
          icon: "🏺",
          walletId: activeWalletId === 'all' ? wallets[0]?.id : activeWalletId
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users/'+auth.currentUser.uid+'/jars/'+jarId);
    }
  };

  const addJar = async (jar: Omit<Jar, "id" | "currentAmount">) => {
    if (!auth.currentUser) return;
    try {
      await addDoc(collection(db, 'users', auth.currentUser.uid, 'jars'), {
        ...jar,
        currentAmount: 0
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'users/'+auth.currentUser.uid+'/jars');
    }
  };

  const toggleWallet = async (bankId: string) => {
    if (!auth.currentUser) return;
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        const currentBanks = data.selectedBanks || [];
        const isSelected = currentBanks.includes(bankId);
        const currentTier = data.subscriptionTier || 'free';
        const limit = SUBSCRIPTION_MODELS[currentTier as SubTier].cardLimit;
        
        let newBanks;
        if (isSelected) {
          newBanks = currentBanks.filter((id: string) => id !== bankId);
        } else {
          if (currentBanks.length >= limit) {
            const t = translations[language];
            alert(language === 'ar' 
              ? `وصلت للحد الأقصى للبطاقات (${limit}) لخطة ${SUBSCRIPTION_MODELS[currentTier as SubTier].name}. يرجى الترقية لإضافة المزيد.`
              : `You've reached the card limit (${limit}) for the ${SUBSCRIPTION_MODELS[currentTier as SubTier].name} plan. Please upgrade to add more.`);
            return;
          }
          newBanks = [...currentBanks, bankId];
        }
        
        await setDoc(userRef, { selectedBanks: newBanks }, { merge: true });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users/'+auth.currentUser.uid);
    }
  };

  const setSubscription = async (tier: SubTier) => {
    if (!auth.currentUser) return;
    try {
      await setDoc(doc(db, 'users', auth.currentUser.uid), { subscriptionTier: tier }, { merge: true });
      setSubscriptionTier(tier);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users/'+auth.currentUser.uid);
    }
  };

  const toggleLanguage = async () => {
    const newLang = language === 'ar' ? 'en' : 'ar';
    setLanguage(newLang);
    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'users', auth.currentUser.uid), { language: newLang }, { merge: true });
      } catch (e) { console.error(e); }
    }
  };

  const trackAiUsage = async (): Promise<boolean> => {
    if (!auth.currentUser) return false;
    const limit = SUBSCRIPTION_MODELS[subscriptionTier].aiLimit;
    if (aiUsageCount >= limit) return false;

    const newCount = aiUsageCount + 1;
    setAiUsageCount(newCount);
    try {
      await setDoc(doc(db, 'users', auth.currentUser.uid), { aiUsageCount: newCount }, { merge: true });
      return true;
    } catch (e) { 
      console.error(e);
      return false;
    }
  };

  return (
    <FinanceContext.Provider value={{ 
      balance, 
      transactions, 
      jars, 
      addTransaction, 
      addToJar,
      addJar,
      notifications,
      dismissNotification,
      activeWalletId,
      setActiveWalletId,
      wallets,
      toggleWallet,
      subscriptionTier,
      setSubscription,
      language,
      toggleLanguage,
      aiUsageCount,
      trackAiUsage,
      getWalletBalance,
      ethAddress,
      ethBalance,
      isConnecting,
      connectWallet,
      updateEthBalance
    }}>
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => useContext(FinanceContext);
