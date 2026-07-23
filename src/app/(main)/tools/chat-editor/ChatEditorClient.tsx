
"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  MessageSquare,
  User,
  Send,
  Download,
  Plus,
  Trash2,
  Smile,
  Image as ImageIcon,
  Smartphone,
  ChevronLeft,
  MoreVertical,
  Camera,
  Settings2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import html2canvas from "html2canvas";

// --- Types ---
interface ChatMessage {
  id: string;
  sender: "me" | "them";
  text: string;
  timestamp: string;
}

export default function ChatEditorPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "1", sender: "them", text: "Hey! Did you see the new Ping World update?", timestamp: "12:00 PM" },
    { id: "2", sender: "me", text: "Not yet, what's new?", timestamp: "12:01 PM" },
  ]);
  const [inputText, setInputText] = useState("");
  const [editingName, setEditingName] = useState("Alex");
  const chatRef = useRef<HTMLDivElement>(null);

  const addMessage = (sender: "me" | "them") => {
    if (!inputText.trim()) return;
    const newMessage: ChatMessage = {
      id: Math.random().toString(36).substr(2, 9),
      sender,
      text: inputText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages([...messages, newMessage]);
    setInputText("");
  };

  const removeMessage = (id: string) => {
    setMessages(messages.filter(m => m.id !== id));
  };

  const exportAsImage = async () => {
    if (!chatRef.current) return;
    try {
      // jules edit: Add CORS and allowTaint to prevent canvas taint issues
      const canvas = await html2canvas(chatRef.current, {
        backgroundColor: "#F1F5F9", // Light slate for "device" background
        useCORS: true,
        allowTaint: true
      });
      const link = document.createElement("a");
      link.download = `pingworld-chat-${editingName.toLowerCase()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Chat exported as image!");
    } catch (err) {
      toast.error("Export failed. Please try again.");
    }
  };

  return (
    <div className="container mx-auto px-6 py-12 max-w-7xl min-h-[calc(100vh-64px)] pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <div className="badge mb-4">
            <MessageSquare className="h-3.5 w-3.5" />
            Chat Mimic
          </div>
          <h1 className="text-4xl font-extrabold font-display leading-[1.1]">Chat <span className="gradient-text">Editor.</span></h1>
          <p className="mt-2 text-pw-muted font-medium">Create realistic chat conversations for stories and social content.</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setMessages([])}
            className="bg-white/5 border-white/10 hover:bg-white/10 gap-2 h-11 px-6"
          >
            <Trash2 className="h-4 w-4" /> Reset
          </Button>
          <Button onClick={exportAsImage} className="btn-primary gap-2 h-11 px-8">
            <Download className="h-4 w-4" /> Export Image
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Editor Side */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="card-glow p-8 space-y-8">
             <div className="space-y-4">
               <label className="text-xs font-bold text-pw-muted uppercase">Chat Settings</label>
               <div className="space-y-2">
                 <label className="text-[10px] text-pw-muted uppercase">Contact Name</label>
                 <Input
                   value={editingName}
                   onChange={(e) => setEditingName(e.target.value)}
                   className="bg-white/5 border-white/10 h-11"
                 />
               </div>
             </div>

             <div className="space-y-4 pt-6 border-t border-white/5">
                <label className="text-xs font-bold text-pw-muted uppercase">Composition</label>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type message content..."
                  className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:border-pw-primary focus:outline-none resize-none"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Button onClick={() => addMessage("them")} variant="outline" className="h-12 border-pw-primary/20 hover:bg-pw-primary/5 text-pw-primary">
                    <User className="h-4 w-4 mr-2" /> From {editingName}
                  </Button>
                  <Button onClick={() => addMessage("me")} className="btn-primary h-12">
                    <Send className="h-4 w-4 mr-2" /> From Me
                  </Button>
                </div>
             </div>
          </Card>

          <div className="space-y-2">
            <label className="text-xs font-bold text-pw-muted uppercase pl-2">Message List</label>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {messages.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl group">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-1 h-8 rounded-full", m.sender === "me" ? "bg-pw-primary" : "bg-pw-secondary")} />
                    <span className="text-xs line-clamp-1">{m.text}</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeMessage(m.id)} className="h-8 w-8 opacity-0 group-hover:opacity-100 hover:text-pw-danger">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Device Preview Side */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center bg-white/5 rounded-[40px] p-8 border border-white/5">
           <div className="text-xs font-bold text-pw-muted uppercase tracking-widest mb-6 flex items-center gap-2">
             <Smartphone className="h-4 w-4" /> Live Device Preview
           </div>

           <div
             ref={chatRef}
             className="w-full max-w-[375px] h-[667px] bg-slate-100 rounded-[50px] shadow-2xl border-[12px] border-slate-900 overflow-hidden flex flex-col text-slate-900"
           >
              {/* Phone Header */}
              <div className="bg-white px-6 pt-12 pb-4 border-b border-slate-200">
                 <div className="flex items-center justify-between">
                    <ChevronLeft className="h-6 w-6 text-blue-500" />
                    <div className="flex flex-col items-center">
                       <div className="h-10 w-10 rounded-full bg-slate-200 mb-1 flex items-center justify-center font-bold text-slate-400">
                         {editingName.slice(0,1)}
                       </div>
                       <span className="text-xs font-bold">{editingName}</span>
                    </div>
                    <MoreVertical className="h-5 w-5 text-blue-500" />
                 </div>
              </div>

              {/* Chat Area */}
              <div className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto bg-[#e5ddd5] chat-texture">
                {messages.map((m) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={cn(
                      "max-w-[75%] p-3 rounded-2xl text-sm relative shadow-sm",
                      m.sender === "me"
                        ? "bg-[#dcf8c6] self-end rounded-tr-none text-slate-800"
                        : "bg-white self-start rounded-tl-none text-slate-800"
                    )}
                  >
                    {m.text}
                    <div className="text-[10px] text-slate-400 text-right mt-1 font-medium">{m.timestamp}</div>
                  </motion.div>
                ))}
              </div>

              {/* Phone Input Bar */}
              <div className="bg-slate-50 px-4 py-4 border-t border-slate-200 flex items-center gap-3">
                 <Plus className="h-6 w-6 text-blue-500" />
                 <div className="flex-1 h-9 rounded-full bg-white border border-slate-200 px-4" />
                 <Camera className="h-6 w-6 text-blue-500" />
                 <Settings2 className="h-6 w-6 text-blue-500" />
              </div>
           </div>

           <div className="mt-8 flex gap-4">
              <Button variant="ghost" className="h-10 text-xs text-pw-muted hover:text-pw-text">
                <Smile className="h-4 w-4 mr-2" /> Add Stickers
              </Button>
              <Button variant="ghost" className="h-10 text-xs text-pw-muted hover:text-pw-text">
                <ImageIcon className="h-4 w-4 mr-2" /> Custom Wallpaper
              </Button>
           </div>
        </div>
      </div>
    </div>
  );
}
