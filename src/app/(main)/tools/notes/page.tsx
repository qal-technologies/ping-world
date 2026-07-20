import { COMPANY } from "@/lib/config/company";

import type { Metadata } from "next";
import NotesClient from "./NotesClient";

export const metadata: Metadata = {
  title: "Text Notes",
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
    title: "Text Notes | Ping World",
    description: "Keep local-first offline text notes categorized, searchable, and fully secured on your device. Backup to cloud seamlessly.",
    url: `${COMPANY.domain}/tools/notes`,
    siteName: "Ping World",
  },
  twitter: {
    card: "summary_large_image",
    title: "Text Notes | Ping World",
    description: "Keep local-first offline text notes categorized, searchable, and fully secured on your device. Backup to cloud seamlessly.",
  }
};

export default function NotesPage() {
  return <NotesClient />;
}
