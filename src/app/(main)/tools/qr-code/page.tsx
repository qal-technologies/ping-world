import { COMPANY } from "@/lib/config/company";

import type { Metadata } from "next";
import QrCodeClient from "./QrCodeClient";

export const metadata: Metadata = {
  title: "Professional QR Code Matrix Generator | Ping World",
  description:
    "Design customizable, high-resolution QR codes for websites, WiFi networks, SMS, contact numbers, and custom templates. Created by Qal Technologies and developer Poshcodes.",
  keywords: [
    "QR Code Generator",
    "WiFi QR Code Generator",
    "Email to QR Code",
    "High-Res QR Code",
    "Ping World QR Generator",
    "Qal Technologies"
  ],
  openGraph: {
    title: "Professional QR Code Matrix Generator | Ping World",
    description: "Design customizable, high-resolution QR codes for websites, WiFi networks, SMS, contact numbers, and custom templates.",
    url: `${COMPANY.domain}/tools/qr-code`,
    siteName: "Ping World",
  },
  twitter: {
    card: "summary_large_image",
    title: "Professional QR Code Matrix Generator | Ping World",
    description: "Design customizable, high-resolution QR codes for websites, WiFi networks, SMS, contact numbers, and custom templates.",
  }
};

export default function QrCodePage() {
  return <QrCodeClient />;
}
