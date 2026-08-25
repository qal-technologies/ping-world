import { COMPANY } from "@/lib/config/company";

import type { Metadata } from "next";
import { Suspense } from "react";
import CalculatorClient from "./CalculatorClient";

export const metadata: Metadata = {
  title: "Multi Calculator & Converter",
  description:
    "Instantly compute basic math, complex pricing markups, interest finance, currency exchange with global rates, and fluid mass weights. Created by Qal Technologies and developer Pascodez.",
  keywords: [
    "Multi Calculator",
    "Pricing Markup Calculator",
    "Currency Exchange Rates Converter",
    "Interest Finance Calculator",
    "Ping World Calculators",
    "Qal Technologies"
  ],
  openGraph: {
    title: "Multi Calculator & Converter | Ping World",
    description: "Instantly compute basic math, complex pricing markups, interest finance, currency exchange with global rates, and fluid mass weights.",
    url: `${COMPANY.domain}/tools/calculator`,
    siteName: "Ping World",
  },
  twitter: {
    card: "summary_large_image",
    title: "Professional Multi Calculator & Currency Converter | Ping World",
    description: "Instantly compute basic math, complex pricing markups, interest finance, currency exchange with global rates, and fluid mass weights.",
  }
};

export default function CalculatorPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-pw-muted text-xs">Loading Calculator...</div>}>
      <CalculatorClient />
    </Suspense>
  );
}
