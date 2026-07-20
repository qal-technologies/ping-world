
import type {Metadata} from "next";
import AboutClient from "./AboutClient";

export const metadata: Metadata = {
  title: "About",
  description:
    "Ping World is a browser-native creator and utility platform built for everyone - free where it matters, premium where it counts. Operated by Qal Technologies.",
  keywords: ["About Ping World", "Qal Technologies", "Poshcodes", "Creator Tools", "Privacy-First Platform"]
};

export default function AboutPage () {
  return (
    <AboutClient />
  );
}