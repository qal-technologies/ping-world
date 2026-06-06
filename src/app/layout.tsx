import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { fontDisplay, fontBody, fontMono } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: 'Ping World',
    template: '%s | Ping World',
  },
  description:
    'Ping World is a free, all-in-one utility and creator platform. Anonymous messaging, quiz builder, image toolkit, URL shortener, post composer, and more.',
  metadataBase: new URL('https://pingworld.fun'),
  openGraph: {
    type: 'website',
    siteName: 'Ping World',
    title: 'Ping World — Your world of tools.',
    description:
      'Free tools for everyone: anonymous messaging, quizzes, image editing, URL shortener, and a full creator hub.',
    url: 'https://pingworld.fun',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ping World — Your world of tools.',
    description: 'Free tools for everyone. Build, create, share.',
  },
  icons: { icon: '/favicon.ico' },
  keywords: [
    'ping world',
    'ping wrld',
    'ping platform',
    'ping',
    'anonymous messaging',
    'anonymous message',
    'url shortener',
    'quiz builder',
    'image toolkit',
    'creator hub',
    'free tools',
  ],
};

export const viewport: Viewport = {
  themeColor: "#0A0C1B",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${fontDisplay.variable} ${fontBody.variable} ${fontMono.variable}`}
    >
      <body className="min-h-dvh flex flex-col antialiased">
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#12152E",
              border: "1px solid rgba(92,111,255,0.3)",
              color: "#F8F9FF",
              fontFamily: "var(--font-body)",
            },
          }}
        />
      </body>
    </html>
  );
}
