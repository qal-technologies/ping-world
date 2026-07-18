// jules edit: Created Server-side page route wrapper to support dynamic SEO, Open Graph & Twitter Card metadata loading
import type { Metadata } from "next";
import PasswordGenClient from "./PasswordGenClient";

export const metadata: Metadata = {
  title: "Secure Random Password Generator | Ping World",
  description:
    "Instantly generate cryptographically secure, randomized passwords locally inside your browser. No data ever leaves your device. Designed by Qal Technologies and developer Pascodez.",
  keywords: [
    "Password Generator",
    "Secure Key Maker",
    "Crypto Passkey",
    "Local Password Maker",
    "Ping World Password",
    "Qal Technologies"
  ],
  openGraph: {
    title: "Secure Random Password Generator | Ping World",
    description: "Instantly generate cryptographically secure, randomized passwords locally inside your browser. No data ever leaves your device.",
    url: "https://ping-world.website/tools/password-gen",
    siteName: "Ping World",
  },
  twitter: {
    card: "summary_large_image",
    title: "Secure Random Password Generator | Ping World",
    description: "Instantly generate cryptographically secure, randomized passwords locally inside your browser. No data ever leaves your device.",
  }
};

export default function PasswordGeneratorPage() {
  return <PasswordGenClient />;
}
