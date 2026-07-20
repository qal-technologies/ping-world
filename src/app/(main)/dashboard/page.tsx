// jules edit: Created Server-side page route wrapper to support dynamic SEO, Open Graph & Twitter Card metadata loading
import type { Metadata } from "next";
import DashboardClient from "./DashboardClient";

export const metadata: Metadata = {
  title: "Creator Dashboard",
  description:
    "Manage your creative ecosystem, track assessment and quiz metrics, inspect anonymous messages, and manage short links. Part of the Ping World suite powered by Qal Technologies.",
  keywords: [
    "Creator Dashboard",
    "Analytics",
    "Ping World",
    "Qal Technologies",
    "Poshcodes",
    "Quiz Manager",
    "Short Links Tracker",
    "Anonymous Inbox"
  ],
  openGraph: {
    title: "Creator Dashboard | Ping World",
    description: "Manage your creative ecosystem and track your tool performance. Powered by Qal Technologies.",
    url: "https://ping-world.website/dashboard",
    siteName: "Ping World",
  },
  twitter: {
    card: "summary_large_image",
    title: "Creator Dashboard | Ping World",
    description: "Manage your creative ecosystem and track your tool performance. Powered by Qal Technologies.",
  }
};

export default function DashboardPage() {
  return <DashboardClient />;
}
