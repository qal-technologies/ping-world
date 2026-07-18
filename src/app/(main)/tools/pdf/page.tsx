// jules edit: Created Server-side page route wrapper to support dynamic SEO, Open Graph & Twitter Card metadata loading
import type { Metadata } from "next";
import PdfClient from "./PdfClient";

export const metadata: Metadata = {
  title: "PDF Tool Studio - Image to PDF, Merge & Text Extract | Ping World",
  description:
    "Convert images to PDF, compile text-to-pdf, split/merge PDF documents, and extract text streams pure client-side. Built by Qal Technologies and developer Pascodez.",
  keywords: [
    "PDF Converter",
    "Image to PDF",
    "Merge PDF files",
    "PDF Text Extractor",
    "Ping World PDF Studio",
    "Qal Technologies"
  ],
  openGraph: {
    title: "PDF Tool Studio - Image to PDF, Merge & Text Extract | Ping World",
    description: "Convert images to PDF, compile text-to-pdf, split/merge PDF documents, and extract text streams pure client-side.",
    url: "https://ping-world.website/tools/pdf",
    siteName: "Ping World",
  },
  twitter: {
    card: "summary_large_image",
    title: "PDF Tool Studio - Image to PDF, Merge & Text Extract | Ping World",
    description: "Convert images to PDF, compile text-to-pdf, split/merge PDF documents, and extract text streams pure client-side.",
  }
};

export default function PdfPage() {
  return <PdfClient />;
}
