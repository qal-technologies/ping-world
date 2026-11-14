import { COMPANY } from "@/lib/config/company";

import type { Metadata } from "next";
import EditorClient from "./EditorClient";

export const metadata: Metadata = {
  title: "Text Editor",
  description:
    "Switch seamlessly between rich document editing and modern visual social media post card creation. Provided by Qal Technologies and engineered by Poshcodes.",
  keywords: [
    "Text Editor",
    "Post Card Maker",
    "Social Card Generator",
    "Ping World Editor",
    "Tiptap Editor",
    "Canvas Editor",
    'Ping World',
  ],
  openGraph: {
    title: "Text Editor | Ping World",
    description: "Switch seamlessly between rich document editing and modern visual social media post card creation. Provided by Basic Alley LLC.",
    url: `${COMPANY.domain}/text-editor`,
    siteName: "Ping World",
  },
  twitter: {
    card: "summary_large_image",
    title: "Text Editor| Ping World",
    description: "Switch seamlessly between rich document editing and modern visual social media post card creation. Provided by Basic Alley LLC.",
  },
  alternates: {
    canonical:'/text-editor',
  },
};

export default function EditorPage() {
  return <EditorClient />;
}
