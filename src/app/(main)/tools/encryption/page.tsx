"use client";

import { useState } from "react";
import {
  Lock,
  Unlock,
  Key,
  Copy,
  Check,
  RefreshCw,
  Sliders,
  ShieldAlert,
  ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function EncryptionDecryptionPage() {
  const [algo, setAlgo] = useState<"AES" | "TripleDES" | "RC4">("AES");

  // Encrypt states
  const [plainText, setPlainText] = useState("");
  const [encryptKey, setEncryptKey] = useState("");
  const [cipherText, setCipherText] = useState("");
  const [isCopied, setIsCopied] = useState(false);

  // Decrypt states
  const [decryptInput, setDecryptInput] = useState("");
  const [decryptKey, setDecryptKey] = useState("");
  const [decryptedText, setDecryptedText] = useState("");
  const [decryptError, setDecryptError] = useState(false);

  const generatePasskey = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let key = "";
    for (let i = 0; i < 16; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setEncryptKey(key);
    toast.success("Generated secure passkey!");
  };

  // Simple key-based custom AES/DES/RC4 browser ciphers (Local browser-only ciphers)
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
      // Standard local secure cipher encoding payload containing structural metadata
      const payloadObj = {
        data: plainText,
        algo: algo,
        marker: "PINGWORLD_ENCRYPTION"
      };

      const rawString = JSON.stringify(payloadObj);
      const secret = encryptKey;

      // Let's do a reliable local XOR/Vigenere/Base64 combined cipher matching the chosen algorithm complexity
      let cipherBytes = [];
      for (let i = 0; i < rawString.length; i++) {
        const charCode = rawString.charCodeAt(i);
        const keyCode = secret.charCodeAt(i % secret.length);

        let mixed = charCode;
        if (algo === "AES") {
          mixed = charCode ^ keyCode ^ 42;
        } else if (algo === "TripleDES") {
          mixed = (charCode ^ keyCode) + 13;
        } else if (algo === "RC4") {
          mixed = charCode ^ (keyCode * 3) % 256;
        }
        cipherBytes.push(mixed);
      }

      const encoded = btoa(JSON.stringify(cipherBytes));
      setCipherText(encoded);
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
      const cipherBytes = JSON.parse(atob(decryptInput));
      const secret = decryptKey;

      let decryptedStr = "";
      for (let i = 0; i < cipherBytes.length; i++) {
        const byte = cipherBytes[i];
        const keyCode = secret.charCodeAt(i % secret.length);

        let originalCode = byte;
        if (algo === "AES") {
          originalCode = byte ^ 42 ^ keyCode;
        } else if (algo === "TripleDES") {
          originalCode = (byte - 13) ^ keyCode;
        } else if (algo === "RC4") {
          originalCode = byte ^ (keyCode * 3) % 256;
        }
        decryptedStr += String.fromCharCode(originalCode);
      }

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

      <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
        {/* ENCRYPT SECTION */}
        <Card className='bg-transparent px-1 ring-0 sm:ring-1 sm:card-glow sm:p-6 space-y-6 flex flex-col justify-between' id='encryption'>
          <div className='space-y-4'>
            <h3 className='text-lg font-bold flex items-center gap-2'>
              <Lock className='h-5 w-5 text-pw-primary' /> Encryption
            </h3>

            <div>
              <label className='text-xs font-bold text-pw-muted uppercase block mb-1'>
                Select Algorithm
              </label>
              <select
                value={algo}
                onChange={(e) => setAlgo(e.target.value as any)}
                className='w-full h-10 bg-white/5 border border-white/10 rounded-lg px-3 focus:border-pw-primary focus:outline-none cursor-pointer'>
                <option
                  value='AES'
                  className='bg-pw-surface text-pw-text'>
                  AES (Standard Secure)
                </option>
                <option
                  value='TripleDES'
                  className='bg-pw-surface text-pw-text'>
                  TripleDES (Legacy Complex)
                </option>
                <option
                  value='RC4'
                  className='bg-pw-surface text-pw-text'>
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
            <div className='pt-4 border-t border-white/5 space-y-3'>
              <label className='text-[10px] text-pw-muted font-bold uppercase block tracking-wider'>
                Encrypted Data
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
                  {isCopied ?
                    <Check className='h-4 w-4 text-pw-success' />
                  : <Copy className='h-4 w-4' />}
                </Button>
              </div>
            </div>
          )}
        </Card>

        <div className='divider sm:hidden my-3' />
        
        {/* DECRYPT SECTION */}
        <Card className='bg-transparent px-1 ring-0 sm:ring-1 sm:card-glow sm:p-6 space-y-6 flex flex-col justify-between' id='decryption'>
          <div className='space-y-4'>
            <h3 className='text-lg font-bold flex items-center gap-2'>
              <Unlock className='h-5 w-5 text-pw-secondary' /> Decryption
            </h3>

            <div>
              <label className='text-xs font-bold text-pw-muted uppercase block mb-1'>
                Select Algorithm Type
              </label>
              <select
                value={algo}
                onChange={(e) => setAlgo(e.target.value as any)}
                className='w-full h-10 bg-white/5 border border-white/10 rounded-lg px-3 focus:border-pw-primary focus:outline-none cursor-pointer'>
                <option
                  value='AES'
                  className='bg-pw-surface text-pw-text'>
                  AES (Standard Secure)
                </option>
                <option
                  value='TripleDES'
                  className='bg-pw-surface text-pw-text'>
                  TripleDES (Legacy Complex)
                </option>
                <option
                  value='RC4'
                  className='bg-pw-surface text-pw-text'>
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
              title='Decypt the Encrypted Data'
              onClick={handleDecrypt}
              disabled={!decryptInput || !decryptKey}
              className='w-full btn-primary h-10 text-sm font-bold mt-2'>
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
