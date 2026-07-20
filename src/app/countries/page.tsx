
import type { Metadata } from "next";
import CountriesClient from "./CountriesClient";

export const metadata: Metadata = {
  title: "Global Country Registry",
  description:
    "Explore worldwide statistics, capitals, currencies, major ethnicities, languages, and populations in-depth. Powered by Qal Technologies and engineered by Poshcodes.",
  keywords: [
    "Country Search",
    "Country Information",
    "Demographics",
    "Population Data",
    "Ping World Countries",
    "Qal Technologies"
  ],
  openGraph: {
    title: "Demographic Matrix & Global Country Registry | Ping World",
    description: "Explore worldwide statistics, capitals, currencies, major ethnicities, languages, and populations in-depth. Powered by Qal Technologies.",
    url: "https://ping-world.website/countries",
    siteName: "Ping World",
  },
  twitter: {
    card: "summary_large_image",
    title: "Demographic Matrix & Global Country Registry | Ping World",
    description: "Explore worldwide statistics, capitals, currencies, major ethnicities, languages, and populations in-depth. Powered by Qal Technologies.",
  }
};

export default function CountriesPage() {
  return <CountriesClient />;
}
