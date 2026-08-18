import { HeroSection, ToolsGrid, CTASection } from "@/components/shared/landing-sections";
import FeedbackWidget from "@/components/shared/FeedbackWidget";
import type {Metadata} from "next";

export const metadata:Metadata = {
  title: "Ping World - Your world of tools.",
  description:
    "Ping World is a free, all-in-one utility and creator platform featuring Quiz Builder, AI Post Composer, Anonymous Messaging, rich text editors, image converters, and shorteners.",
  keywords: [
    "Ping World",
    "Quiz Generator",
    "AI Composer",
    "Anonymous Messaging",
    "Content Editing",
    "Link Shortener",
    "Qal Technologies"
  ]
};

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <ToolsGrid />
      {/* <div className="divider h-1" /> */}
      {/* <FeedbackWidget /> */}
      <div className="divider h-1" />
      <CTASection />
    </>
  );
}
