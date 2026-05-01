"use client";

import React, { useState, useCallback, useEffect } from "react";
import AppLayout from "../components/AppLayout";
import HomeTab from "../components/HomeTab";
import TransactionsTab from "../components/TransactionsTab";
import JarsTab from "../components/JarsTab";
import ProfileTab from "../components/ProfileTab";
import AuthAndSelection from "../components/AuthAndSelection";
import { FinanceProvider } from "../context/FinanceContext";
import { auth } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function Home() {
  const [activeTab, setActiveTab] = useState("home");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  const handleComplete = useCallback(() => {
    setIsAuthenticated(true);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setIsAuthenticated(false);
      }
      setIsInitializing(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleChangeTab = (e: Event) => {
      const customEvent = e as CustomEvent;
      setActiveTab(customEvent.detail);
    };
    window.addEventListener('change-tab', handleChangeTab);
    return () => window.removeEventListener('change-tab', handleChangeTab);
  }, []);

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center h-full bg-[var(--color-app)]">
        <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthAndSelection onComplete={handleComplete} />;
  }

  return (
    <FinanceProvider>
      <AppLayout activeTab={activeTab} onTabChange={setActiveTab}>
        {activeTab === "home" && <HomeTab />}
        {activeTab === "transactions" && <TransactionsTab />}
        {activeTab === "jars" && <JarsTab />}
        {activeTab === "profile" && <ProfileTab />}
      </AppLayout>
    </FinanceProvider>
  );
}
