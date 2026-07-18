// jules edit: Created professional Privacy Policy page for Ping World, detailing cookie declarations, on-device security, and compliance.
import type { Metadata } from "next";
import Link from "next/link";
import { Shield, Eye, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Privacy Policy | Ping World",
  description:
    "Review our standard cookies policy and client-side on-device security guidelines. Operated by Qal Technologies.",
  keywords: ["Privacy Policy", "Data Protection", "No tracking policy", "Qal Technologies"]
};

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-6 py-12 max-w-4xl pb-32">
      <div className="space-y-4 mb-10 text-center md:text-left">
        <div className="badge mb-2">
          <Shield className="h-3.5 w-3.5" />
          Safety Suite
        </div>
        <h1 className="text-4xl font-extrabold font-display leading-tight">
          Privacy <span className="gradient-text">Policy.</span>
        </h1>
        <p className="text-pw-muted text-sm font-semibold uppercase tracking-wider">
          Effective Date: January 1, 2025
        </p>
      </div>

      <Card className="p-8 border-white/5 bg-white/[0.01] space-y-8 text-pw-muted text-sm leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-pw-text flex items-center gap-2">
            <Eye className="h-4.5 w-4.5 text-pw-primary" /> 1. Client-First Privacy Design
          </h2>
          <p>
            At Ping World (operated by{" "}
            <Link href="https://qal-tech.website" target="_blank" className="font-bold text-pw-primary hover:underline">
              Qal Technologies
            </Link>
            ), we hold data security and user privacy as our highest priority. Unlike standard platforms that capture, track, and aggregate files and documents, our utility layout is designed around an offline, client-first structure.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-pw-text flex items-center gap-2">
            <Lock className="h-4.5 w-4.5 text-pw-primary" /> 2. No On-Server Retention
          </h2>
          <p>
            When utilizing our Cryptographic Encryption modules, Color Palette generators, PDF splits, and on-fly calculator conversions, all data is compiled directly in your browser memory space. No raw inputs or encrypted data streams are ever transmitted to or retained on our web servers.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-pw-text flex items-center gap-2">
            <Shield className="h-4.5 w-4.5 text-pw-primary" /> 3. Secure Account Sync
          </h2>
          <p>
            Standard user profile synchronization and saved assess structures are securely managed inside our Supabase database partitions. This provides high-fidelity encryption at rest and in transit.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-pw-text flex items-center gap-2">
            <Eye className="h-4.5 w-4.5 text-pw-primary" /> 4. Cookies Declarations
          </h2>
          <p>
            We only deploy functional, strictly necessary cookies to keep you signed in, check authorization tokens, and keep track of selected user display preferences (e.g. Dark Mode state). No marketing or behavioral advertising cookies are used.
          </p>
        </section>

        <section className="space-y-3 pt-6 border-t border-white/5">
          <p className="text-xs text-center text-pw-muted">
            Have questions about regulatory standards or compliance guidelines? Contact our legal team via email at{" "}
            <Link href="mailto:pingworld.com@gmail.com" className="text-pw-primary hover:underline">
              pingworld.com@gmail.com
            </Link>
            .
          </p>
        </section>
      </Card>
    </div>
  );
}
