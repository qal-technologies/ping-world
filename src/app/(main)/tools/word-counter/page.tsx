import { COMPANY } from "@/lib/config/company";
// jules edit: Created Server-side page route wrapper to support dynamic SEO, Open Graph & Twitter Card metadata loading
import type { Metadata } from "next";
import WordCounterClient from "./WordCounterClient";

export const metadata: Metadata = {
  title: "Real-time Word Counter & Readability Analyzer | Ping World",
  description:
    "Analyze text length, counts, character statistics, sentence frequency, read time and overall readability locally. Created by Qal Technologies and developer Pascodez.",
  keywords: [
    "Word Counter",
    "Character Count",
    "Sentence Count",
    "Readability Index Finder",
    "Ping World Word Counter",
    "Qal Technologies"
  ],
  openGraph: {
    title: "Real-time Word Counter & Readability Analyzer | Ping World",
    description: "Analyze text length, counts, character statistics, sentence frequency, read time and overall readability locally.",
    url: `${COMPANY.domain}/tools/word-counter`,
    siteName: "Ping World",
  },
  twitter: {
    card: "summary_large_image",
    title: "Real-time Word Counter & Readability Analyzer | Ping World",
    description: "Analyze text length, counts, character statistics, sentence frequency, read time and overall readability locally.",
  }
};

export default function WordCounterPage() {
  return <WordCounterClient />;
}
