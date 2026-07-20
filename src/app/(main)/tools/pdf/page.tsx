import { COMPANY } from "@/lib/config/company";

import type { Metadata } from "next";
import PdfClient from "./PdfClient";

export const metadata: Metadata = {
  title: "PDF Tool Studio - Image to PDF, Merge & Text Extract | Ping World",
  description:
    "Convert images to PDF, compile text-to-pdf, split/merge PDF documents, and extract text streams pure client-side. Built by Qal Technologies and developer Poshcodes.",
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
    url: `${COMPANY.domain}/tools/pdf`,
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
