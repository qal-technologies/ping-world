import { COMPANY } from "@/lib/config/company";
import type { Metadata } from "next";
import DashboardClient from "./DashboardClient";

export const metadata: Metadata = {
  title: "Creator Dashboard",
  description:
    "Manage your creative ecosystem, track assessment and quiz metrics, inspect anonymous messages, and manage short links. Part of the Ping World suite powered by Qal Technologies.",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow:false,
    }
 }
};

export default function DashboardPage() {
  return <DashboardClient />;
}
