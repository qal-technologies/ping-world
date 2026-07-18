
import type { Metadata } from "next";
import NotesClient from "./NotesClient";

export const metadata: Metadata = {
  title: "Secure Local Text Notes & Cloud Backup Sync | Ping World",
  description:
    "Keep local-first offline text notes categorized, searchable, and fully secured on your device. Backup to cloud seamlessly. Created by Qal Technologies and developer Poshcodes.",
  keywords: [
    "Offline Notes",
    "Local Text Notes",
    "Markdown Editor",
    "Note Stacking Tracker",
    "Ping World Notes",
    "Qal Technologies"
  ],
  openGraph: {
    title: "Secure Local Text Notes & Cloud Backup Sync | Ping World",
    description: "Keep local-first offline text notes categorized, searchable, and fully secured on your device. Backup to cloud seamlessly.",
    url: "https://ping-world.website/tools/notes",
    siteName: "Ping World",
  },
  twitter: {
    card: "summary_large_image",
    title: "Secure Local Text Notes & Cloud Backup Sync | Ping World",
    description: "Keep local-first offline text notes categorized, searchable, and fully secured on your device. Backup to cloud seamlessly.",
  }
};

export default function NotesPage() {
  return <NotesClient />;
}
