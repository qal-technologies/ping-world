import { COMPANY } from '@/lib/config/company';
import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';
import { fontDisplay, fontBody, fontMono } from '@/lib/fonts';
import { AppProvider } from '@/context/AppContext';
import { AppModalProvider } from '@/components/ui/AppModalProvider';
import { ComposerProvider } from '@/lib/composer/useComposerStore';
import { NetworkStatusBar } from '@/components/layout/NetworkStatusBar';
import './globals.css';
import { PageLayoutProvider } from '@/components/layout';
import { AppFileViewerProvider } from '@/components/shared/AppFileViewer';
import { CookieNotice } from '@/components/layout/CookieNotice';

export const metadata: Metadata = {
  title: {
    default: COMPANY.name,
    template: `%s | ${COMPANY.name}`,
  },
  applicationName: COMPANY.name,
  category: 'Productivity & Utilities',
  classification: 'Web Application',
  publisher: COMPANY.parent.name,
  creator: COMPANY.name,
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  authors: [
    { name: COMPANY.parent.name, url: COMPANY.parent.url },
    { name: COMPANY.name, url: COMPANY.domain },
    { name: COMPANY.developer.name, url: COMPANY.developer.url },
    { name: 'Paschal Ngaoka', url: 'https://pasqal-dev.site' },
  ],
  description:
    'Ping World is an all-in-one utility and creator platform, featuring PDF tools, image editing toolkit, quiz builder, anonymous messaging, URL shortening, content creation, and more.',
  metadataBase: new URL(COMPANY.domain),
  openGraph: {
    type: 'website',
    emails: COMPANY.contactEmail,
    countryName: 'Nigeria',
    siteName: COMPANY.name,
    title: 'Ping World - Your world of tools.',
    description:
      'Explore productivity tools, PDF utilities, Image editing tools, quizzes, anonymous messaging, URL shortener, a full creator hub and creative tools in one place.',
    url: COMPANY.domain,
    images: [{ url: '/images/logo.png', alt: COMPANY.name }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ping World - Your world of tools.',
    description:
      'Explore productivity, content creation and utility tools with Ping World.',
    site: COMPANY.socials.x,
    images: ['/images/logo.png'],
  },
  appleWebApp: {
    capable: true,
    startupImage: '/images/logo.png',
    statusBarStyle: 'default',
    title: COMPANY.name,
  },
  icons: { icon: '/images/logo.png', apple: '/images/logo.png' },
  keywords: [
    'Ping World',
    'Ping World tools',
    'Ping World api',
    'online productivity tools',
    'quiz builder',
    'PDF tool',
    'image editor',
    'image editing tool',
    'URL shortener',
    'QR code generator',
    'QR code maker',
    'anonymous messaging',
    'image toolkit',
    'content creation tools',
    'quiz',
    'quiz taker',
    'social media platform',
    'anonymous',
    'anonymous message',
    'anonymous link',
    'creator hub',
    'ping platform',
    'ping',
    'calculator for finance',
    'currency converter',
    'paid tools',
    'free tools',
  ],
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#0A0C1B',
  colorScheme: 'dark',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const organizationId = `${COMPANY.domain}/#organization`;
  const parentOrganizationId = `${COMPANY.parent.url}/#organization`;

  const appSchema = {
    '@context': 'https://schema.org',

    '@graph': [
      {
        '@type': 'Organization',
        '@id': parentOrganizationId,
        name: COMPANY.parent.name,
        url: COMPANY.parent.url,
      },

      {
        '@type': 'Organization',
        '@id': organizationId,
        name: COMPANY.name,
        url: COMPANY.domain,
        logo: `${COMPANY.domain}/images/logo.png`,
        sameAs: Object.values(COMPANY.socials).filter((s) =>
          s.startsWith('https://'),
        ),
        parentOrganization: {
          '@id': parentOrganizationId,
        },
      },

      {
        '@type': 'WebSite',
        '@id': `${COMPANY.domain}/#website`,
        name: COMPANY.name,
        url: COMPANY.domain,
        inLanguage: 'en',
        publisher: {
          '@id': organizationId,
        },
      },

      {
        '@type': 'WebApplication',
        '@id': `${COMPANY.domain}/#webapplication`,
        name: COMPANY.name,
        url: COMPANY.domain,
        description:
          'A collection of browser-based productivity, content creation, media and utility tools.',
        applicationCategory: 'UtilitiesApplication',
        operatingSystem: 'Web',
        browserRequirements: 'Requires javascript and a modern web browser.',
        creator: {
          '@id': organizationId,
        },
      },

      {
        '@type': 'SoftwareApplication',
        '@id': `${COMPANY.domain}/#application`,
        name: COMPANY.name,
        url: COMPANY.domain,
        description:
          'A collection of browser-based productivity, content creation, media and utility tools.',
        applicationCategory: 'UtilitiesApplication',
        operatingSystem: 'All',
        browserRequirements: 'Requires javascript and a modern web browser.',
        creator: {
          '@id': organizationId,
        },
      },
    ],
  };

  return (
    <html
      lang='en'
      data-scroll-behavior='smooth'
      className={`${fontDisplay.variable} ${fontBody.variable} ${fontMono.variable}`}>
      <head>
        <script
          type='application/ld+json'
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(appSchema).replace(/</g, '\\u003c'),
          }}
        />
      </head>
      <body className='min-h-dvh flex flex-col antialiased'>
        <NetworkStatusBar />
        <CookieNotice />
        <AppProvider>
          <PageLayoutProvider>
            <AppModalProvider>
              <ComposerProvider>
                <AppFileViewerProvider>{children}</AppFileViewerProvider>
              </ComposerProvider>
            </AppModalProvider>
          </PageLayoutProvider>
        </AppProvider>
        <Toaster
          position='bottom-right'
          toastOptions={{
            style: {
              background: 'rgba(41, 49, 106, 0.45)',
              border: '0.5px solid rgba(92,111,255,0.1)',
              backdropFilter: 'blur(10px)',
              color: '#ffff',
              fontFamily: 'var(--font-body)',
              boxShadow: '0px 1px 10px rgba(7, 0, 11, 0.3)',
              borderRadius: '18px',
            },
          }}
        />
      </body>
    </html>
  );
}
