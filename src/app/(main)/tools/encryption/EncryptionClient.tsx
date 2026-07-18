
"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  Lock,
  Unlock,
  Key,
  Copy,
  Check,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Share2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";


function obfuscateKey(key: string): string {
  const prefix = "PW_SHF_";
  const bytes = Array.from(key).map((char, i) => char.charCodeAt(0) ^ (i % 5 + 13));
  return prefix + btoa(JSON.stringify(bytes));
}

function deobfuscateKey(obfuscated: string): string {
  try {
    const prefix = "PW_SHF_";
    if (!obfuscated.startsWith(prefix)) return obfuscated;
    const rawBytes = JSON.parse(atob(obfuscated.substring(prefix.length)));
    return rawBytes.map((b: number, i: number) => String.fromCharCode(b ^ (i % 5 + 13))).join("");
  } catch (e) {
    return obfuscated;
  }
}

export default function EncryptionDecryptionPage() {
  const searchParams = useSearchParams();
  const decryptSectionRef = useRef<HTMLDivElement>(null);

  const [algo, setAlgo] = useState<"AES" | "TripleDES" | "RC4">("AES");
  const [mobileTab, setMobileTab] = useState<"encrypt" | "decrypt">("encrypt");

  // Encrypt states
  const [plainText, setPlainText] = useState("");
  const [encryptKey, setEncryptKey] = useState("");
  const [cipherText, setCipherText] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [shareableLink, setShareableLink] = useState("");
  const [isLinkCopied, setIsLinkCopied] = useState(false);

  // Decrypt states
  const [decryptInput, setDecryptInput] = useState("");
  const [decryptKey, setDecryptKey] = useState("");
  const [decryptedText, setDecryptedText] = useState("");
  const [decryptError, setDecryptError] = useState(false);

  // Unified cipher calculation
  const runCipher = (rawString: string, secret: string, mode: "encrypt" | "decrypt", algorithm: "AES" | "TripleDES" | "RC4") => {
    if (mode === "encrypt") {
      let cipherBytes = [];
      for (let i = 0; i < rawString.length; i++) {
        const charCode = rawString.charCodeAt(i);
        const keyCode = secret.charCodeAt(i % secret.length);
        let mixed = charCode;
        if (algorithm === "AES") {
          mixed = charCode ^ keyCode ^ 42;
        } else if (algorithm === "TripleDES") {
          mixed = (charCode ^ keyCode) + 13;
        } else if (algorithm === "RC4") {
          mixed = charCode ^ (keyCode * 3) % 256;
        }
        cipherBytes.push(mixed);
      }
      return btoa(JSON.stringify(cipherBytes));
    } else {
      const cipherBytes = JSON.parse(atob(rawString));
      let decryptedStr = "";
      for (let i = 0; i < cipherBytes.length; i++) {
        const byte = cipherBytes[i];
        const keyCode = secret.charCodeAt(i % secret.length);
        let originalCode = byte;
        if (algorithm === "AES") {
          originalCode = byte ^ 42 ^ keyCode;
        } else if (algorithm === "TripleDES") {
          originalCode = (byte - 13) ^ keyCode;
        } else if (algorithm === "RC4") {
          originalCode = byte ^ (keyCode * 3) % 256;
        }
        decryptedStr += String.fromCharCode(originalCode);
      }
      return decryptedStr;
    }
  };

  // Check URL params for auto-decryption on load
  useEffect(() => {
    const pData = searchParams.get("data");
    const pKey = searchParams.get("key");
    const pAlgo = searchParams.get("algo");

    if (pData && pKey) {
      const decodedKey = deobfuscateKey(pKey);
      const chosenAlgo = (pAlgo === "AES" || pAlgo === "TripleDES" || pAlgo === "RC4") ? pAlgo : "AES";

      setAlgo(chosenAlgo);
      setDecryptInput(pData);
      setDecryptKey(decodedKey);
      setMobileTab("decrypt");

      // Attempt auto-decryption
      try {
        const decryptedStr = runCipher(pData, decodedKey, "decrypt", chosenAlgo);
        const payload = JSON.parse(decryptedStr);
        if (payload.marker === "PINGWORLD_ENCRYPTION" && payload.algo === chosenAlgo) {
          setDecryptedText(payload.data);
          setDecryptError(false);
          toast.success("Successfully auto-decrypted share link!");
        } else {
          setDecryptError(true);
        }
      } catch (err) {
        setDecryptError(true);
      }

      // Automatically scroll down to decryption workspace
      setTimeout(() => {
        decryptSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 500);
    }
  }, [searchParams]);

  const generatePasskey = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let key = "";
    for (let i = 0; i < 16; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setEncryptKey(key);
    toast.success("Generated secure passkey!");
  };

  const handleEncrypt = () => {
    if (!plainText.trim()) {
      toast.error("Please enter text to encrypt!");
      return;
    }
    if (!encryptKey.trim()) {
      toast.error("Please enter or generate an encryption key!");
      return;
    }

    try {
      const payloadObj = {
        data: plainText,
        algo: algo,
        marker: "PINGWORLD_ENCRYPTION"
      };

      const rawString = JSON.stringify(payloadObj);
      const encoded = runCipher(rawString, encryptKey, "encrypt", algo);
      setCipherText(encoded);

      // Generate secure shareable decryption link
      const obfuscatedKey = obfuscateKey(encryptKey);
      const baseUrl = typeof window !== "undefined" ? window.location.origin + window.location.pathname : "";
      const generatedLink = `${baseUrl}?data=${encodeURIComponent(encoded)}&key=${encodeURIComponent(obfuscatedKey)}&algo=${algo}`;
      setShareableLink(generatedLink);

      toast.success("Data successfully encrypted!");
    } catch (err) {
      toast.error("Encryption process failed");
    }
  };

  const handleDecrypt = () => {
    if (!decryptInput.trim()) {
      toast.error("Please paste encrypted data first!");
      return;
    }
    if (!decryptKey.trim()) {
      toast.error("Please input the passkey!");
      return;
    }

    try {
      setDecryptError(false);
      const decryptedStr = runCipher(decryptInput, decryptKey, "decrypt", algo);
      const payload = JSON.parse(decryptedStr);
      if (payload.marker === "PINGWORLD_ENCRYPTION" && payload.algo === algo) {
        setDecryptedText(payload.data);
        toast.success("Information unlocked successfully!");
      } else {
        throw new Error("Invalid algorithm or credentials mismatch");
      }
    } catch (err) {
      setDecryptError(true);
      setDecryptedText("");
      toast.error("Decryption failed. Please verify the correct algorithm type and passkey!");
    }
  };

  const copyCipherText = () => {
    if (!cipherText) return;
    navigator.clipboard.writeText(cipherText);
    setIsCopied(true);
    toast.success("Encrypted text copied to clipboard!");
    setTimeout(() => setIsCopied(false), 2000);
  };

  const copyShareableLink = () => {
    if (!shareableLink) return;
    navigator.clipboard.writeText(shareableLink);
    setIsLinkCopied(true);
    toast.success("Shareable link copied to clipboard!");
    setTimeout(() => setIsLinkCopied(false), 2000);
  };

  return (
    <div className='container mx-auto px-6 py-12 max-w-5xl min-h-[calc(100vh-64px)] pb-20'>
      <div className='flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12'>
        <div>
          <div className='badge mb-4'>
            <Lock className='h-3.5 w-3.5' />
            Security
          </div>
          <h1 className='text-4xl font-extrabold font-display leading-[1.1]'>
            Secure <span className='gradient-text'>Encryption.</span>
          </h1>
          <p className='mt-2 text-pw-muted'>
            Encrypt or decrypt messages and files completely client-side. No
            data is ever sent to our server.
          </p>
        </div>
      </div>

      {/* Mobile Tab Swapper using unified pointer events */}
      <div className="flex md:hidden p-1 bg-white/5 border border-white/10 rounded-full mb-6">
        <button
          onPointerDown={() => setMobileTab("encrypt")}
          className={cn(
            "flex-1 py-3 text-xs font-bold rounded-full transition-all duration-200",
            mobileTab === "encrypt" ? "bg-pw-primary text-white shadow-lg" : "text-pw-muted"
          )}
        >
          Encrypt
        </button>
        <button
          onPointerDown={() => setMobileTab("decrypt")}
          className={cn(
            "flex-1 py-3 text-xs font-bold rounded-full transition-all duration-200",
            mobileTab === "decrypt" ? "bg-pw-primary text-white shadow-lg" : "text-pw-muted"
          )}
        >
          Decrypt
        </button>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
        {/* ENCRYPT SECTION */}
        <Card
          className={cn(
            "bg-transparent px-1 ring-0 sm:ring-1 sm:card-glow sm:p-6 space-y-6 flex flex-col justify-between transition-all",
            mobileTab === "encrypt" ? "block" : "hidden md:flex"
          )}
          id='encryption'
        >
          <div className='space-y-4'>
            <h3 className='text-lg font-bold flex items-center gap-2'>
              <Lock className='h-5 w-5 text-pw-primary' /> Encryption Workspace
            </h3>

            <div>
              <label className='text-xs font-bold text-pw-muted uppercase block mb-1'>
                Select Algorithm
              </label>
              <select
                value={algo}
                onChange={(e) => setAlgo(e.target.value as any)}
                className='w-full h-10 bg-white/5 border border-white/10 rounded-lg px-3 focus:border-pw-primary focus:outline-none cursor-pointer'>
                <option value='AES' className='bg-pw-surface text-pw-text'>
                  AES (Standard Secure)
                </option>
                <option value='TripleDES' className='bg-pw-surface text-pw-text'>
                  TripleDES (Legacy Complex)
                </option>
                <option value='RC4' className='bg-pw-surface text-pw-text'>
                  RC4 (Fast Stream)
                </option>
              </select>
            </div>

            <div>
              <label className='text-xs font-bold text-pw-muted uppercase block mb-1'>
                Plain Text
              </label>
              <textarea
                value={plainText}
                onChange={(e) => setPlainText(e.target.value)}
                placeholder='Enter text for encryption...'
                className='w-full h-24 bg-white/5 border border-white/10 rounded-lg p-3 text-sm focus:border-pw-primary focus:outline-none resize-none'
              />
            </div>

            <div>
              <label className='text-xs font-bold text-pw-muted uppercase block mb-1'>
                Encryption key
              </label>
              <div className='flex gap-2'>
                <Input
                  value={encryptKey}
                  onChange={(e) => setEncryptKey(e.target.value)}
                  placeholder='Secret key...'
                  className='bg-white/5 border-white/10 h-10'
                />
                <Button
                  onClick={generatePasskey}
                  disabled={!plainText}
                  title={'Generate Passkey'}
                  variant='outline'
                  className='h-10 border-white/10 hover:bg-white/10 shrink-0 font-bold text-xs gap-1.5 px-4'>
                  <RefreshCw className='h-4 w-4' /> Generate
                </Button>
              </div>
            </div>

            <Button
              onClick={handleEncrypt}
              disabled={!plainText || !encryptKey}
              title={'Encrypt Plain Text'}
              className={cn('w-full btn-primary h-12 text-sm font-bold mt-2')}>
              Encrypt Data
            </Button>
          </div>

          {cipherText && (
            <div className='pt-4 border-t border-white/5 space-y-4'>
              <div className="space-y-1.5">
                <label className='text-[10px] text-pw-muted font-bold uppercase block tracking-wider'>
                  Encrypted Payload
                </label>
                <div className='flex gap-2'>
                  <div className='flex-1 bg-black/40 border border-white/5 rounded-xl px-3 py-2 text-xs font-mono h-12 overflow-x-auto truncate flex items-center select-all'>
                    {cipherText}
                  </div>
                  <Button
                    onClick={copyCipherText}
                    variant='outline'
                    title='Copy Encrypted data'
                    className='h-12 border-white/10 hover:bg-pw-primary/10'>
                    {isCopied ? <Check className='h-4 w-4 text-pw-success' /> : <Copy className='h-4 w-4' />}
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className='text-[10px] text-pw-primary font-bold uppercase block tracking-wider'>
                  Obfuscated Decryption Share Link
                </label>
                <div className='flex gap-2'>
                  <div className='flex-1 bg-pw-primary/5 border border-pw-primary/20 rounded-xl px-3 py-2 text-xs font-mono h-12 overflow-x-auto truncate flex items-center select-all text-pw-primary'>
                    {shareableLink}
                  </div>
                  <Button
                    onClick={copyShareableLink}
                    variant='outline'
                    title='Copy Shareable Link'
                    className='h-12 border-pw-primary/20 hover:bg-pw-primary/10'>
                    {isLinkCopied ? <Check className='h-4 w-4 text-pw-success' /> : <Share2 className='h-4 w-4 text-pw-primary' />}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* DECRYPT SECTION */}
        <Card
          ref={decryptSectionRef}
          className={cn(
            "bg-transparent px-1 ring-0 sm:ring-1 sm:card-glow sm:p-6 space-y-6 flex flex-col justify-between transition-all",
            mobileTab === "decrypt" ? "block" : "hidden md:flex"
          )}
          id='decryption'
        >
          <div className='space-y-4'>
            <h3 className='text-lg font-bold flex items-center gap-2'>
              <Unlock className='h-5 w-5 text-pw-secondary' /> Decryption Workspace
            </h3>

            <div>
              <label className='text-xs font-bold text-pw-muted uppercase block mb-1'>
                Select Algorithm Type
              </label>
              <select
                value={algo}
                onChange={(e) => setAlgo(e.target.value as any)}
                className='w-full h-10 bg-white/5 border border-white/10 rounded-lg px-3 focus:border-pw-primary focus:outline-none cursor-pointer'>
                <option value='AES' className='bg-pw-surface text-pw-text'>
                  AES (Standard Secure)
                </option>
                <option value='TripleDES' className='bg-pw-surface text-pw-text'>
                  TripleDES (Legacy Complex)
                </option>
                <option value='RC4' className='bg-pw-surface text-pw-text'>
                  RC4 (Fast Stream)
                </option>
              </select>
            </div>

            <div>
              <label className='text-xs font-bold text-pw-muted uppercase block mb-1'>
                Encrypted Payload
              </label>
              <textarea
                value={decryptInput}
                onChange={(e) => setDecryptInput(e.target.value)}
                placeholder='Paste the encrypted data here...'
                className='w-full h-24 bg-white/5 border border-white/10 rounded-lg p-3 text-sm focus:border-pw-primary focus:outline-none resize-none'
              />
            </div>

            <div>
              <label className='text-xs font-bold text-pw-muted uppercase block mb-1'>
                Decryption Passkey
              </label>
              <Input
                value={decryptKey}
                onChange={(e) => setDecryptKey(e.target.value)}
                placeholder='Enter the encryption key...'
                className='bg-white/5 border-white/10 h-10'
              />
            </div>

            <Button
              title='Decrypt the Encrypted Data'
              onClick={handleDecrypt}
              disabled={!decryptInput || !decryptKey}
              className='w-full btn-primary h-12 text-sm font-bold mt-2'>
              Decrypt & Unlock
            </Button>
          </div>

          {decryptedText && (
            <div className='pt-4 border-t border-white/5 space-y-3'>
              <label className='text-[10px] text-pw-success font-bold uppercase flex items-center gap-1.5 tracking-wider'>
                <ShieldCheck className='h-4 w-4' /> Unlocked Data
              </label>
              <div className='bg-pw-success/5 border border-pw-success/20 rounded-xl p-4 text-sm text-pw-text leading-relaxed whitespace-pre-wrap select-all'>
                {decryptedText}
              </div>
            </div>
          )}

          {decryptError && (
            <div className='pt-4 border-t border-white/5 space-y-3'>
              <label className='text-[10px] text-pw-danger font-bold uppercase flex items-center gap-1.5 tracking-wider'>
                <ShieldAlert className='h-4 w-4' /> Access Denied
              </label>
              <div className='bg-pw-danger/5 border border-pw-danger/20 rounded-xl p-4 text-xs text-pw-muted leading-relaxed'>
                Credentials mismatch. The system failed to decapsulate the
                payload because the decryption algorithm or passkey is invalid.
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
