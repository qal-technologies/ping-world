"use client";

import { motion } from "framer-motion";
import { MessageCircle, Shield, Link as LinkIcon, Send, Share2, Bell, Zap } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function MessageLandingPage() {
  return (
    <div className="relative overflow-hidden min-h-[calc(100vh-64px)] pb-20">
      {/* Background orbs */}
      <div className="orb orb-primary w-[500px] h-[500px] -top-40 -right-40 opacity-20" />
      <div className="orb orb-secondary w-[400px] h-[400px] bottom-0 -left-20 opacity-15" />

      <div className="container relative mx-auto px-6 pt-20">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <div className="badge mb-6">
              <MessageCircle className="h-3.5 w-3.5" />
              AnonLink — Anonymous Messaging
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold font-display leading-tight mb-6">
              Hear the honest truth. <br />
              <span className="gradient-text">Stay anonymous.</span>
            </h1>
            <p className="text-lg text-pw-muted max-w-2xl mx-auto mb-10">
              Get anonymous feedback, questions, and confessions from your friends and followers with a single shareable link.
            </p>
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                          
              <Button size="lg" className="btn-primary px-8 h-12 text-base">
                <Link href="/register">Create Your Link</Link>
              </Button>
              <Button variant="outline" size="lg" className="bg-white/5 border-pw-primary/20 hover:bg-pw-primary/10 h-12 px-8 text-base">
                <Link href="/dashboard">View Your Inbox</Link>
              </Button>
            </div>
          </motion.div>

          {/* How it works */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
            {[
              {
                icon: LinkIcon,
                title: "1. Create Link",
                desc: "Sign up and get your unique Ping World link (e.g., pingworld.fun/u/alex).",
                color: "var(--pw-primary)"
              },
              {
                icon: Share2,
                title: "2. Share Link",
                desc: "Share your link on Instagram, Twitter, or wherever your friends are.",
                color: "var(--pw-secondary)"
              },
              {
                icon: Bell,
                title: "3. Get Messages",
                desc: "Receive anonymous messages in your private dashboard inbox instantly.",
                color: "var(--pw-success)"
              }
            ].map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 + 0.3 }}
              >
                <Card className="card-glow p-6 h-full flex flex-col gap-4">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: `${step.color}15`, border: `1px solid ${step.color}25` }}
                  >
                    <step.icon className="h-6 w-6" style={{ color: step.color }} />
                  </div>
                  <h3 className="text-lg font-bold font-display">{step.title}</h3>
                  <p className="text-pw-muted text-sm leading-relaxed">{step.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Features highlight */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="card-glow p-8 md:p-12 relative overflow-hidden"
          >
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
              <div className="flex-1">
                <h2 className="text-2xl md:text-3xl font-extrabold font-display mb-6">Built for your <span className="gradient-text">privacy.</span></h2>
                <div className="space-y-4">
                  {[
                    { icon: Shield, text: "End-to-end sender anonymity — we never reveal who sent it." },
                    { icon: Send, text: "Real-time delivery with beautiful notifications via Resend." },
                    { icon: Zap, text: "Advanced rate limiting to prevent spam and harassment." }
                  ].map((feat) => (
                    <div key={feat.text} className="flex items-start gap-3">
                      <div className="mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-pw-primary/10 text-pw-primary">
                        <feat.icon className="h-3 w-3" />
                      </div>
                      <p className="text-pw-text/90 text-sm">{feat.text}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="w-full md:w-1/3 flex justify-center">
                <div className="relative">
                  <div className="absolute -inset-4 rounded-full bg-pw-primary/20 blur-2xl animate-pulse-glow" />
                  <div className="relative w-48 h-48 rounded-full gradient-brand flex items-center justify-center shadow-2xl">
                    <MessageCircle className="h-24 w-24 text-white drop-shadow-lg" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
