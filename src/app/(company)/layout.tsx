// jules edit: Created company layout featuring PageLayoutProvider, Navbar, and Footer for base pages like about, terms, and privacy.
"use client";

import { Navbar, Footer, PageLayoutProvider } from "@/components/layout";

export default function CompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PageLayoutProvider>
      <Navbar />
      <main className="flex-1 pt-24 min-h-[70vh]">
        {children}
      </main>
      <Footer />
    </PageLayoutProvider>
  );
}
