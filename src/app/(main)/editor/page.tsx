
import type { Metadata } from "next";
import EditorClient from "./EditorClient";

export const metadata: Metadata = {
  title: "Professional Text Editor & Post Card Maker | Ping World",
  description:
    "Switch seamlessly between rich document editing and modern visual social media post card creation. Provided by Qal Technologies and engineered by Poshcodes.",
  keywords: [
    "Text Editor",
    "Post Card Maker",
    "Social Card Generator",
    "Ping World Editor",
    "Tiptap Editor",
    "Canvas Editor",
    "Qal Technologies"
  ],
  openGraph: {
    title: "Professional Text Editor & Post Card Maker | Ping World",
    description: "Switch seamlessly between rich document editing and modern visual social media post card creation. Provided by Qal Technologies.",
    url: "https://ping-world.website/editor",
    siteName: "Ping World",
  },
  twitter: {
    card: "summary_large_image",
    title: "Professional Text Editor & Post Card Maker | Ping World",
    description: "Switch seamlessly between rich document editing and modern visual social media post card creation. Provided by Qal Technologies.",
  }
};

export default function EditorPage() {
  return <EditorClient />;
}
