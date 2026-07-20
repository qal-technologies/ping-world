'use client';

// jules edit: Wrap Layout in ComposerProvider to expose useComposer globally
import {
  Navbar,
  Footer,
  PageLayoutProvider,
  usePageLayout,
} from '@/components/layout';
import { AppProvider } from '@/context/AppContext';
import { ComposerProvider } from '@/lib/composer/useComposerStore';
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
    <PageLayoutProvider>
      <LayoutContent>{children}</LayoutContent>
    </PageLayoutProvider>
  );
}
