import { COMPANY } from '@/lib/config/company';
import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';
import { fontDisplay, fontBody, fontMono } from '@/lib/fonts';
import { AppProvider } from '@/context/AppContext';
import { ComposerProvider } from '@/lib/composer/useComposerStore';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Ping World',
    template: '%s | Ping World',
  },
  applicationName: 'Ping World',
  category: 'Productivity & Utilities',
  classification: 'Web Application',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  authors: [
    { name: 'Qal Technologies', url: 'https://qal-tech.website' },
    { name: 'Ping World', url: COMPANY.domain },
    { name: 'Pascodez', url: 'https://pascodez.website' },
    { name: 'Paschal Ngaoka', url: 'https://pasqal-dev.website' },
  ],
  creator: 'Qal Technologies',
  description:
    'Ping World is a free, all-in-one utility and creator platform. PDF tools, Image toolkit, Quiz builder, Anonymous messaging, URL shortener, post composer, and more.',
  metadataBase: new URL(COMPANY.domain),
  openGraph: {
    type: 'website',
    emails: 'pingworld.com@gmail.com',
    countryName: 'Nigeria',
    siteName: 'Ping World',
    title: 'Ping World - Your world of tools.',
    description:
      'Free tools for everyone: PDF tool, Image editing tools, social post canvas, Quizzes, URL shortener, and a full creator hub.',
    url: COMPANY.domain,
    images: '/images/logo.png',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ping World - Your world of tools.',
    description: 'Free tools for everyone. Build, create, share.',
    site: COMPANY.domain,
  },
  icons: { icon: '/images/logo.png', apple: '/images/logo.png' },
  keywords: [
    'ping world',
    'ping wrld',
    'free tools',
    'pdf tool',
    'url shortener',
    'anonymous messaging',
    'image editing tool',
    'image toolkit',
    'quiz builder',
    'quiz',
    'quiz taker',
    'social media platform',
    'anonymous',
    'anonymous message',
    'creator hub',
    'ping platform',
    'ping',
  ],
  manifest: '/manifest.json',
  alternates: {
    canonical: '/',
  },
};

export const viewport: Viewport = {
  themeColor: '#0A0C1B',
  colorScheme: 'dark',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang='en'
      className={`${fontDisplay.variable} ${fontBody.variable} ${fontMono.variable}`}>
      <body className='min-h-dvh flex flex-col antialiased'>
        <AppProvider>
          <ComposerProvider>{children}</ComposerProvider>
        </AppProvider>
        <Toaster
          position='bottom-right'
          toastOptions={{
            style: {
              background: '#12152E',
              border: '1px solid rgba(92,111,255,0.3)',
              color: '#F8F9FF',
              fontFamily: 'var(--font-body)',
            },
          }}
        />
      </body>
    </html>
  );
}
