'use client';

import { Navbar, Footer, usePageLayout } from '@/components/layout';
import { cn } from '@/lib/utils';
import NotificationPresence from '@/components/notifications/NotificationPresence';
import InAppNotificationToast from '@/components/notifications/InAppNotificationToast';

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { hideNavbar, hideFooter, paddingTop } = usePageLayout();

  return (
    <>
      <NotificationPresence />
      <InAppNotificationToast />
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
  return <LayoutContent>{children}</LayoutContent>;
}
