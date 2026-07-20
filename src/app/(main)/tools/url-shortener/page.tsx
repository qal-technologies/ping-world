import { COMPANY } from "@/lib/config/company";

import type { Metadata } from "next";
import UrlShortenerClient from "./UrlShortenerClient";

export const metadata: Metadata = {
  title: "URL Shortener",
  description:
    "Transform long URLs into clean links with embedded local analytics and automatic QR code generation. Built securely by Qal Technologies and developer Poshcodes.",
  keywords: [
    "URL Shortener",
    "QR Code Generator",
    "Link Shrinker",
    "Local Link Tracking",
    "Ping World Shortener",
    "Qal Technologies"
  ],
  openGraph: {
    title: "URL Shortener | Ping World",
    description: "Transform long URLs into clean links with embedded local analytics and automatic QR code generation.",
    url: `${COMPANY.domain}/tools/url-shortener`,
    siteName: "Ping World",
  },
  twitter: {
    card: "summary_large_image",
    title: "URL Shortener | Ping World",
    description: "Transform long URLs into clean links with embedded local analytics and automatic QR code generation.",
  }
};

export default function UrlShortenerPage() {
  return <UrlShortenerClient />;
}
