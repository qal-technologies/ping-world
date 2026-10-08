'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Eye, EyeOff, Key, Mail, ArrowRight, LogIn, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';

export default function LoginPage() {
  const [secure, setSecure] = useState(true);
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const router = useRouter();
  const { user, username, refresh } = useAppContext();
  const [pageLoading, setPageLoading] = useState(true);
  const [lockoutUntil, setLockoutUntil] = useState(0);
  const [lockoutLabel, setLockoutLabel] = useState('');

  useEffect(() => {
    try { setLockoutUntil(Number(localStorage.getItem('pw_login_lockout_until') || 0)); } catch {}
  }, []);

  useEffect(() => {
    const update = () => {
      const seconds = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
      setLockoutLabel(seconds > 0 ? `Try again in ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}.` : '');
      if (!seconds && lockoutUntil) { setLockoutUntil(0); try { localStorage.removeItem('pw_login_lockout_until'); } catch {} }
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [lockoutUntil]);

  useEffect(() => {
    const checkUser = async () => {
      if (navigator.onLine) {
        await refresh();
        if (user?.id && username) router.replace('/dashboard');
        setPageLoading(false);
      } else {
        setPageLoading(false);
      }
    };
    checkUser();
    () => checkUser();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      return toast.error('Please fill in all fields');
    }
    if (lockoutUntil > Date.now()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: formData.email,
          password: formData.password,
        }),
      });
      const result = await response.json();
      if (response.status === 429) {
        const seconds = Math.max(1, Number(response.headers.get('Retry-After')) || 900);
        const until = Date.now() + seconds * 1000;
        setLockoutUntil(until);
        try { localStorage.setItem('pw_login_lockout_until', String(until)); } catch {}
      }
      if (response.status === 403 && result.code === 'EMAIL_NOT_VERIFIED') {
        toast.error('Please verify your email address before signing in. Check your inbox for the confirmation link.');
        return;
      }
      if (
        !response.ok ||
        !result.session?.access_token ||
        !result.session?.refresh_token
      )
        throw new Error(result.error || 'Could not sign in.');
      const { error } = await supabase.auth.setSession({
        access_token: result.session.access_token,
        refresh_token: result.session.refresh_token,
      });
      if (error) throw error;
      await refresh();

      toast.success('Welcome back!');
      router.replace('/dashboard');
    } catch (err: any) {
      if (!navigator.onLine) toast.error('No internet connection, Try again!');
      else toast.error(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = formData.email.trim();
    if (!email || !email.includes('@'))
      return toast.error('Enter the email address for your account.');
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success(
        'If an account exists for that email, a password reset link is on its way.',
      );
      setResetMode(false);
    } catch (err: any) {
      toast.error(err.message || 'Could not send a password reset link.');
    } finally {
      setResetLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className='min-h-screen w-full p-4 flex flex-col gap-2 justify-center items-center overflow-hidden relative'>
        <p className='text-2xl md:text-4xl font-bold font-display gradient-text animate-fade-in-up'>
          Ping World
        </p>
        <div className='divider' />
        <p className='text-xs mt-[-10px] animate-pulse'>
          Checking your login status...
        </p>
      </div>
    );
  }

  return (
    <div className='min-h-screen w-full p-1 md:p-4 flex flex-col gap-2 justify-center items-center overflow-hidden relative'>
      <div className='beauty-obj w-64 h-64 top-[5%] left-[20%] opacity-10 float gradient-brand' />
      <div
        className='beauty-obj w-48 h-48 bottom-[10%] right-[10%] opacity-5 float'
        style={{ animationDelay: '-4s' }}
      />

      <div className='auth-container w-full max-w-[850px] grid md:grid-cols-3 animate-fade-in-up'>
        <div className='banner p-8 gradient-dark w-full md:max-w-[280px] flex flex-col justify-between animate-gradient'>
          <div>
            <h1 className='text-xl opacity-80 mb-2 font-display'>Ping World</h1>
            <h1 className='text-3xl font-bold tracking-tight'>WELCOME</h1>
            <h2 className='text-lg font-bold tracking-tight text-right w-full hidden'>
              BACK
            </h2>
          </div>
          <div className='space-y-4 mb-8 hidden md:block'>
            <div className='flex items-center gap-3 text-xs opacity-80'>
              <LogIn className='h-4 w-4 text-pw-cyan' /> Access Dashboard
            </div>
            <p className='text-sm opacity-90 leading-relaxed'>
              Sign in to manage your quizzes, view analytics, and customize your
              experience.
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
          onSubmit={resetMode ? handlePasswordReset : handleLogin}
          className='form p-8 md:p-12 gap-2 md:gap-5 w-full md:col-span-2 grid bg-black/40 backdrop-blur-xl'>
          <div className='space-y-4'>
            <div className='form-group'>
              <label className='form-label mb-1.5'>
                <Mail size={18} />{' '}
                {resetMode ? 'Email address' : 'Email or Username'}
              </label>
              <input
                className='form-input border-white/10 hover:border-pw-primary/30'
                placeholder={
                  resetMode ? 'name@example.com' : (
                    'name@example.com or username'
                  )
                }
                type={resetMode ? 'email' : 'text'}
                autoComplete={resetMode ? 'email' : 'username'}
                disabled={loading}
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>

            {!resetMode && (
              <div className='form-group'>
                <label className='form-label mb-1.5'>
                  <Key size={18} /> Password
                </label>
                <div className='flex gap-2 w-full'>
                  <input
                    className='form-input border-white/10 hover:border-pw-primary/30'
                    type={secure ? 'password' : 'text'}
                    placeholder='••••••••'
                    autoComplete='current-password'
                    disabled={loading}
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
              </div>
            )}
          </div>

          <div className='mt-4 space-y-6'>
            <Button
              type='submit'
              disabled={
                resetMode ?
                  resetLoading || !formData.email
                : loading || !formData.email || !formData.password || lockoutUntil > Date.now()
              }
              className='btn-primary w-full h-12 text-base font-bold tracking-wide transition-all hover:scale-[1.02] active:scale-100 flex gap-2'>
              {resetMode ?
                resetLoading ?
                  'SENDING LINK...'
                : 'SEND RESET LINK'
              : loading ?
                'SIGNING IN...'
              : 'SIGN IN'}
              {!(resetMode ? resetLoading : loading) && (
                <ArrowRight size={18} />
              )}
            </Button>
            {!resetMode && lockoutLabel && <p role='status' className='text-center text-sm text-pw-warning'>{lockoutLabel}</p>}

            <button
              type='button'
              onClick={() => setResetMode((value) => !value)}
              className='w-full text-sm text-pw-cyan hover:underline'
              disabled={loading || resetLoading}>
              {resetMode ? 'Back to sign in' : 'Forgot password?'}
            </button>

            {!resetMode && (
              <div className='flex justify-center items-center gap-2 text-sm text-pw-muted'>
                No account yet?{' '}
                <Link
                  href='/register'
                  replace
                  className='text-pw-cyan font-bold hover:underline decoration-pw-cyan/30 underline-offset-4'>
                  Yes
                </Link>
              </div>
            )}
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
