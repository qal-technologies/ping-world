import { COMPANY } from "@/lib/config/company";

import type { Metadata } from "next";
import ToolsClient from "./ToolsClient";

export const metadata: Metadata = {
  title: "Browse All Tools",
  description:
    "Explore our complete dynamic suite of tools categorized for social engagement, rich content text editing, cryptography security, fast media converters, and dynamic calculations. Powered by Qal Technologies.",
  keywords: [
    "Ping World Tools",
    "Free Utilities",
    "Social Post Builder",
    "Client Ciphers",
    "Interactive Assessments Builder",
    "Qal Technologies"
  ],
  openGraph: {
    title: "Browse All Tools - Utility & Creator Suite | Ping World",
    description: "Explore our complete dynamic suite of tools categorized for social engagement, rich content text editing, cryptography security, fast media converters, and dynamic calculations. Powered by Qal Technologies.",
    url: `${COMPANY.domain}/tools`,
    siteName: "Ping World",
  },
  twitter: {
    card: "summary_large_image",
    title: "Browse All Tools - Utility & Creator Suite | Ping World",
    description: "Explore our complete dynamic suite of tools categorized for social engagement, rich content text editing, cryptography security, fast media converters, and dynamic calculations. Powered by Qal Technologies.",
  }
};

export default function ToolsPage() {
  return <ToolsClient />;
}
