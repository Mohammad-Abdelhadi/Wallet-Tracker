import type {Metadata} from 'next';
import { Alexandria, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const alexandria = Alexandria({
  subsets: ['arabic', 'latin'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'مالي - المساعد الذكي',
  description: 'مساعد مالي ذكي وحساب رقمي فاخر',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="ar" dir="rtl" className={`${alexandria.variable} ${jetbrainsMono.variable}`}>
      <body suppressHydrationWarning className="bg-[#050f0b] text-white overflow-x-hidden w-full h-full min-h-screen sm:flex sm:items-center sm:justify-center">
        <main className="w-full h-screen sm:max-w-[420px] sm:h-[860px] bg-gradient-to-br from-[#0D2B1E] via-[#111111] to-[#0D2B1E] sm:rounded-[56px] sm:border-[12px] sm:border-[#0d2b1e] sm:outline sm:outline-1 sm:outline-[#22e3a6]/30 shadow-[0_0_100px_rgba(34,227,166,0.15)] relative overflow-hidden flex flex-col [transform:translateZ(0)]">
          {children}
        </main>
      </body>
    </html>
  );
}
