import { HeroSection, ToolsGrid, CTASection } from "@/components/shared/landing-sections";

const metadata = {
  title: 'Ping World',
  description:
    'Ping World is a utility platform that is feature packed with Quiz Generator, AI Composer, Anonymous Messaging, Content Editing, Link Shortener and many more tools.',
  keywords: ['Ping World', 'Quiz Generator', 'AI Composer', 'Anonymous Messaging', 'Content Editing', 'Link Shortener', 'trending', 'trend', 'qal tech', 'qal technologies', 'pingwrld', 'pingworld'],

};
export default function HomePage() {
  return (
    <>
      <HeroSection />
      <ToolsGrid />
      <CTASection />
    </>
  );
}
