"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trash2, 
  Clock, 
  Flag, 
  Heart, 
  ThumbsUp, 
  Laugh, 
  Inbox,
  Share2,
  Copy,
  ExternalLink,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Mock data
const MOCK_MESSAGES = [
  {
    id: "1",
    content: "Hey! I really love the project you're working on. Keep it up! 🚀",
    timestamp: "2 hours ago",
    reactions: { heart: 2, thumb: 1, laugh: 0 },
    expiresAt: "22h left",
  },
  {
    id: "2",
    content: "When is the next feature update coming? So excited for it!",
    timestamp: "5 hours ago",
    reactions: { heart: 0, thumb: 0, laugh: 0 },
    expiresAt: "19h left",
  },
  {
    id: "3",
    content: "Who is your favorite character in that show we talked about?",
    timestamp: "1 day ago",
    reactions: { heart: 1, thumb: 0, laugh: 3 },
    expiresAt: "Expires in 3 days",
  },
];

export default function InboxDashboardPage() {
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const username = "johndoe"; // This would come from auth
  const profileUrl = `pingworld.fun/u/${username}`;

  const copyUrl = () => {
    navigator.clipboard.writeText(profileUrl);
    toast.success("Link copied to clipboard!");
  };

  const deleteMessage = (id: string) => {
    setMessages(messages.filter(m => m.id !== id));
    toast.success("Message deleted");
  };

  return (
    <div className="container mx-auto px-6 py-12 max-w-5xl">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Left Sidebar - Stats & Link */}
        <div className="w-full md:w-80 flex flex-col gap-6">
          <Card className="card-glow p-6">
            <h2 className="text-lg font-bold font-display mb-4">Your Inbox Link</h2>
            <div className="flex items-center gap-2 p-3 bg-pw-surface rounded-lg border border-white/5 mb-4 group cursor-pointer" onClick={copyUrl}>
              <span className="text-xs text-pw-muted truncate flex-1">{profileUrl}</span>
              <Copy className="h-3.5 w-3.5 text-pw-primary group-hover:scale-110 transition-transform" />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <Button onClick={copyUrl} className="btn-primary flex-1 h-10 px-0 gap-2">
                <Share2 className="h-4 w-4" /> Share
              </Button>
              <Button variant="outline" className="flex-1 h-10 px-0 gap-2 border-pw-primary/20 hover:bg-pw-primary/5">
                <ExternalLink className="h-4 w-4" /> Visit
              </Button>
            </div>
            <div className="divider mb-6" />
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-pw-muted">Total Messages</span>
                <span className="font-bold">{messages.length}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-pw-muted">Unread</span>
                <span className="font-bold text-pw-primary">{messages.length > 0 ? 2 : 0}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-pw-muted">Reactions</span>
                <span className="font-bold">12</span>
              </div>
            </div>
          </Card>

          <Button variant="outline" className="w-full h-12 border-pw-danger/20 text-pw-danger hover:bg-pw-danger/10 hover:border-pw-danger/40 gap-2">
            <Trash2 className="h-4 w-4" /> Clear All Messages
          </Button>
        </div>

        {/* Main Content - Message List */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-8">
            <div className="flex gap-4">
              <button 
                onClick={() => setActiveTab("all")}
                className={cn(
                  "text-sm font-semibold transition-colors relative py-1",
                  activeTab === "all" ? "text-pw-primary" : "text-pw-muted hover:text-pw-text"
                )}
              >
                All Messages
                {activeTab === "all" && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-pw-primary rounded-full" />}
              </button>
              <button 
                onClick={() => setActiveTab("unread")}
                className={cn(
                  "text-sm font-semibold transition-colors relative py-1",
                  activeTab === "unread" ? "text-pw-primary" : "text-pw-muted hover:text-pw-text"
                )}
              >
                Unread
                {activeTab === "unread" && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-pw-primary rounded-full" />}
              </button>
            </div>
          </div>

          <AnimatePresence mode="popLayout">
            {messages.length > 0 ? (
              <div className="space-y-4">
                {messages.map((msg, i) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className="card-glow overflow-hidden group">
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-2 text-[10px] text-pw-muted font-mono uppercase tracking-wider">
                            <Clock className="h-3 w-3" />
                            {msg.timestamp}
                            <span className="text-pw-primary">•</span>
                            {msg.expiresAt}
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-pw-muted hover:text-pw-danger hover:bg-pw-danger/10">
                              <Flag className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteMessage(msg.id)} className="h-8 w-8 text-pw-muted hover:text-pw-danger hover:bg-pw-danger/10">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-pw-text/90 leading-relaxed text-base mb-6">
                          {msg.content}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex gap-2">
                            <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/5 hover:border-pw-primary/30 transition-colors text-xs text-pw-muted hover:text-pw-text">
                              <Heart className="h-3.5 w-3.5" /> {msg.reactions.heart}
                            </button>
                            <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/5 hover:border-pw-primary/30 transition-colors text-xs text-pw-muted hover:text-pw-text">
                              <ThumbsUp className="h-3.5 w-3.5" /> {msg.reactions.thumb}
                            </button>
                            <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/5 hover:border-pw-primary/30 transition-colors text-xs text-pw-muted hover:text-pw-text">
                              <Laugh className="h-3.5 w-3.5" /> {msg.reactions.laugh}
                            </button>
                          </div>
                          <Button variant="link" className="text-xs text-pw-primary h-auto p-0 gap-1 group/btn">
                            Reply <ChevronRight className="h-3 w-3 transition-transform group-hover/btn:translate-x-0.5" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-24 text-center"
              >
                <div className="w-20 h-20 rounded-full bg-pw-surface border border-white/10 flex items-center justify-center mb-6">
                  <Inbox className="h-8 w-8 text-pw-muted" />
                </div>
                <h3 className="text-xl font-bold font-display mb-2">No messages yet</h3>
                <p className="text-pw-muted max-w-sm">
                  Share your link with friends to start receiving anonymous messages!
                </p>
                <Button onClick={copyUrl} className="btn-primary mt-8">
                  Copy Your Link
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
