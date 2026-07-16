"use client";

import { useState } from "react";
import {
  Lock,
  Key,
  Copy,
  Check,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Sliders
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function PasswordGeneratorPage() {
  const [password, setPassword] = useState("");
  const [length, setLength] = useState(16);
  const [includeUppercase, setIncludeUppercase] = useState(true);
  const [includeLowercase, setIncludeLowercase] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const [isCopied, setIsCopied] = useState(false);

  const generatePassword = () => {
    let charset = "";
    if (includeUppercase) charset += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if (includeLowercase) charset += "abcdefghijklmnopqrstuvwxyz";
    if (includeNumbers) charset += "0123456789";
    if (includeSymbols) charset += "!@#$%^&*()_+~`|}{[]:;?><,./-=";

    if (!charset) {
      toast.error("Please select at least one character type!");
      return;
    }

    let generated = "";
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      generated += charset[randomIndex];
    }
    setPassword(generated);
  };

  const copyToClipboard = () => {
    if (!password) return;
    navigator.clipboard.writeText(password);
    setIsCopied(true);
    toast.success("Password copied to clipboard!");
    setTimeout(() => setIsCopied(false), 2000);
  };

  const getStrength = () => {
    if (!password) return { score: 0, label: "Empty", color: "text-pw-muted bg-pw-surface" };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { score, label: "Weak", color: "text-pw-danger bg-pw-danger/10 border-pw-danger/20" };
    if (score <= 4) return { score, label: "Medium", color: "text-pw-warning bg-pw-warning/10 border-pw-warning/20" };
    return { score, label: "Strong", color: "text-pw-success bg-pw-success/10 border-pw-success/20" };
  };

  const strength = getStrength();

  return (
    <div className='container mx-auto px-6 py-12 max-w-4xl min-h-[calc(100vh-64px)] pb-20'>
      <div className='flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12'>
        <div>
          <div className='badge mb-4'>
            <Lock className='h-3.5 w-3.5' />
            Cyber Suite
          </div>
          <h1 className='text-4xl font-extrabold font-display leading-[1.1]'>
            Safe <span className='gradient-text'>Passkey.</span>
          </h1>
          <p className='mt-2 text-pw-muted'>
            Generate robust, customizable, and cryptographically secure passwords locally.
          </p>
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-12 gap-8'>
        {/* Output Panel */}
        <div className='md:col-span-7 space-y-6'>
          <Card className='card-glow p-1'>
            <div className="flex gap-3 m-1">
              <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl h-12 px-4 flex items-center justify-between text-lg font-mono tracking-wider overflow-x-auto select-all">
                {password ? password : <span className="text-pw-muted/40 text-sm font-sans font-normal">Your generated password...</span>}
              </div>
              <Button
                onClick={generatePassword}
                className="btn-primary h-12 w-12 shrink-0 rounded-4xl">
                <RefreshCw className="h-5 w-5" />
              </Button>
            </div>

            {password && (
              <div className="flex items-center justify-between p-2 pl-3 rounded-xl border border-purple/6 bg-purple/[1.02]">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-xs text-pw-muted font-bold uppercase">Password Strength</p>
                    <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full border inline-block mt-1", strength.color)}>
                      {strength.label}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={copyToClipboard}
                  variant="outline"
                  className="h-8 px-4 border-white/10 hover:bg-pw-primary/10 gap-2 text-[10px] rounded-4xl">
                  {isCopied ? <Check className="h-4 w-4 text-pw-success" /> : <Copy className="h-4 w-4" />}
                  Copy
                </Button>
              </div>
            )}
          </Card>

          {/* Quick Info */}
          <div className="p-6 rounded-2xl border border-pw-primary/20 bg-pw-primary/5">
            <h3 className="text-sm font-bold flex items-center gap-2 mb-2 text-pw-primary">
              <Key className="h-4 w-4" /> Client-Side Entropy
            </h3>
            <p className="text-xs text-pw-muted leading-relaxed">
              This passkey is mathematically randomized and structured entirely inside your browser. No password data is ever sent over the network or saved anywhere.
            </p>
          </div>
        </div>

        {/* Configuration Panel */}
        <div className='md:col-span-5 space-y-6'>
          <Card className='card-glow p-8 space-y-6'>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Sliders className="h-5 w-5 text-pw-primary" /> Settings
            </h3>

            {/* Length slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-pw-muted uppercase">Length</span>
                <span className="text-sm font-mono font-bold text-pw-primary">{length} chars</span>
              </div>
              <input
                type="range"
                min={8}
                max={64}
                value={length}
                onChange={(e) => setLength(Number(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-pw-primary"
              />
            </div>

            {/* Checkboxes */}
            <div className="space-y-3 pt-2">
              <label className="flex items-center gap-3 cursor-pointer select-none text-sm text-pw-text font-medium">
                <input
                  type="checkbox"
                  checked={includeUppercase}
                  onChange={(e) => setIncludeUppercase(e.target.checked)}
                  className="rounded border-white/10 bg-white/5 h-4 w-4 text-pw-primary accent-pw-primary"
                />
                Uppercase (A-Z)
              </label>

              <label className="flex items-center gap-3 cursor-pointer select-none text-sm text-pw-text font-medium">
                <input
                  type="checkbox"
                  checked={includeLowercase}
                  onChange={(e) => setIncludeLowercase(e.target.checked)}
                  className="rounded border-white/10 bg-white/5 h-4 w-4 text-pw-primary accent-pw-primary"
                />
                Lowercase (a-z)
              </label>

              <label className="flex items-center gap-3 cursor-pointer select-none text-sm text-pw-text font-medium">
                <input
                  type="checkbox"
                  checked={includeNumbers}
                  onChange={(e) => setIncludeNumbers(e.target.checked)}
                  className="rounded border-white/10 bg-white/5 h-4 w-4 text-pw-primary accent-pw-primary"
                />
                Numbers (0-9)
              </label>

              <label className="flex items-center gap-3 cursor-pointer select-none text-sm text-pw-text font-medium">
                <input
                  type="checkbox"
                  checked={includeSymbols}
                  onChange={(e) => setIncludeSymbols(e.target.checked)}
                  className="rounded border-white/10 bg-white/5 h-4 w-4 text-pw-primary accent-pw-primary"
                />
                Symbols (!@#$%)
              </label>
            </div>

            <Button
              onClick={generatePassword}
              className="w-full btn-primary h-12 text-sm font-bold">
              Generate Secure Key
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
