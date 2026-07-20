import { COMPANY } from "@/lib/config/company";

import type { Metadata } from "next";
import ColorsClient from "./ColorsClient";

export const metadata: Metadata = {
  title: "Color Tool",
  description:
    "Harmonize colors, extract palettes from images, generate analogous, triadic, and complementary shades instantly. Supported by Qal Technologies and developer Poshcodes.",
  keywords: [
    "Color Palette Generator",
    "Image Color Extractor",
    "Analogous Harmony",
    "Complementary Colors",
    "Ping World Colors",
    "Qal Technologies"
  ],
  openGraph: {
    title: "Color Tool | Ping World",
    description: "Harmonize colors, extract palettes from images, generate analogous, triadic, and complementary shades instantly.",
    url: `${COMPANY.domain}/tools/colors`,
    siteName: "Ping World",
  },
  twitter: {
    card: "summary_large_image",
    title: "Color Tool | Ping World",
    description: "Harmonize colors, extract palettes from images, generate analogous, triadic, and complementary shades instantly.",
  }
};

export default function ColorsPage() {
  return <ColorsClient />;
}
