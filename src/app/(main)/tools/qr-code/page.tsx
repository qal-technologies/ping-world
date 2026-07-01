"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { 
  QrCode, 
  Download, 
  Share2, 
  RefreshCw, 
  Settings2, 
  Palette,
  Type,
  FileText,
  Wifi,
  Mail,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { QRCodeSVG } from "qrcode.react";


const metadata = {
  title:"QR Code Generator",
  description:"Generate high-quality, customizable QR codes for any type of data.",
  keywords:["QR Code Generator", "QR Code", "Generator", "Ping World", "pingwrld", "pingworld", "pingwrld qr code", "pingwrld generator", "pingwrld qr code generator", "pingwrld pingworld", "pingwrld pingwrld", 'Ping World', 'pingworld', 'pingwrld', 'qal tech', 'qal technologies', 'trending', 'trend'],
}
export default function QrCodeGeneratorPage() {
  const [data, setData] = useState("");
  const [qrType, setQrType] = useState("url");
  const [fgColor, setFgColor] = useState("#FFFFFF");
  const [bgColor, setBgColor] = useState("transparent");
  const [isCopied, setIsCopied] = useState(false);

  const handleDownload = () => {
    if (!data) return;
    const svg = document.getElementById("qr-svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width + 40;
      canvas.height = img.height + 40;
      if (ctx) {
        ctx.fillStyle = bgColor === "transparent" ? "#0A0C1B" : bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 20, 20);
        const pngFile = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.download = "pingworld-qr-code.png";
        downloadLink.href = pngFile;
        downloadLink.click();
      }
    };
    
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const copyToClipboard = () => {
    // In a real app, we'd copy the image blob, but for now we'll copy the data
    navigator.clipboard.writeText(data);
    setIsCopied(true);
    toast.success("QR data copied!");
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className='container mx-auto px-6 py-12 max-w-5xl min-h-[calc(100vh-64px)] pb-20'>
      <div className='flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12'>
        <div>
          <div className='badge mb-4'>
            <QrCode className='h-3.5 w-3.5' />
            Generator
          </div>
          <h1 className='text-4xl font-extrabold font-display leading-[1.1]'>
            QR <span className='gradient-text'>Matrix.</span>
          </h1>
          <p className='mt-2 text-pw-muted'>
            Generate high-quality, customizable QR codes for any type of data.
          </p>
        </div>
        <div className='flex gap-3'>
          <Button
            variant='outline'
            onClick={() => {
              setData('');
            }}
            className='bg-white/5 border-white/10 hover:bg-white/10 gap-2 h-11 px-6'>
            <RefreshCw className='h-4 w-4' /> Reset
          </Button>
          <Button
            onClick={handleDownload}
            disabled={!data}
            className='btn-primary gap-2 h-11 px-8'>
            <Download className='h-4 w-4' /> Download PNG
          </Button>
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-12 gap-8'>
        {/* Editor Sidebar */}
        <div className='lg:col-span-7 space-y-6'>
          <Card className='card-glow p-8'>
            <Tabs
              defaultValue='url'
              onValueChange={setQrType}
              className='w-full'>
              <TabsList className='grid grid-cols-4 bg-white/5 mb-8'>
                <TabsTrigger
                  value='url'
                  className='gap-2'>
                  <Type className='h-4 w-4' /> URL
                </TabsTrigger>
                <TabsTrigger
                  value='text'
                  className='gap-2'>
                  <FileText className='h-4 w-4' /> Text
                </TabsTrigger>
                <TabsTrigger
                  value='wifi'
                  className='gap-2'>
                  <Wifi className='h-4 w-4' /> WiFi
                </TabsTrigger>
                <TabsTrigger
                  value='mail'
                  className='gap-2'>
                  <Mail className='h-4 w-4' /> Email
                </TabsTrigger>
              </TabsList>

              <div className='space-y-6'>
                <TabsContent
                  value='url'
                  className='space-y-2 m-0'>
                  <label className='text-xs font-bold text-pw-muted uppercase'>
                    Website URL
                  </label>
                  <Input
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                    placeholder='https://example.com'
                    className='bg-white/5 border-white/10 h-12 focus:border-pw-primary'
                  />
                </TabsContent>
                <TabsContent
                  value='text'
                  className='space-y-2 m-0'>
                  <label className='text-xs font-bold text-pw-muted uppercase'>
                    Plain Text
                  </label>
                  <textarea
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                    placeholder='Type anything...'
                    className='w-full h-32 bg-white/5 border border-white/10 rounded-lg p-4 text-sm focus:border-pw-primary focus:outline-none resize-none'
                  />
                </TabsContent>
                <TabsContent
                  value='wifi'
                  className='space-y-4 m-0'>
                  <p className='text-sm text-pw-muted italic'>
                    WiFi helper coming soon...
                  </p>
                  <Input
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                    placeholder='SSID:Password'
                    className='bg-white/5 border-white/10 h-12'
                  />
                </TabsContent>
                <TabsContent
                  value='mail'
                  className='space-y-4 m-0'>
                  <p className='text-sm text-pw-muted italic'>
                    Email helper coming soon...
                  </p>
                  <Input
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                    placeholder='mailto:user@example.com'
                    className='bg-white/5 border-white/10 h-12'
                  />
                </TabsContent>
              </div>
            </Tabs>
          </Card>

          <Card className='card-glow p-8 space-y-8'>
            <h3 className='text-lg font-bold flex items-center gap-2'>
              <Palette className='h-5 w-5 text-pw-primary' /> Appearance
            </h3>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
              <div className='space-y-4'>
                <label className='text-xs font-bold text-pw-muted uppercase'>
                  Foreground Color
                </label>
                <div className='flex gap-2'>
                  <input
                    type='color'
                    value={fgColor}
                    onChange={(e) => setFgColor(e.target.value)}
                    className='h-10 w-10 bg-transparent border-none cursor-pointer'
                  />
                  <Input
                    value={fgColor}
                    onChange={(e) => setFgColor(e.target.value)}
                    className='bg-white/5 border-white/10 h-10'
                  />
                </div>
              </div>
              <div className='space-y-4'>
                <label className='text-xs font-bold text-pw-muted uppercase'>
                  Background Color
                </label>
                <div className='flex gap-2'>
                  <input
                    type='color'
                    value={bgColor === 'transparent' ? '#0A0C1B' : bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className='h-10 w-10 bg-transparent border-none cursor-pointer'
                  />
                  <Input
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className='bg-white/5 border-white/10 h-10'
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Preview Area */}
        <div className='lg:col-span-5 flex flex-col gap-6'>
          <Card className='card-glow p-12 bg-pw-surface/50 flex flex-col items-center justify-center min-h-[400px]'>
            <div className='relative group'>
              <div className='absolute -inset-8 bg-pw-primary/20 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity' />
              <div className='relative p-6 bg-white rounded-3xl shadow-[0_0_50px_rgba(92,111,255,0.3)]'>
                {data ?
                  <QRCodeSVG
                    id='qr-svg'
                    value={data}
                    size={250}
                    includeMargin={false}
                    fgColor={fgColor}
                  />
                : <div className='w-[250px] h-[250px] flex items-center justify-center border-2 border-dashed border-pw-primary/20 rounded-xl bg-pw-primary/5'>
                    <QrCode className='h-12 w-12 text-pw-primary/30 animate-pulse' />
                  </div>
                }
              </div>
            </div>

            <div className='mt-12 w-full space-y-4'>
              <div className='flex gap-3'>
                <Button
                  onClick={copyToClipboard}
                  variant='outline'
                  className='flex-1 border-white/10 hover:bg-white/5 h-12 gap-2'>
                  {isCopied ?
                    <Check className='h-4 w-4' />
                  : <Settings2 className='h-4 w-4' />}
                  Copy Data
                </Button>
                <Button className='flex-1 btn-primary h-12 gap-2'>
                  <Share2 className='h-4 w-4' /> Share QR
                </Button>
              </div>
            </div>
          </Card>

          <div className='bg-pw-primary/5 border border-pw-primary/20 rounded-2xl p-6'>
            <h4 className='text-sm font-bold flex items-center gap-2 mb-2 text-pw-primary'>
              <Settings2 className='h-4 w-4' /> Pro Tip
            </h4>
            <p className='text-xs text-pw-muted leading-relaxed'>
              For best scanning results, maintain high contrast between the
              background and foreground colors.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
