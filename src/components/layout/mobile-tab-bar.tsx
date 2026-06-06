"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Wrench, PenTool, LayoutDashboard, User } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", label: "Home", icon: Home },
  { href: "/tools", label: "Tools", icon: Wrench },
  { href: "/create", label: "Create", icon: PenTool },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/settings", label: "Profile", icon: User },
];

export const MobileTabBar = () => {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass md:hidden bkblur">
      <div className="flex items-center justify-around py-2 px-2">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-colors duration-200",
                isActive
                  ? "text-pw-primary"
                  : "text-pw-muted hover:text-pw-text"
              )}
            >
              <tab.icon className={cn("h-5 w-5", isActive && "drop-shadow-[0_0_6px_rgba(92,111,255,0.6)]")} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
