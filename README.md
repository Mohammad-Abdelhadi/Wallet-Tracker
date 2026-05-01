# Wallet Tracker 📱💰
### [النسخة العربية]

تطبيق **Wallet Tracker** هو تطبيق ذكي باستخدام ادوات الذكاء الاصطناعي صمم لحل مشكلة تشتت الحسابات في السوق الأردني، حيث يوجد أكثر من **2.5 مليون بطاقة بنكية** نشطة لكنها موزعة بين تطبيقات ومنصات متعددة.

#### 🚩 المشكلة: تشتت البطاقات والحسابات
يعاني المستخدم في الأردن من التنقل بين تطبيقات البنوك المختلفة (Reflect، Safwa، الخ) والمحافظ الإلكترونية (ZainCash، OrangeMoney). هذا التشتت يجعل من الصعب معرفة إجمالي رصيدك أو تتبع نمط مصاريفك دون جهد يدوي كبير.

#### ✅ الحل
لوحة تحكم موحدة تجمع كافة حساباتك في مكان واحد **دون الحاجة لطلب أرقام بطاقاتك أو كلمات سر البنك.**

#### 💎 الميزة الجوهرية: التتبع الذكي لمسجات البطاقة
عملية أتمتة متكاملة تتبع رسائل الـ SMS الخاصة ببطاقتك وتلغي الحاجة للإدخال اليدوي تماماً:
1. **اختصار الـ iOS والمستقبل الرقمي**: عند وصول رسالة نصية (SMS) من البنك لبطاقتك، يقوم اختصار الـ **iOS Shortcut** بإرسال محتوى الرسالة فوراً إلى الـ **n8n Webhook**.
2. **منطق الـ n8n وتحليل الذكاء الاصطناعي**: يستقبل محرك الـ **n8n** البيانات، يقوم بفلترتها، ثم يستخدم الذكاء الاصطناعي لتصنيف العملية (دخل أو نفقة) وتحديد فئتها بدقة (تسوق، صحة، تعليم، إلخ).
3. **التخزين السحابي في Firebase**: يتم تخزين البيانات بشكل مهيكل داخل الـ **Firebase Firestore** لضمان حفظها بأمان.
4. **العرض اللحظي عبر الـ API**: تظهر هذه البيانات فوراً في التطبيق عبر الـ **Transactions API**، مما يؤدي لتحديث أرصدة بطاقاتك بشكل لحظي.

#### 🌟 أهم المميزات
* **أتمتة كاملة**: لا داعي لتسجيل المصاريف يدوياً؛ إشعارات البنك تقوم بالمهمة عنك.
* **لوحة تحكم موحدة**: شاشة عرض واحدة تجمع "الرصيد الإجمالي" لكافة بطاقاتك ومحافظك.
* **إدارة المعاملات**: صفحة متخصصة لعرض سجل العمليات بكافة تفاصيلها مع ميزات الفلترة.
* **صفحة الادخار**: مساحة خاصة لتحديد الأهداف المالية ومتابعة خطط الادخار الخاصة بك.
* **صفحة التحويلات**: واجهة مبسطة لإدارة وتسجيل التحويلات المالية بوضوح.
* **التسجيل الصوتي الذكي**: أضف مصاريفك النقدية (الكاش) عبر التحدث فقط؛ حيث يقوم الذكاء الاصطناعي بتحويل كلامك إلى بيانات مسجلة.
* **خصوصية مطلقة**: هويتك المالية آمنة تماماً، نحن نعالج نصوص الإشعارات فقط ولا نصل لحساباتك البنكية مباشرة.

#### 🛠 التقنيات المستخدمة
* **الواجهة (Frontend)**: Next.js 15, TypeScript, Tailwind CSS, Framer Motion.
* **قاعدة البيانات والتحقق (Database & Auth)* *: Firebase Firestore & Firebase Authentication.
* **الأتمتة (Automation)**: n8n Webhooks & iOS Shortcuts.
* **الذكاء الاصطناعي (Intelligence)**: Google Gemini 1.5 Pro.



### [English Version]

**Wallet Tracker** is an intelligent financial dashboard designed to solve the problem of financial fragmentation in Jordan, where over **2.5 million bank cards** are active but scattered across multiple apps and platforms.

#### 🚩 The Problem: Card Fragmentation
Users in Jordan often juggle between several banking apps (Reflect, Safwa, Bank al Etihad, etc.) and digital wallets (ZainCash, OrangeMoney). This makes it nearly impossible to have a clear view of your total net worth or spending habits without manual effort.

#### ✅ The Solution
A unified dashboard that aggregates all your accounts in one place **without ever asking for your card numbers or bank passwords.**

#### 💎 Core Feature: Automated Smart Tracking
Our "set-and-forget" automation flow eliminates human error and manual entry:
1. **iOS Shortcut & Webhook**: When a bank SMS arrives, a native iOS Shortcut forwards the text to our **n8n Webhook** instantly.
2. **n8n Logic & AI Analysis**: The **n8n automation** captures the data, filters it, and uses AI to categorize the transaction (Income vs. Expense) and tag it (e.g., Shopping, Health, Education, Food).
3. **Firebase Persistence**: The structured data is stored in **Firebase Firestore**.
4. **Real-time API**: The application fetches this data via the **Transaction API**, updating your dashboard and balances in real-time.

#### 🌟 Key Features
* **Full Automation**: No manual logging; your bank notifications do the work.
* **Unified Dashboard**: A "Total Balance" view that sums up all your linked cards and wallets.
* **Transactions Management**: A dedicated page for detailed history, filtering, and spending analysis.
* **Smart Savings**: A specialized page to set financial goals and track your saving progress.
* **Financial Transfers**: A streamlined interface for managing and recording transfers.
* **Voice-to-Data**: Log cash expenses by simply speaking; Gemini AI parses the voice recording into structured entries.
* **Extreme Privacy**: We only process notification text. Your actual bank accounts remain completely disconnected and secure.

#### 🛠 Tech Stack
* **Frontend**: Next.js 15, TypeScript, Tailwind CSS, Framer Motion.
* **Database & Auth**: Firebase Firestore & Firebase Authentication , NodeJS
* **Automation**: n8n Webhooks & iOS Shortcuts.
* **Intelligence**: Google Gemini 1.5 Pro.
