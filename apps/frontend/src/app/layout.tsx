import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { auth } from "@/auth";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Yukai — AI companion who lives on your screen",
  description: "Yukai talks back, dictates your messages, identifies music, and is always right there. Not just an assistant — a partner with personality.",
  icons: {
    icon: '/yukai/emotions/happy.png',
  },
  openGraph: {
    title: "Yukai — AI companion who lives on your screen",
    description: "Voice chat, dictation, music recognition, and screen vision — all in one desktop AI companion.",
    images: ['/yukai/emotions/happy.png'],
    url: 'https://yukai.app',
    siteName: 'Yukai',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Yukai — AI companion who lives on your screen',
    description: 'Voice chat, dictation, music recognition, and screen vision.',
    images: ['/yukai/emotions/happy.png'],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Достаём session здесь и кидаем в SessionProvider initial-prop'ом —
  // useSession() сразу видит правильное состояние без лишнего рефетча.
  const session = await auth();

  return (
    <html lang="en" className="h-full">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased h-full`}>
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  );
}
