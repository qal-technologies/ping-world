
import type { Metadata } from "next";
import CalculatorClient from "./CalculatorClient";

export const metadata: Metadata = {
  title: "Professional Multi Calculator & Currency Converter | Ping World",
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
    title: "Professional Multi Calculator & Currency Converter | Ping World",
    description: "Instantly compute basic math, complex pricing markups, interest finance, currency exchange with global rates, and fluid mass weights.",
    url: "https://ping-world.website/tools/calculator",
    siteName: "Ping World",
  },
  twitter: {
    card: "summary_large_image",
    title: "Professional Multi Calculator & Currency Converter | Ping World",
    description: "Instantly compute basic math, complex pricing markups, interest finance, currency exchange with global rates, and fluid mass weights.",
  }
};

export default function CalculatorPage() {
  return <CalculatorClient />;
}
