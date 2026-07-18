// jules edit: Created professional Terms of Service page for Ping World, detailing acceptable use, client-side safety, and ownership terms.
import type { Metadata } from "next";
import Link from "next/link";
import { Scale, FileText, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Terms of Service | Ping World",
  description:
    "Review our standard terms of use and acceptable services guidelines. Operated by Qal Technologies.",
  keywords: ["Terms of Use", "Privacy Agreement", "User Consent", "Qal Technologies"]
};

export default function TermsPage() {
  return (
    <div className="container mx-auto px-6 py-12 max-w-4xl pb-32">
      <div className="space-y-4 mb-10 text-center md:text-left">
        <div className="badge mb-2">
          <Scale className="h-3.5 w-3.5" />
          Legal Suite
        </div>
        <h1 className="text-4xl font-extrabold font-display leading-tight">
          Terms of <span className="gradient-text">Service.</span>
        </h1>
        <p className="text-pw-muted text-sm font-semibold uppercase tracking-wider">
          Effective Date: January 1, 2025
        </p>
      </div>

      <Card className="p-8 border-white/5 bg-white/[0.01] space-y-8 text-pw-muted text-sm leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-pw-text flex items-center gap-2">
            <CheckCircle className="h-4.5 w-4.5 text-pw-primary" /> 1. Agreement to Terms
          </h2>
          <p>
            By accessing or using Ping World (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), a platform proudly operated by{" "}
            <Link href="https://qal-tech.website" target="_blank" className="font-bold text-pw-primary hover:underline">
              Qal Technologies
            </Link>
            , you agree to be bound by these Terms of Service. If you do not agree, please do not use our services.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-pw-text flex items-center gap-2">
            <CheckCircle className="h-4.5 w-4.5 text-pw-primary" /> 2. Intellectual Property
          </h2>
          <p>
            All custom graphics, source interfaces, and documentation layout logic reside as intellectual property owned by Qal Technologies and engineered by Pascodez. Users are granted a limited license to execute and share standard utilities for creative or personal output.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-pw-text flex items-center gap-2">
            <CheckCircle className="h-4.5 w-4.5 text-pw-primary" /> 3. Client-Side Execution Safety
          </h2>
          <p>
            Many of our tools (e.g. Secure Encryption, Color Palette extraction, offline Notes) execute entirely inside your local browser memory space. We do not inspect, intercept, or store content processed in these modules. Users assume full responsibility for maintaining back-ups of their local content.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-pw-text flex items-center gap-2">
            <CheckCircle className="h-4.5 w-4.5 text-pw-primary" /> 4. Prohibited Uses
          </h2>
          <p>
            You agree not to manipulate or reverse-engineer our secure proxy endpoints, distribute malicious assets through our sharing link parameters, or abuse our anonymous message delivery limits.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-pw-text flex items-center gap-2">
            <CheckCircle className="h-4.5 w-4.5 text-pw-primary" /> 5. Liability Disclaimer
          </h2>
          <p>
            OUR PLATFORM SERVICES ARE PROVIDED ON AN &quot;AS-IS&quot; AND &quot;AS-AVAILABLE&quot; DISCRETION WITHOUT ANY EXPLICIT WARRANTIES. QAL TECHNOLOGIES SHALL NOT ASSUME LIABILITY FOR DATA DELETIONS OR SECURITY INCIDENTS BEYOND CLIENT-SIDE CONTROL.
          </p>
        </section>

        <section className="space-y-3 pt-6 border-t border-white/5">
          <p className="text-xs text-center text-pw-muted">
            Have inquiries regarding standard regulatory terms? Get in touch via email at{" "}
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
