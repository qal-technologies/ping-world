import { COMPANY } from "@/lib/config/company";

import type { Metadata } from "next";
import IpLocatorClient from "./IpLocatorClient";

export const metadata: Metadata = {
  title: "Geospatial IP Locator & ISP Tracker | Ping World",
  description:
    "Look up any IP address to find precise physical locations, coordinates, maps, ISP data, and country metadata. Built securely by Qal Technologies and engineered by Poshcodes.",
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
    url: `${COMPANY.domain}/tools/ip-locator`,
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
