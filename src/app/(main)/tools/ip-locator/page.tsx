// jules edit: Created Server-side page route wrapper to support dynamic SEO, Open Graph & Twitter Card metadata loading
import type { Metadata } from "next";
import IpLocatorClient from "./IpLocatorClient";

export const metadata: Metadata = {
  title: "Geospatial IP Locator & ISP Tracker | Ping World",
  description:
    "Look up any IP address to find precise physical locations, coordinates, maps, ISP data, and country metadata. Built securely by Qal Technologies and engineered by Pascodez.",
  keywords: [
    "IP Locator",
    "GeoIP lookup",
    "ISP tracker",
    "IP coordinates mapping",
    "Ping World Network Tools",
    "Qal Technologies"
  ],
  openGraph: {
    title: "Geospatial IP Locator & ISP Tracker | Ping World",
    description: "Look up any IP address to find precise physical locations, coordinates, maps, ISP data, and country metadata.",
    url: "https://ping-world.website/tools/ip-locator",
    siteName: "Ping World",
  },
  twitter: {
    card: "summary_large_image",
    title: "Geospatial IP Locator & ISP Tracker | Ping World",
    description: "Look up any IP address to find precise physical locations, coordinates, maps, ISP data, and country metadata.",
  }
};

export default function IpLocatorPage() {
  return <IpLocatorClient />;
}
