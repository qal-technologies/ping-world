'use client';

import { useState } from 'react';
import { Shield, Key, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import Wrapper from '@/components/ui/wrapper';

interface SecurityTabProps {
  email: string;
}

export default function SecurityTab({ email }: SecurityTabProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const [newEmail, setNewEmail] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long.');
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
        title='Change Password'
        description='Ensure your account uses a secure password of 6 or more characters.'
        icon={<Key className='h-4 w-4' />}
        color='cyan'>
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
            disabled={isUpdatingPassword}
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
        color='success'>
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
