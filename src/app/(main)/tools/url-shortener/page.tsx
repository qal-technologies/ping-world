"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Link as LinkIcon, 
  Scissors, 
  Copy, 
  Check, 
  Share2, 
  ExternalLink, 
  Zap,
  BarChart3,
  Calendar,
  MousePointer2,
  QrCode
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { QRCodeSVG } from "qrcode.react";

const metadata = {
  title: "URL Shortener",
  description: "Transform long, ugly URLs into clean, manageable links with built-in QR codes and click analytics.",
  keywords: ["URL Shortener", "URL", "Shortener", "Ping World", "pingwrld", "pingworld", "pingwrld url", "pingwrld shortener", "pingwrld url shortener", "pingwrld pingworld", "pingwrld pingwrld", 'Ping World', 'pingworld', 'pingwrld', 'qal tech', 'qal technologies', 'trending', 'trend'],
}

interface ShortLink {
  original: string;
  short: string;
  clicks: number;
  createdAt: string;
}

export default function UrlShortenerPage() {
  const [url, setUrl] = useState("");
  const [isShortening, setIsShortening] = useState(false);
  const [result, setResult] = useState<ShortLink | null>(null);
  const [copied, setCopied] = useState(false);

  const handleShorten = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    if (!url.startsWith("http")) {
      return toast.error("Please enter a valid URL starting with http:// or https://");
    }

    setIsShortening(true);
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    const id = Math.random().toString(36).substr(2, 6);
    const shortLink: ShortLink = {
      original: url,
      short: `pingworld.fun/s/${id}`,
      clicks: 0,
      createdAt: new Date().toLocaleDateString(),
    };
    
    setResult(shortLink);
    setIsShortening(false);
    toast.success("Link shortened successfully!");
  };

  const copyToClipboard = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.short);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className='container mx-auto px-6 py-12 max-w-4xl min-h-[calc(100vh-64px)] pb-20'>
      <div className='flex flex-col items-center text-center mb-12'>
        <div className='badge mb-4'>
          <LinkIcon className='h-3.5 w-3.5' />
          Link Tools
        </div>
        <h1 className='text-4xl md:text-5xl font-extrabold font-display leading-[1.1] mb-4'>
          Shorten <span className='gradient-text'>Everything.</span>
        </h1>
        <p className='max-w-xl text-pw-muted text-lg'>
          Transform long, ugly URLs into clean, manageable links with built-in
          QR codes and click analytics.
        </p>
      </div>

      <Card className='bg-transparent ring-0 sm:ring-1 sm:card-glow p-4 mb-12'>
        <form
          onSubmit={handleShorten}
          className='flex flex-row flex-wrap gap-2 sm:gap-4 items-center'>
          <div className='relative flex-1 w-full'>
            <LinkIcon className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-pw-muted' />
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder='Paste your long link here...'
              className='w-full pl-12 h-12 bg-white/5 border-white/10 focus:border-pw-primary rounded-xl'
              disabled={isShortening}
            />
          </div>
          <Button
            type='submit'
            disabled={isShortening || !url}
            className='btn-primary h-11 max-w-[80%] px-4 sm:px-8 rounded-full'>
            {isShortening ?
              <div className='h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin' />
            : <>
                <Scissors className='h-5 w-5' />
              </>
            }
          </Button>
        </form>
      </Card>
      

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className='space-y-8'>
            {/* Result Card */}
            <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
              <Card className='lg:col-span-2 bg-transparent ring-0 sm:ring-1 sm:bg-card sm:card-glow sm:p-8 sm:border-pw-primary/20 sm:bg-pw-primary/5'>
                <div className='flex flex-col gap-6'>
                  <div className='space-y-2'>
                    <label className='text-xs font-bold text-pw-muted uppercase tracking-wider'>
                      Your Short Link
                    </label>
                    <div className='flex items-center gap-2 px-4 p-1 sm:p-4 bg-pw-surface border border-pw-primary/30 rounded-xl'>
                      <span className='text-xl font-bold text-pw-primary flex-1 truncate'>
                        {result.short}
                      </span>
                      <Button
                        size='icon'
                        variant='ghost'
                        onClick={copyToClipboard}
                        className='h-10 w-10 text-pw-primary hover:bg-pw-primary/10'>
                        {copied ?
                          <Check className='h-5 w-5' />
                        : <Copy className='h-5 w-5' />}
                      </Button>
                    </div>
                  </div>

                  <div className='space-y-2'>
                    <label className='text-xs font-bold text-pw-muted uppercase tracking-wider'>
                      Original URL
                    </label>
                    <div className='flex items-center gap-2 text-sm text-pw-muted truncate bg-white/5 p-3 rounded-lg border border-white/5'>
                      <ExternalLink className='h-4 w-4 shrink-0' />
                      <span className='truncate'>{result.original}</span>
                    </div>
                  </div>

                  <div className='flex gap-4 pt-4'>
                    <Button className='btn-primary flex-1 h-12 gap-2'>
                      <Share2 className='h-5 w-5' /> Share Link
                    </Button>
                    <Button
                      variant='outline'
                      className='flex-1 h-12 gap-2 border-white/10 hover:bg-white/5'>
                      <Zap className='h-5 w-5' /> Add Tracker
                    </Button>
                  </div>
                </div>
              </Card>

              <div className='divider sm:hidden my-3'/>

              {/* QR Code Side Card */}
              <Card className='bg-transparent ring-0 sm:ring-1 sm:card-glow sm:p-8 flex flex-col items-center justify-center text-center'>
                <div className='p-4 bg-white rounded-2xl mb-4 shadow-xl'>
                  <QRCodeSVG
                    value={result.short}
                    size={150}
                  />
                </div>
                <h3 className='font-bold mb-2'>QR Code Ready</h3>
                <p className='text-xs text-pw-muted'>
                  Download or share this QR code for easy access.
                </p>
                <div className='mt-4 flex gap-2 w-full'>
                  <Button
                    variant='outline'
                    size='sm'
                    className='flex-1 h-9 border-white/10 text-xs'>
                    Download
                  </Button>
                  <Button
                    variant='ghost'
                    size='sm'
                    className='h-9 w-9 p-0 bg-white/5'>
                    <Share2 className='h-4 w-4' />
                  </Button>
                </div>
              </Card>
            </div>

            {/* Analytics Preview */}
            <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
              <div className='bg-white/5 border border-white/5 p-6 rounded-2xl'>
                <div className='flex justify-between items-center mb-2'>
                  <span className='text-pw-muted text-xs uppercase font-bold'>
                    Total Clicks
                  </span>
                  <MousePointer2 className='h-4 w-4 text-pw-primary' />
                </div>
                <div className='text-2xl font-bold font-mono'>0</div>
              </div>
              <div className='bg-white/5 border border-white/5 p-6 rounded-2xl'>
                <div className='flex justify-between items-center mb-2'>
                  <span className='text-pw-muted text-xs uppercase font-bold'>
                    Best Source
                  </span>
                  <BarChart3 className='h-4 w-4 text-pw-secondary' />
                </div>
                <div className='text-2xl font-bold font-mono'>N/A</div>
              </div>
              <div className='bg-white/5 border border-white/5 p-6 rounded-2xl'>
                <div className='flex justify-between items-center mb-2'>
                  <span className='text-pw-muted text-xs uppercase font-bold'>
                    Created On
                  </span>
                  <Calendar className='h-4 w-4 text-pw-success' />
                </div>
                <div className='text-2xl font-bold font-mono'>
                  {result.createdAt}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
