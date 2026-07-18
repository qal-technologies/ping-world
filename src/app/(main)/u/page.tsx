// jules edit: Created Server-side page route wrapper to support dynamic SEO, Open Graph & Twitter Card metadata loading
import type { Metadata } from "next";
import UserClient from "./UserClient";

export const metadata: Metadata = {
  title: "Account Management | Ping World",
  description:
    "Review your custom profile settings, saved documents, private links, and local tools. Powering content creators across Ping World in tandem with Qal Technologies.",
  keywords: [
    "Profile Hub",
    "Ping World Tools",
    "Qal Technologies",
    "Pascodez",
    "Creator Profile",
    "Interactive Utilities"
  ],
  openGraph: {
    title: "Account Management | Ping World",
    description: "Manage your user account settings, view active links, and handle your secure creator space.",
    url: "https://ping-world.website/u",
    siteName: "Ping World",
  },
  twitter: {
    card: "summary_large_image",
    title: "Account Management | Ping World",
    description: "Manage your user account settings, view active links, and handle your secure creator space.",
  }
};

export default function UserPage() {
  return <UserClient />;
}
