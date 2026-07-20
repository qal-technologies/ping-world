import { COMPANY } from "@/lib/config/company";

import type { Metadata } from "next";
import ChatEditorClient from "./ChatEditorClient";

export const metadata: Metadata = {
  title: "Chat Mimic",
  description:
    "Design and generate realistic chat screenshot visuals dynamically for stories, screenplay layouts, and social media posts. Provided by Qal Technologies and developer Poshcodes.",
  keywords: [
    "Chat Editor",
    "Chat Mimic",
    "Fake Chat Generator",
    "Social Mockups Maker",
    "Ping World Chat Simulator",
    "Qal Technologies"
  ],
  openGraph: {
    title: "Chat Mimic | Ping World",
    description: "Design and generate realistic chat screenshot visuals dynamically for stories, screenplay layouts, and social media posts.",
    url: `${COMPANY.domain}/tools/chat-editor`,
    siteName: "Ping World",
  },
  twitter: {
    card: "summary_large_image",
    title: "Chat Mimic | Ping World",
    description: "Design and generate realistic chat screenshot visuals dynamically for stories, screenplay layouts, and social media posts.",
  }
};

export default function ChatEditorPage() {
  return <ChatEditorClient />;
}
