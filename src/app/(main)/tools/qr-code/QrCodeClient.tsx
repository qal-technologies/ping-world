'use client';

import { useState, useEffect } from 'react';
import SimilarTools from '@/components/shared/SimilarTools';
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
  Check,
  Phone,
  MessageSquare,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';

export default function QrCodeGeneratorPage() {
  const [data, setData] = useState('');
  const [qrType, setQrType] = useState('url');
  const [fgColor, setFgColor] = useState('#4500bbff');
  const [bgColor, setBgColor] = useState('transparent');
  const [isCopied, setIsCopied] = useState(false);

  const [wifiSsid, setWifiSsid] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [wifiEncryption, setWifiEncryption] = useState('WPA');
  const [wifiHidden, setWifiHidden] = useState(false);
  const [showWifiPassword, setShowWifiPassword] = useState(false);

  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  const [smsPhone, setSmsPhone] = useState('');
  const [smsMessage, setSmsMessage] = useState('');

  const [phoneNumber, setPhoneNumber] = useState('');

  useEffect(() => {
    if (qrType === 'wifi') {
      const encryption = wifiEncryption === 'nopass' ? '' : wifiEncryption;
      const hiddenStr = wifiHidden ? 'H:true;' : '';
      const passStr = encryption ? `P:${wifiPassword};` : '';
      setData(`WIFI:S:${wifiSsid};T:${encryption};${passStr}${hiddenStr};`);
    } else if (qrType === 'mail') {
      const subjectParam =
        emailSubject ? `?subject=${encodeURIComponent(emailSubject)}` : '';
      const bodyParam =
        emailBody ?
          `${subjectParam ? '&' : '?'}body=${encodeURIComponent(emailBody)}`
        : '';
      setData(`mailto:${emailTo}${subjectParam}${bodyParam}`);
    } else if (qrType === 'sms') {
      setData(`SMSTO:${smsPhone}:${smsMessage}`);
    } else if (qrType === 'phone') {
      setData(`tel:${phoneNumber}`);
    }
  }, [
    qrType,
    wifiSsid,
    wifiPassword,
    wifiEncryption,
    wifiHidden,
    emailTo,
    emailSubject,
    emailBody,
    smsPhone,
    smsMessage,
    phoneNumber,
  ]);

  const handleReset = () => {
    setData('');
    setWifiSsid('');
    setWifiPassword('');
    setWifiEncryption('WPA');
    setWifiHidden(false);
    setEmailTo('');
    setEmailSubject('');
    setEmailBody('');
    setSmsPhone('');
    setSmsMessage('');
    setPhoneNumber('');
    toast.success('Generator fields reset!');
  };

  const handleDownload = () => {
    if (!data) return;
    const svg = document.getElementById('qr-svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width + 40;
      canvas.height = img.height + 40;
      if (ctx) {
        ctx.fillStyle = bgColor === 'transparent' ? '#ffffff00' : bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 20, 20);
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = 'pingworld-qr-code.png';
        downloadLink.href = pngFile;
        downloadLink.click();
      }
    };

    img.src =
      'data:image/svg+xml;base64,' +
      btoa(unescape(encodeURIComponent(svgData)));
  };

  const copyToClipboard = () => {
    if (!data) {
      toast.error('No QR data to copy!');
      return;
    }
    navigator.clipboard.writeText(data);
    setIsCopied(true);
    toast.success('QR data copied to clipboard!');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!data) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'PingWorld QR Code',
          text: `Scan or use this QR Code Data: ${data}`,
          url: window.location.href,
        });
        toast.success('Shared successfully!');
      } catch {
        toast.error('Sharing cancelled or failed');
      }
    } else {
      navigator.clipboard.writeText(data);
      toast.success(
        'Share not supported in this browser. QR data copied instead!',
      );
    }
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
        <div className='sm:flex gap-3 hidden'>
          <Button
            variant='outline'
            onClick={handleReset}
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
          <Card className='bg-transparent ring-0 sm:ring-1 sm:card-glow sm:p-6'>
            <Tabs
              defaultValue='url'
              onValueChange={(val) => {
                setQrType(val);
                setData('');
              }}
              className='w-full flex flex-col max-w-[700px]'>
              <TabsList
                className='flex bg-white/5 mb-8 gap-2 px-1 min-h-10 w-full sm:min-w-full rounded-full gap-1 overflow-x-auto'
                style={{
                  placeSelf: 'center',
                  justifyContent: 'flex-start',
                  scrollbarWidth: 'none',
                }}>
                <TabsTrigger
                  value='url'
                  className='gap-1.5 h-8 text-xs rounded-full px-4'>
                  <Type className='h-3.5 w-3.5' /> URL
                </TabsTrigger>
                <TabsTrigger
                  value='text'
                  className='gap-1.5 h-8 text-xs rounded-full px-4'>
                  <FileText className='h-3.5 w-3.5' /> Text
                </TabsTrigger>
                <TabsTrigger
                  value='wifi'
                  className='gap-1.5 h-8 text-xs rounded-full px-4'>
                  <Wifi className='h-3.5 w-3.5' /> WiFi
                </TabsTrigger>
                <TabsTrigger
                  value='mail'
                  className='gap-1.5 h-8 text-xs rounded-full px-4'>
                  <Mail className='h-3.5 w-3.5' /> Email
                </TabsTrigger>
                <TabsTrigger
                  value='sms'
                  className='gap-1.5 h-8 text-xs rounded-full px-4'>
                  <MessageSquare className='h-3.5 w-3.5' /> SMS
                </TabsTrigger>
                <TabsTrigger
                  value='phone'
                  className='gap-1.5 h-8 text-xs rounded-full px-4'>
                  <Phone className='h-3.5 w-3.5' /> Phone
                </TabsTrigger>
              </TabsList>

              <div className='space-y-6 px-1 '>
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
                    className='bg-white/5 border-white/10 h-10 focus:border-pw-primary'
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
                  <div className='space-y-3'>
                    <div>
                      <label className='text-xs font-bold text-pw-muted uppercase block mb-1'>
                        Network Name (SSID)
                      </label>
                      <Input
                        value={wifiSsid}
                        onChange={(e) => setWifiSsid(e.target.value)}
                        placeholder='My Home WiFi'
                        className='bg-white/5 border-white/10 h-10'
                      />
                    </div>
                    {wifiEncryption !== 'nopass' && (
                      <div>
                        <label className='text-xs font-bold text-pw-muted uppercase block mb-1'>
                          Password
                        </label>
                        <div className='relative'>
                          <Input
                            type={showWifiPassword ? 'text' : 'password'}
                            value={wifiPassword}
                            onChange={(e) => setWifiPassword(e.target.value)}
                            placeholder='••••••••'
                            className='bg-white/5 border-white/10 h-10 pr-10'
                          />
                          <button
                            type='button'
                            onClick={() =>
                              setShowWifiPassword(!showWifiPassword)
                            }
                            className='absolute right-3 top-1/2 -translate-y-1/2 text-pw-muted hover:text-pw-text transition-colors'>
                            {showWifiPassword ?
                              <EyeOff className='h-4 w-4' />
                            : <Eye className='h-4 w-4' />}
                          </button>
                        </div>
                      </div>
                    )}
                    <div className='grid grid-cols-2 gap-4'>
                      <div>
                        <label className='text-xs font-bold text-pw-muted uppercase block mb-1'>
                          Encryption
                        </label>
                        <select
                          value={wifiEncryption}
                          onChange={(e) => setWifiEncryption(e.target.value)}
                          className='w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm focus:border-pw-primary focus:outline-none h-10 appearance-none cursor-pointer'>
                          <option
                            value='WPA'
                            className='bg-pw-surface'>
                            WPA/WPA2
                          </option>
                          <option
                            value='WEP'
                            className='bg-pw-surface'>
                            WEP
                          </option>
                          <option
                            value='nopass'
                            className='bg-pw-surface'>
                            No Password
                          </option>
                        </select>
                      </div>
                      <div className='flex flex-col justify-end pb-3'>
                        <label className='flex items-center gap-2 cursor-pointer select-none text-sm text-pw-muted font-bold uppercase'>
                          <input
                            type='checkbox'
                            checked={wifiHidden}
                            onChange={(e) => setWifiHidden(e.target.checked)}
                            className='rounded border-white/10 bg-white/5 h-4 w-4 text-pw-primary accent-pw-primary'
                          />
                          Hidden Network
                        </label>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent
                  value='mail'
                  className='space-y-4 m-0'>
                  <div className='space-y-3'>
                    <div>
                      <label className='text-xs font-bold text-pw-muted uppercase block mb-1'>
                        Recipient Email
                      </label>
                      <Input
                        type='email'
                        value={emailTo}
                        onChange={(e) => setEmailTo(e.target.value)}
                        placeholder='recipient@example.com'
                        className='bg-white/5 border-white/10 h-h-10'
                      />
                    </div>
                    <div>
                      <label className='text-xs font-bold text-pw-muted uppercase block mb-1'>
                        Subject
                      </label>
                      <Input
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        placeholder='Inquiry/Feedback'
                        className='bg-white/5 border-white/10 h-10'
                      />
                    </div>
                    <div>
                      <label className='text-xs font-bold text-pw-muted uppercase block mb-1'>
                        Message Body
                      </label>
                      <textarea
                        value={emailBody}
                        onChange={(e) => setEmailBody(e.target.value)}
                        placeholder='Type your email body...'
                        className='w-full h-24 bg-white/5 border border-white/10 rounded-lg p-3 text-sm focus:border-pw-primary focus:outline-none resize-none'
                      />
                    </div>
                  </div>
                </TabsContent>
                <TabsContent
                  value='sms'
                  className='space-y-4 m-0'>
                  <div className='space-y-3'>
                    <div>
                      <label className='text-xs font-bold text-pw-muted uppercase block mb-1'>
                        Phone Number
                      </label>
                      <Input
                        type='tel'
                        value={smsPhone}
                        onChange={(e) => setSmsPhone(e.target.value)}
                        placeholder='+1 (555) 019-2834'
                        className='bg-white/5 border-white/10 h-10'
                      />
                    </div>
                    <div>
                      <label className='text-xs font-bold text-pw-muted uppercase block mb-1'>
                        Message
                      </label>
                      <textarea
                        value={smsMessage}
                        onChange={(e) => setSmsMessage(e.target.value)}
                        placeholder='Hello, please get in touch!'
                        className='w-full h-24 bg-white/5 border border-white/10 rounded-lg p-3 text-sm focus:border-pw-primary focus:outline-none resize-none'
                      />
                    </div>
                  </div>
                </TabsContent>
                <TabsContent
                  value='phone'
                  className='space-y-4 m-0'>
                  <div>
                    <label className='text-xs font-bold text-pw-muted uppercase block mb-1'>
                      Phone Number
                    </label>
                    <Input
                      type='tel'
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder='+1 (555) 019-2834'
                      className='bg-white/5 border-white/10 h-10'
                    />
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </Card>

          <div className='divider sm:hidden' />

          <Card className='bg-transparent ring-0 sm:ring-1 sm:card-glow sm:p-6 space-y-8  mt-10 sm:mt-0'>
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
        <div className='divider sm:hidden' />

        {/* Preview Area */}
        <div className='lg:col-span-5 flex flex-col gap-6'>
          {data && (
            <Card className='bg-transparent sm:card-glow sm:p-8 sm:bg-pw-surface/50 flex flex-col items-center justify-center min-h-[400px] ring-0 sm:ring-1 mt-10 sm:mt-0'>
              <div className='relative group'>
                <div className='absolute -inset-8 bg-pw-primary/20 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity' />
                <div className='relative p-4 bg-white rounded-3xl shadow-[0_0_50px_rgba(92,111,255,0.3)]'>
                  {data ?
                    <QRCodeSVG
                      id='qr-svg'
                      value={data}
                      style={{ background: bgColor }}
                      size={250}
                      includeMargin={false}
                      fgColor={fgColor}
                      bgColor={bgColor}
                    />
                  : <div className='w-[250px] h-[250px] flex items-center justify-center border-2 border-dashed border-pw-primary/20 rounded-xl bg-pw-primary/5'>
                      <QrCode className='h-14 w-14 text-pw-primary/30 animate-pulse' />
                    </div>
                  }
                </div>
              </div>

              <div className='mt-12 w-full space-y-4'>
                <div className='flex gap-3'>
                  <Button
                    onClick={copyToClipboard}
                    variant='outline'
                    disabled={!data}
                    className='flex-1 border-white/10 hover:bg-white/5 h-10 gap-2'>
                    {isCopied ?
                      <Check className='h-4 w-4' />
                    : <Settings2 className='h-4 w-4' />}
                    Copy Data
                  </Button>
                  <Button
                    disabled={!data}
                    onClick={handleShare}
                    className='flex-1 btn-primary h-10 gap-2'>
                    <Share2 className='h-4 w-4' /> Share QR
                  </Button>
                </div>
                <div className='gap-3 flex flex-wrap'>
                  <Button
                    variant='outline'
                    title='Reset QR code'
                    disabled={!data}
                    onClick={handleReset}
                    className='bg-white/5 border-white/10 hover:bg-white/10 gap-2 rounded-full h-11 px-4'>
                    <RefreshCw className='h-4 w-4' />
                  </Button>
                  <Button
                    onClick={handleDownload}
                    disabled={!data}
                    title='Download QR code png'
                    className=' rounded-full hover:scale-[1.05] bg-pw-primary flex-1 gap-2 h-11 px-8'>
                    <Download className='h-4 w-4' /> Download PNG
                  </Button>
                </div>
              </div>
            </Card>
          )}

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

      <SimilarTools currentToolId="qr-code" />
    </div>
  );
}
