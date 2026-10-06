'use client';

import { useEffect, useState } from 'react';
import { Shield, Key, Mail, AtSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import Wrapper from '@/components/ui/wrapper';
import { useAppContext } from '@/context/AppContext';
import { cn } from '@/lib/utils';

interface SecurityTabProps {
  email: string;
}

export default function SecurityTab({ email }: SecurityTabProps) {
  const { username, user, refresh } = useAppContext();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const [newEmail, setNewEmail] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

  const [newUsername, setNewUsername] = useState('');
  const [isUpdatingUsername, setIsUpdatingUsername] = useState(false);

  const [available, setAvailable] = useState('');

  useEffect(() => {
    const candidate = newUsername.trim().toLowerCase();
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
      setAvailable('Verifying…');
      try {
        const response = await fetch(`/api/auth/username-availability?username=${encodeURIComponent(candidate)}`, { cache: 'no-store' });
        const result = await response.json();
        if (cancelled) return;
        if (!response.ok || typeof result.available !== 'boolean') setAvailable(result.error || 'Could not verify username.');
        else if (!result.available) setAvailable('Username is already taken!');
        else setAvailable('Username is available!');
      } catch {
        if (!cancelled) setAvailable('Could not verify username.');
      } 
    }, 450);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [newUsername, user?.id]);

  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();

    const candidate = newUsername.trim().toLowerCase();
    if (!/^[a-z0-9_]{5,20}$/.test(candidate)) {
      setAvailable('Use 5–20 letters, numbers, or underscores.');
      return;
    }

    if (candidate === username.toLowerCase()) {
      toast.error('Choose a username different from the previous one.');
      return;
    }

    setIsUpdatingUsername(true);
    try {
      const response = await fetch(`/api/auth/username-availability?username=${encodeURIComponent(candidate)}`, { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || typeof result.available !== 'boolean') throw new Error(result.error || 'Could not verify username.');
      if (!result.available) throw new Error('Username is already taken.');

      const { error } = await supabase.auth.updateUser({
        data: {
          username: candidate,
        },
      });

      if (error) throw error;

      if (user?.id) {
        const { error: profileError } = await supabase.from('profiles')
          .update({ username: candidate }).eq('id', user.id);
        if (profileError) {
          await supabase.auth.updateUser({ data: { username } });
          throw profileError;
        }
      }

      setNewUsername('');
      await refresh();
      toast.success('Account username updated successfully!');
    } catch (err: any) {
      toast.error(
        'Failed to update username: ' + (err?.message || 'Please try again.'),
      );
    } finally {
      setIsUpdatingUsername(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 10 || !/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
      toast.error('Use at least 10 characters with lowercase, uppercase, a number, and a symbol.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setNewPassword('');
      setConfirmPassword('');
      toast.success('Security password changed successfully!');
    } catch (err: any) {
      toast.error(
        'Failed to update password: ' + (err?.message || 'Please try again.'),
      );
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || newEmail.length < 4 || !newEmail?.includes('@')) {
      toast.error(
        'Email must be at least 4 characters long or must contain @.',
      );
      return;
    }

    if (newEmail === email) {
      toast.error('This email exists already, choose a different email!');
      return;
    }

    setIsUpdatingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail,
      });

      if (error) throw error;

      setNewEmail('');
      toast.success('Account email update link sent! Please check your inbox.');
    } catch (err: any) {
      toast.error(
        'Failed to update email: ' + (err?.message || 'Please try again.'),
      );
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  return (
    <div className='space-y-6'>
      <Wrapper
        title='Change Username'
        description='Create a new unique username for yourself. This would be your pingworld identifier.'
        icon={<AtSign className='h-4 w-4' />}
        color='cyan'>
        <form
          onSubmit={handleUpdateUsername}
          className='space-y-4 m-2'>
          <div className='space-y-1.5'>
            <label className='text-xs font-bold uppercase tracking-wider text-pw-muted'>
              Current Username
            </label>
            <Input
              type='text'
              value={username}
              readOnly
              className='h-10 bg-white/5 border-white/10 text-xs cursor-not-allowed opacity-75'
            />
          </div>

          <div className='space-y-1.5'>
            <label className='text-xs font-bold uppercase tracking-wider text-pw-muted'>
              New Username
            </label>
            <Input
              type='text'
              value={newUsername}
              onChange={(e) =>
                setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20))
              }
              minLength={5}
              maxLength={20}
              placeholder='JohnDoe'
              className='h-10 bg-white/5 border-white/10 text-xs'
            />
          </div>
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

          <Button
            type='submit'
            disabled={isUpdatingUsername}
            className='btn-primary h-10 px-6 text-xs font-bold gap-2'>
            <Shield className='h-3.5 w-3.5' />{' '}
            {isUpdatingUsername ? 'changing...' : 'Change Username'}
          </Button>
        </form>
      </Wrapper>

      <Wrapper
        title='Change Password'
        description='Use at least 10 characters with uppercase, lowercase, a number, and a symbol.'
        icon={<Key className='h-4 w-4' />}
        color='success'>
        <form
          onSubmit={handleUpdatePassword}
          className='space-y-4 m-2'>
          <div className='space-y-1.5'>
            <label className='text-xs font-bold uppercase tracking-wider text-pw-muted'>
              New Password
            </label>
            <Input
              type='password'
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder='••••••••'
              className='h-10 bg-white/5 border-white/10 text-xs'
            />
          </div>

          <div className='space-y-1.5'>
            <label className='text-xs font-bold uppercase tracking-wider text-pw-muted'>
              Confirm New Password
            </label>
            <Input
              type='password'
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder='••••••••'
              className='h-10 bg-white/5 border-white/10 text-xs'
            />
          </div>

          <Button
            type='submit'
            disabled={isUpdatingPassword || newPassword.length < 10 || !/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)}
            className='btn-primary h-10 px-6 text-xs font-bold gap-2'>
            <Shield className='h-3.5 w-3.5' />{' '}
            {isUpdatingPassword ? 'Updating...' : 'Update Password'}
          </Button>
        </form>
      </Wrapper>

      <Wrapper
        title='Change Email'
        description='Ensure you have access to the new email because verification would be required.'
        icon={<Mail className='h-4 w-4' />}
        color='primary'>
        <form
          onSubmit={handleUpdateEmail}
          className='space-y-4 m-2'>
          <div className='space-y-1.5'>
            <label className='text-xs font-bold uppercase tracking-wider text-pw-muted'>
              Current Email
            </label>
            <Input
              type='email'
              value={email}
              readOnly
              className='h-10 bg-white/5 border-white/10 text-xs cursor-not-allowed opacity-75'
            />
          </div>

          <div className='space-y-1.5'>
            <label className='text-xs font-bold uppercase tracking-wider text-pw-muted'>
              New Email
            </label>
            <Input
              type='email'
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder='example@gmail.com'
              className='h-10 bg-white/5 border-white/10 text-xs'
            />
          </div>

          <Button
            type='submit'
            disabled={isUpdatingEmail}
            className='btn-primary h-10 px-6 text-xs font-bold gap-2'>
            <Shield className='h-3.5 w-3.5' />{' '}
            {isUpdatingEmail ? 'Updating...' : 'Update Email'}
          </Button>
        </form>
      </Wrapper>
    </div>
  );
}
