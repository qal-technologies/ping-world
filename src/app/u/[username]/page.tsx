"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Shield, Info, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

export default function UserInboxPage() {
  const params = useParams();
  const username = params.username as string;
  
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSending(true);
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    setIsSending(false);
    setIsSent(true);
    toast.success("Message sent anonymously!");
  };

  return (
    <div className="relative min-h-[calc(100vh-64px)] pb-20">
      {/* Background orbs */}
      <div className="orb orb-primary w-[400px] h-[400px] -top-20 -left-20 opacity-15" />
      
      <div className="container relative mx-auto px-6 pt-12 max-w-2xl">
        <AnimatePresence mode="wait">
          {!isSent ? (
            <motion.div
              key="compose"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <div className="flex flex-col items-center mb-10">
                <Avatar className="h-24 w-24 border-4 border-pw-primary/20 mb-4 shadow-xl">
                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`} />
                  <AvatarFallback className="bg-pw-surface text-pw-primary font-bold text-2xl">
                    {username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <h1 className="text-2xl font-bold font-display">Send a message to <span className="text-pw-primary">@{username}</span></h1>
                <p className="text-pw-muted text-sm mt-1">They will never know who sent it.</p>
              </div>

              <Card className="card-glow p-1 overflow-hidden">
                <form onSubmit={handleSubmit} className="flex flex-col">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={`Say something nice to ${username}...`}
                    className="w-full min-h-[200px] p-6 bg-transparent border-none text-pw-text placeholder:text-pw-muted focus:ring-0 resize-none outline-none text-lg"
                    maxLength={500}
                    disabled={isSending}
                  />
                  
                  <div className="flex items-center justify-between px-6 py-4 bg-white/5 border-t border-white/5">
                    <span className="text-xs text-pw-muted font-mono">{message.length}/500</span>
                    <Button 
                      type="submit" 
                      disabled={isSending || !message.trim()}
                      className="btn-primary gap-2 h-11 px-6"
                    >
                      {isSending ? (
                        <>
                          <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Send Anonymous
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Card>

              <div className="mt-8 flex flex-col gap-4">
                <div className="bg-pw-primary/5 border border-pw-primary/10 rounded-xl p-4 flex gap-3 text-sm text-pw-muted">
                  <Shield className="h-5 w-5 text-pw-primary shrink-0" />
                  <p>Your identity is protected. We collect your IP and device fingerprint only for safety and moderation, but it&apos;s never shown to the recipient.</p>
                </div>
                
                <div className="flex items-center justify-center gap-6 mt-4">
                  <div className="flex items-center gap-1.5 text-xs text-pw-muted">
                    <CheckCircle2 className="h-3.5 w-3.5 text-pw-success" />
                    Encrypted
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-pw-muted">
                    <Clock className="h-3.5 w-3.5 text-pw-primary" />
                    Auto-Expiry
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-pw-muted">
                    <Info className="h-3.5 w-3.5 text-pw-secondary" />
                    Free Forever
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-20"
            >
              <div className="relative inline-block mb-10">
                <div className="absolute inset-0 bg-pw-success/20 blur-3xl rounded-full" />
                <div className="relative w-24 h-24 rounded-full bg-pw-success/10 border-2 border-pw-success flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-12 w-12 text-pw-success" />
                </div>
              </div>
              <h2 className="text-3xl font-bold font-display mb-4">Message Sent!</h2>
              <p className="text-pw-muted mb-10 max-w-sm mx-auto">
                Your anonymous message has been delivered to @{username}. You can send another one or create your own link!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button onClick={() => setIsSent(false)} variant="outline" className="h-12 px-8 border-pw-primary/20 hover:bg-pw-primary/5">
                  Send Another
                </Button>
                <Button className="btn-primary h-12 px-8">
                  <Link href="/message">Get Your Own Link</Link>
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
