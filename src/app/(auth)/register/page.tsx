'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Eye,
  EyeOff,
  Key,
  Mail,
  User,
  ArrowRight,
  ShieldCheck,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function RegisterPage() {
  const [secure, setSecure] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [canSubmit, setCanSubmit] = useState(false);
  const [available, setAvailable] = useState('');


  const router = useRouter();
  const passwordChecks = [
    formData.password.length >= 10,
    /[a-z]/.test(formData.password),
    /[A-Z]/.test(formData.password),
    /[0-9]/.test(formData.password),
    /[^A-Za-z0-9]/.test(formData.password),
  ];
  const passwordStrength = passwordChecks.filter(Boolean).length;
  useEffect(() => {
    const checkOnline = () => {
      if(!navigator.onLine) return toast.error('No internet connection, Try again!');
    }

    checkOnline();
  }, []);

  useEffect(() => {
    const candidate = formData.name.trim().toLowerCase();
    setAvailable('');
    if (!candidate) {
      return;
    }
    if (!/^[a-z0-9_]{5,20}$/.test(candidate)) {
      setAvailable('Use 5–20 letters, numbers, or underscores.');
      return;
    }
    if (!navigator.onLine) {
      setAvailable('Connect to check username availability.');
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      setCanSubmit(false);
      setAvailable('Verifying…');
      try {
        const response = await fetch(`/api/auth/username-availability?username=${encodeURIComponent(candidate)}`, { cache: 'no-store' });
        const result = await response.json();
        if (cancelled) return;
        if(!response.ok || typeof result.available !== 'boolean') setAvailable(result.error || 'Could not verify username.');
        else if(!result.available) setAvailable('Username is already taken!');
        else {
          setAvailable('Username is available!');
          setCanSubmit(true);
        }
      } catch {
        if (!cancelled) setAvailable('Could not verify username.');
      } 
    }, 450);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [formData.name]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[a-z0-9_]{5,20}$/.test(formData.name.trim().toLowerCase())) {
      setAvailable('Only letters, numbers & underscores allowed!');
      return;
    }

    if (!formData.name || !formData.email || !formData.password) {
      return toast.error('Please fill in all fields');
    }
    if (formData.password.length < 10 || !/[a-z]/.test(formData.password) || !/[A-Z]/.test(formData.password) || !/[0-9]/.test(formData.password) || !/[^A-Za-z0-9]/.test(formData.password)) {
      return toast.error('Use at least 10 characters with lowercase, uppercase, a number, and a symbol.');
    }

    setLoading(true);
    try {
      const usernameCheck = await fetch(`/api/auth/username-availability?username=${encodeURIComponent(formData.name.trim().toLowerCase())}`, { cache: 'no-store' });
      const usernameResult = await usernameCheck.json();
      if (!usernameCheck.ok || typeof usernameResult.available !== 'boolean') throw new Error(usernameResult.error || 'Could not verify username.');
      if (!usernameResult.available) throw new Error('Username is already taken.');

      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            username: formData.name.trim().toLowerCase(),
            display_name: formData.name.trim(),
          },
        },
      });

      if (error) throw error;

      // Send a separate welcome only when signup immediately returns a
      // confirmed session. With email confirmation enabled, Supabase sends
      // the registration email and no authenticated session exists yet.
      if (data.session?.access_token && data.user?.email_confirmed_at) {
        void fetch('/api/auth/welcome-email', {
          method: 'POST',
          headers: { Authorization: `Bearer ${data.session.access_token}` },
          credentials: 'omit',
          keepalive: true,
        }).catch(() => undefined);
      }

      toast.success('Registration successful! Please check your email.');
      router.push('/login');
    } catch (err: any) {
      if (!navigator.onLine) toast.error('No internet connection, Try again!');
      else toast.error(err.message || 'Failed to Regiter');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen w-full p-1 md:p-4 flex flex-col gap-2 justify-center items-center overflow-hidden relative'>
      <div className='beauty-obj w-64 h-64 top-[5%] right-[20%] opacity-10 float gradient-brand' />
      <div
        className='beauty-obj w-48 h-48 bottom-[10%] left-[10%] opacity-5 float'
        style={{ animationDelay: '-4s' }}
      />

      <div className='auth-container w-full max-w-[850px] grid md:grid-cols-3 animate-fade-in-up'>
        <div className='banner p-8 gradient-dark w-full md:max-w-[280px] flex flex-col justify-between animate-gradient'>
          <div>
            <h1 className='text-xl opacity-80 mb-2 font-display'>Ping World</h1>
            <h1 className='text-3xl font-bold tracking-tight'>JOIN US</h1>
          </div>

          <div className='space-y-4 mb-8 hidden md:block'>
            <div className='flex items-center gap-3 text-xs opacity-80'>
              <ShieldCheck className='h-4 w-4 text-pw-cyan' /> Secure Access
            </div>
            <p className='text-sm opacity-90 leading-relaxed'>
              Create your account to save quizzes, track performance, and join
              the community.
            </p>
          </div>

          <div className='w-8 h-8 p-1 rounded-full bg-white text-black flex items-center justify-center shadow-sm absolute right-2 top-2' />

          <Link
            href='/'
            className='w-8 h-8 p-1 rounded-full bg-white text-black flex items-center justify-center shadow-sm absolute right-2 top-2 z-10'>
            <X />
          </Link>
        </div>

        <form
          onSubmit={handleRegister}
          className='form p-8 md:p-12 gap-2 md:gap-5 w-full md:col-span-2 grid backdrop-blur-xl'>
          <div className='space-y-4'>
            <div className='form-group'>
              <label className='form-label mb-1.5'>
                <User size={18} /> Username
              </label>
              <input
                className={cn(
                  'form-input',
                  'border-white/10 hover:border-pw-primary/30'
                )}
                placeholder='JohnDoe'
                value={formData.name}
                minLength={5}
                maxLength={20}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20),
                  })
                }
              />

              {!available.trim() && (
                <p className='text-[11px] mt-1 opacity-70'>
                  Only letters, numbers & underscores (5 - 20 chars)
                </p>
              )}

              {available.trim() && (
                <div
                  className={cn(
                    'text-[10px] opacity-80',
                    available.includes('available') ? 'text-pw-cyan'
                    : available.includes('taken') ? 'text-pw-red'
                    : 'text-pw-warning',
                  )}>
                  {available}
                </div>
              )}
            </div>

            <div className='form-group'>
              <label className='form-label mb-1.5'>
                <Mail size={18} /> Email
              </label>
              <input
                className='form-input border-white/10 hover:border-pw-primary/30'
                type='email'
                placeholder='name@example.com'
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>

            <div className='form-group'>
              <label className='form-label mb-1.5'>
                <Key size={18} /> Password
              </label>
              <div className='flex gap-2 w-full'>
                <input
                  className='form-input border-white/10 hover:border-pw-primary/30'
                  type={secure ? 'password' : 'text'}
                  placeholder='••••••••'
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
                <div
                  onClick={() => setSecure(!secure)}
                  className={cn(
                    'w-12 h-10 flex items-center justify-center rounded-xl cursor-pointer transition-all border border-white/10',
                    secure ?
                      'bg-white/5 hover:bg-white/10 text-pw-muted'
                    : 'gradient-brand text-white',
                  )}>
                  {secure ?
                    <Eye size={18} />
                  : <EyeOff size={18} />}
                </div>
              </div>
              {formData.password.trim() && (
                <div className='mt-2 space-y-2' aria-live='polite'>
                  <div className='flex gap-1' aria-label={`Password strength ${passwordStrength} of 5`}>
                    {passwordChecks.map((passed, index) => <span key={index} className={cn('h-1.5 flex-1 rounded-full transition-colors', passed ? 'bg-emerald-400' : 'bg-white/10')} />)}
                  </div>
                  <p className='text-[10px] text-pw-muted'>Strength: {passwordStrength < 3 ? 'Weak' : passwordStrength < 5 ? 'Fair' : 'Strong'}</p>
                  <ul className='grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-pw-muted sm:grid-cols-3'>
                    {['10+ characters', 'lowercase letter', 'uppercase letter', 'number', 'symbol'].map((requirement, index) => <li key={requirement} className={passwordChecks[index] ? passwordStrength > 3 ? 'text-emerald-300' : 'text-pw-warning' : ''}>{passwordChecks[index] ? '✓' : '○'} {requirement}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className='mt-4 space-y-6'>
            <Button
              type='submit'
              disabled={
                loading ||
                !formData.email ||
                !formData.password ||
                !formData.name ||
                formData.password.length < 10 ||
                !/[a-z]/.test(formData.password) ||
                !/[A-Z]/.test(formData.password) ||
                !/[0-9]/.test(formData.password) ||
                !/[^A-Za-z0-9]/.test(formData.password) ||
                !canSubmit
              }
              className='btn-primary w-full h-12 text-base font-bold tracking-wide transition-all hover:scale-[1.02] active:scale-100 flex gap-2'>
              {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
              {!loading && <ArrowRight size={18} />}
            </Button>

            <div className='flex justify-center items-center gap-2 text-sm text-pw-muted'>
              Have an account?{' '}
              <Link
                href='/login'
                replace
                className='text-pw-cyan font-bold hover:underline decoration-pw-cyan/30 underline-offset-4'>
                Yes
              </Link>
            </div>
          </div>
        </form>
      </div>

      <Link
        href='/'
        replace
        className='text-xl gradient-text font-extrabold mt-3 hover:underline'>
        Ping World
      </Link>
    </div>
  );
}
