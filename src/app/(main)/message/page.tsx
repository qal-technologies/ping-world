import { COMPANY } from "@/lib/config/company";

import type { Metadata } from "next";
import MessageClient from "./MessageClient";

export const metadata: Metadata = {
  title: "Anonymous Messages",
  description:
    "Generate anonymous feedback, secret confessions, questions, and responses with end-to-end sender privacy. Powered by Qal Technologies and developed with Poshcodes.",
  keywords: [
    "Anonymous Messaging",
    "AnonLink",
    "Secret Messages",
    "Ping World",
    "Qal Technologies",
    "Feedback",
    "Social Messaging"
  ],
  openGraph: {
    title: "Anonymous Messages | Ping World",
    description: "Hear the honest truth. Stay anonymous. Safe, secure, and end-to-end private messaging.",
    url: `${COMPANY.domain}/message`,
    siteName: "Ping World",
  },
  twitter: {
    card: "summary_large_image",
    title: "Anonymous Messages | Ping World",
    description: "Hear the honest truth. Stay anonymous. Safe, secure, and end-to-end private messaging.",
  }
};

export default function MessageLandingPage() {
  return <MessageClient />;
}
