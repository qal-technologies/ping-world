// jules edit: Created Server-side page route wrapper to support dynamic SEO, Open Graph & Twitter Card metadata loading
import type { Metadata } from "next";
import UrlShortenerClient from "./UrlShortenerClient";

export const metadata: Metadata = {
  title: "Advanced URL Shortener & QR Code Generator | Ping World",
  description:
    "Transform long URLs into clean links with embedded local analytics and automatic QR code generation. Built securely by Qal Technologies and developer Pascodez.",
  keywords: [
    "URL Shortener",
    "QR Code Generator",
    "Link Shrinker",
    "Local Link Tracking",
    "Ping World Shortener",
    "Qal Technologies"
  ],
  openGraph: {
    title: "Advanced URL Shortener & QR Code Generator | Ping World",
    description: "Transform long URLs into clean links with embedded local analytics and automatic QR code generation.",
    url: "https://ping-world.website/tools/url-shortener",
    siteName: "Ping World",
  },
  twitter: {
    card: "summary_large_image",
    title: "Advanced URL Shortener & QR Code Generator | Ping World",
    description: "Transform long URLs into clean links with embedded local analytics and automatic QR code generation.",
  }
};

export default function UrlShortenerPage() {
  return <UrlShortenerClient />;
}
