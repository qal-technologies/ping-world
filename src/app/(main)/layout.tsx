'use client';

import {
  Navbar,
  Footer,
  PageLayoutProvider,
  usePageLayout,
} from '@/components/layout';
import { AppProvider } from '@/context/AppContext';
import { cn } from '@/lib/utils';

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { hideNavbar, hideFooter, paddingTop } = usePageLayout();

  return (
    <>
      {!hideNavbar && <Navbar />}
      <main className={cn('flex-1 transition-all duration-300', paddingTop)}>
        {children}
      </main>
      {!hideFooter && <Footer />}
    </>
  );
}

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppProvider>
      <PageLayoutProvider>
        <LayoutContent>{children}</LayoutContent>
      </PageLayoutProvider>
    </AppProvider>
  );
}
