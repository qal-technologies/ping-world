// jules edit: Created PageLayoutContext to dynamically manage Navbar, Footer visibility, and padding-top Tailwind classes.
"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { usePathname } from "next/navigation";

interface PageLayoutContextType {
  hideNavbar: boolean;
  setHideNavbar: (hide: boolean) => void;
  hideFooter: boolean;
  setHideFooter: (hide: boolean) => void;
  paddingTop: string;
  setPaddingTop: (className: string) => void;
}

const PageLayoutContext = createContext<PageLayoutContextType | undefined>(undefined);

export const PageLayoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hideNavbar, setHideNavbar] = useState(false);
  const [hideFooter, setHideFooter] = useState(false);
  const [paddingTop, setPaddingTop] = useState("pt-16");
  const pathname = usePathname();

  // Reset visibility states on navigation so states do not leak across different routes
  useEffect(() => {
    setHideNavbar(false);
    setHideFooter(false);
    setPaddingTop("pt-16");
  }, [pathname]);

  return (
    <PageLayoutContext.Provider
      value={{
        hideNavbar,
        setHideNavbar,
        hideFooter,
        setHideFooter,
        paddingTop,
        setPaddingTop,
      }}
    >
      {children}
    </PageLayoutContext.Provider>
  );
};

export const usePageLayout = () => {
  const context = useContext(PageLayoutContext);
  if (!context) {
    throw new Error("usePageLayout must be used within a PageLayoutProvider");
  }
  return context;
};
