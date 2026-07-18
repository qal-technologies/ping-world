import type { Metadata } from "next";
import Link from "next/link";
import { Zap, Heart, Shield, Award, Users, Globe, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "About Us | Ping World",
  description:
    "Learn about Ping World, a leading free and open creator utility platform. Operated as a proud subsidiary of Qal Technologies.",
  keywords: ["About Ping World", "Qal Technologies", "Poshcodes", "Free Creator Tools", "Open Source Tools"]
};

export default function AboutPage() {
  return (
    <div className="container mx-auto px-6 py-12 max-w-5xl pb-32">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="badge mb-4 inline-flex">
          <Zap className="h-3.5 w-3.5" />
          Our Mission
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold font-display leading-tight mb-6">
          Your world of <span className="gradient-text">free tools.</span>
        </h1>
        <p className="text-pw-muted text-lg leading-relaxed">
          Ping World is an all-in-one utility and interactive creator hub engineered to make advanced digital tools accessible to everyone on earth, completely free of charge.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        <Card className="p-8 border-white/5 bg-white/[0.01] space-y-4">
          <h2 className="text-2xl font-bold font-display text-pw-text">Who We Are</h2>
          <p className="text-sm text-pw-muted leading-relaxed">
            Ping World is operated as a premier subsidiary of{" "}
            <Link href="https://qal-tech.website" target="_blank" className="text-pw-primary font-bold inline-flex items-center gap-1 hover:underline">
              Qal Technologies <ExternalLink className="h-3 w-3" />
            </Link>
            , a pioneering digital solutions group focused on high-efficiency web development and privacy-first software products.
          </p>
          <p className="text-sm text-pw-muted leading-relaxed">
            Designed and conceptualized by visionary engineers like{" "}
            <span className="font-bold text-pw-text">Paschal Ngaoka</span> and developed under the leading brand{" "}
            <span className="font-bold text-pw-primary">Poshcodes</span>, Ping World consolidates dozens of daily utilities into a unified, lightning-fast digital sandbox.
          </p>
        </Card>

        <Card className="p-8 border-white/5 bg-white/[0.01] space-y-4">
          <h2 className="text-2xl font-bold font-display text-pw-text">Our Philosophy</h2>
          <p className="text-sm text-pw-muted leading-relaxed">
            We believe that high-quality web services—like secure end-to-end encryption, PDF compilation, and interactive assessment creators—should never reside behind paywalls or heavy data-tracking algorithms.
          </p>
          <p className="text-sm text-pw-muted leading-relaxed">
            That is why everything on Ping World runs purely client-side inside your browser wherever possible. Your information remains completely yours, secured on your local device.
          </p>
        </Card>
      </div>

      <div className="space-y-8">
        <h2 className="text-3xl font-bold font-display text-center text-pw-text">Our Core Values</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: Shield,
              title: "Absolute Privacy",
              desc: "From client-side ciphers to offline-first notes, your data is yours alone.",
              color: "text-pw-primary bg-pw-primary/10"
            },
            {
              icon: Award,
              title: "Premium Quality",
              desc: "Free doesn't mean cheap. We engineer professional, fast, and gorgeous UI layouts.",
              color: "text-pw-secondary bg-pw-secondary/10"
            },
            {
              icon: Heart,
              title: "Community First",
              desc: "Built in collaboration with creators worldwide to continuously expand daily utilities.",
              color: "text-pw-success bg-pw-success/10"
            }
          ].map((v, idx) => (
            <Card key={idx} className="p-6 border-white/5 bg-white/[0.01] flex flex-col items-center text-center space-y-3">
              <div className={`p-3 rounded-2xl ${v.color}`}>
                <v.icon className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-lg text-pw-text">{v.title}</h3>
              <p className="text-xs text-pw-muted leading-relaxed">{v.desc}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
