
import type { Metadata } from "next";
import { Suspense } from "react";
import EncryptionClient from "./EncryptionClient";

export const metadata: Metadata = {
  title: "Secure Browser-only Encryption Decryption | Ping World",
  description:
    "Securely encrypt and decrypt messages entirely client-side using robust AES, TripleDES, and RC4 algorithms. Powering private communications with Qal Technologies & Poshcodes.",
  keywords: [
    "AES Encryption",
    "TripleDES Decryption",
    "RC4 Browser Cipher",
    "Cryptographically Secure Link Sharing",
    "Ping World Encryption",
    "Qal Technologies"
  ],
  openGraph: {
    title: "Secure Browser-only Encryption Decryption | Ping World",
    description: "Securely encrypt and decrypt messages entirely client-side using robust AES, TripleDES, and RC4 algorithms. Powered by Qal Technologies.",
    url: "https://ping-world.website/tools/encryption",
    siteName: "Ping World",
  },
  twitter: {
    card: "summary_large_image",
    title: "Secure Browser-only Encryption Decryption | Ping World",
    description: "Securely encrypt and decrypt messages entirely client-side using robust AES, TripleDES, and RC4 algorithms. Powered by Qal Technologies.",
  }
};

export default function EncryptionPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-6 py-24 text-center text-pw-muted">Loading Encryption Suite...</div>}>
      <EncryptionClient />
    </Suspense>
  );
}
