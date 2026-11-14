import { HeroSection, ToolsGrid, CTASection } from "@/components/shared/landing-sections";
import FeedbackWidget from "@/components/shared/FeedbackWidget";
import type {Metadata} from "next";

export const metadata:Metadata = {
  title: "Ping World - Your world of tools.",
  description:
  'Ping World is an all-in-one utility and creator platform, featuring PDF tools, image editing toolkit, quiz builder, anonymous messaging, URL shortening, content creation, and more.',
  keywords: [
    "Ping World",
    "Quiz Generator",
    "AI Composer",
    "Anonymous Messaging",
    "Content Editing",
    "Link Shortener",
    "Basic Alley LLC"
  ],
  alternates: {
    canonical:'/'
  }
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
