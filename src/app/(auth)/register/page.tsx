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
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const [secure, setSecure] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      return toast.error('Please fill in all fields');
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            username: formData.name,
          },
        },
      });

      if (error) throw error;

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
    <div className='min-h-screen w-full p-2 md:p-4 flex flex-col gap-2 justify-center items-center overflow-hidden relative'>
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
        </div>

        <form
          onSubmit={handleRegister}
          className='form p-8 md:p-12 gap-2 md:gap-5 w-full md:col-span-2 grid bg-black/40 backdrop-blur-xl'>
          <div className='space-y-4'>
            <div className='form-group'>
              <label className='form-label mb-1.5'>
                <User size={18} /> Full Name
              </label>
              <input
                className='form-input bg-white/5 border-white/10 hover:border-pw-primary/30'
                placeholder='John Doe'
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div className='form-group'>
              <label className='form-label mb-1.5'>
                <Mail size={18} /> Email Address
              </label>
              <input
                className='form-input bg-white/5 border-white/10 hover:border-pw-primary/30'
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
                  className='form-input bg-white/5 border-white/10 hover:border-pw-primary/30'
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
                      'bg-white/5 text-pw-muted'
                    : 'gradient-brand text-white',
                  )}>
                  {secure ?
                    <Eye size={18} />
                  : <EyeOff size={18} />}
                </div>
              </div>
            </div>
          </div>

          <div className='mt-4 space-y-6'>
            <Button
              type='submit'
              disabled={loading || !formData.email || !formData.name || !formData.password}
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
