'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, KeyRound, LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;
      setReady(Boolean(session));
      if (!session) toast.error('This reset link is invalid or has expired. Request a new one.');
    };
    void check();
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) setReady(true);
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < 10 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      toast.error('Use at least 10 characters, with uppercase, lowercase, and a number.');
      return;
    }
    if (password !== confirm) return toast.error('The passwords do not match.');
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success('Password updated. Sign in with your new password.');
      await supabase.auth.signOut();
      router.replace('/login');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update password.');
    } finally { setSaving(false); }
  };

  return (
    <main className='min-h-screen grid place-items-center p-4'>
      <form onSubmit={submit} className='w-full max-w-md rounded-3xl border border-white/10 bg-pw-surface/70 p-7 shadow-2xl backdrop-blur-2xl'>
        <div className='mb-6 flex items-center gap-3'><div className='grid h-11 w-11 place-items-center rounded-2xl bg-pw-primary/15 text-pw-primary'><KeyRound /></div><div><h1 className='text-xl font-bold'>Set a new password</h1><p className='text-sm text-pw-muted'>Choose a strong password for your account.</p></div></div>
        {!ready && <p role='status' className='mb-4 rounded-xl bg-white/5 p-3 text-sm text-pw-muted'>Checking your secure reset link…</p>}
        <label className='mb-2 block text-sm font-medium' htmlFor='new-password'>New password</label>
        <div className='mb-4 flex gap-2'><input id='new-password' required minLength={10} autoComplete='new-password' type={visible ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} className='form-input flex-1' disabled={!ready || saving} /><button type='button' aria-label={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible((value) => !value)} className='rounded-xl border border-white/10 px-3'>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
        <label className='mb-2 block text-sm font-medium' htmlFor='confirm-password'>Confirm password</label>
        <input id='confirm-password' required minLength={10} autoComplete='new-password' type={visible ? 'text' : 'password'} value={confirm} onChange={(event) => setConfirm(event.target.value)} className='form-input mb-5' disabled={!ready || saving} />
        <p className='mb-5 text-xs text-pw-muted'>At least 10 characters, including uppercase, lowercase, and a number.</p>
        <Button type='submit' disabled={!ready || saving} className='btn-primary w-full'>{saving ? <><LoaderCircle className='mr-2 h-4 w-4 animate-spin' />Updating…</> : 'Update password'}</Button>
      </form>
    </main>
  );
}
