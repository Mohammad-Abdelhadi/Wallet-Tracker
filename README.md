# Wallet Tracker: The Future of Automated Personal Finance

## 🚩 The Problem
Managing finances in modern Jordan is fragmented. Users often have multiple bank accounts (Reflect, Safwa, Arab Bank, etc.) and wallet services (ZainCash, OrangeMoney). Each requires a separate app to check balances and transactions, and manual expense tracking apps are tedious and usually abandoned within weeks.

## ✅ Our Solution
Wallet Tracker provides a **zero-effort financial dashboard**. By leveraging iOS native automation and advanced AI processing, we capture financial data at the source—the bank SMS—allowing users to see their entire net worth and spending habits in one unified, real-time interface.

### Why Users Choose Us
*   **Zero Manual Entry**: Transactions appear in the app the second you pay, without you opening a menu.
*   **Bank Agnostic**: We don't need "official" API access to your bank (which often doesn't exist); we use the notifications you already receive.
*   **Privacy First**: We only see transaction data you choose to share via the shortcut, never your banking passwords.

---

## 🌟 Key Features & Benefits
*   **Multi-Card Aggregation**: Link multiple bank cards and see a "Total Wallet" balance that updates dynamically.
*   **Smart SMS Automation**: A custom-built iOS Shortcut acts as the bridge between your messages and your dashboard.
*   **Voice-Powered Logging**: For cash transactions, use the "Voice Record" feature—Gemini AI parses your spoken words into structured data.
*   **Dynamic Dashboard**: Unlike static prototypes, everything is powered by **Firebase**, ensuring your data is persisted and synced across devices.
*   **AI Categorization**: Automatic tagging (Shopping, Food, Bills) helps you visualize where your money goes.

---

## 🔄 The End-to-End Process
1.  **Trigger**: User makes a purchase; Bank sends an SMS.
2.  **Automation**: iOS "Personal Automation" detects the SMS and runs our **Wallet Sync Shortcut**.
3.  **Transmission**: The Shortcut sends the message body to our **n8n Webhook**.
4.  **Intelligence**: **Gemini AI** analyzes the string: *"Withdrawal of 5.00 JOD from [Merchant] at [Date]"*.
5.  **Persistence**: The parsed JSON (Amount: 5, Merchant: ..., Category: ...) is written to **Firebase Firestore**.
6.  **Real-time UI**: The Next.js frontend, listening for Firestore changes, updates the cards and graphs instantly.

---

## 🛠 Technologies Used
*   **Framework**: Next.js 15 (App Router) with TypeScript.
*   **Styling**: Tailwind CSS for a high-end, responsive "Fintech" aesthetic.
*   **Database & Auth**: **Firebase** (Firestore for dynamic real-time data & Google Auth).
*   **Automation Engine**: **n8n** (hosted workflow manager).
*   **AI Engine**: **Google Gemini 1.5 Pro** for natural language processing of SMS and Voice.
*   **Device Integration**: **iOS Shortcuts & Automations API**.
*   **Animations**: Framer Motion for smooth, native-app-like transitions.
