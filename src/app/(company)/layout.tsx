"use client";

import { Navbar, Footer, PageLayoutProvider } from "@/components/layout";

export default function CompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PageLayoutProvider>
      <main className="flex-1 min-h-[70vh]">
        {children}
      </main>
      <Footer />
    </PageLayoutProvider>
  );
}
