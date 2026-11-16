'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Crown,
  DollarSign,
  Save,
  AlertTriangle,
  Trash2,
  ShieldCheck,
  Mail,
  ClockIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import ProfileAvatarDesigner from '@/components/profile/ProfileAvatarDesigner';
import Image from 'next/image';
import { remainingPlanLabel } from '@/app/(main)/pricing/page';

interface AccountTabProps {
  displayName: string;
  setDisplayName: (val: string) => void;
  email: string;
  createdAtFormatted: string;
  handleDeleteAccount: () => void;
  onNavigateSecurityTab: () => void;
}

export default function AccountTab({
  displayName,
  setDisplayName,
  email,
  createdAtFormatted,
  handleDeleteAccount,
  onNavigateSecurityTab,
}: AccountTabProps) {
  const { user, refresh, premiumTier, purchasedTools, username, dp } =
    useAppContext();
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const remaining = remainingPlanLabel(
    user?.app_metadata?.tier_expires_at,
    user?.app_metadata?.billing_cycle,
    user?.app_metadata?.auto_renew,
  );

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      toast.error('Display name cannot be empty.');
      return;
    }

    setIsUpdatingProfile(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          display_name: displayName.trim(),
        },
      });

      if (error) throw error;

      if (user?.id) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ display_name: displayName.trim() })
          .eq('id', user.id);
        if (profileError) throw profileError;
      }

      await refresh();
      toast.success('Account profile updated successfully!');
    } catch (err: any) {
      toast.error(
        'Failed to update profile: ' + (err?.message || 'Please try again.'),
      );
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const getToolName = (toolKey: string) => {
    const map: Record<string, string> = {
      quiz: 'Quizzable',
      composer: 'Post Composer',
      anonlink: 'Anonymous Link',
      pdf: 'PDF Studio',
      image: 'Media Editor & Bizzcard',
    };
    return map[toolKey] || toolKey;
  };

  const formattedPurchasedList = Array.from(
    new Set((purchasedTools || []).filter((t) => t !== 'all').map(getToolName)),
  );

  return (
    <div className='space-y-6'>
      <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        {/* Account Info Card */}
        <Card className='bg-transparent ring-0 px-2 sm:px-0 space-y-4 md:col-span-1'>
          <div className='flex items-center gap-3 border-b border-white/5 pb-4 flex-wrap'>
            {dp.trim() ?
              <Image
                width={48}
                height={48}
                src={dp}
                alt={username}
                unoptimized
                className='w-12 h-12 rounded-2xl object-cover object-center border border-pw-primary/20 text-pw-primary flex items-center justify-center font-bold text-lg'
              />
            : <div className='w-12 h-12 rounded-2xl bg-pw-primary/10 border border-pw-primary/20 text-pw-primary flex items-center justify-center font-bold text-xl bkblur'>
                {displayName ? displayName[0].toUpperCase() : 'U'}
              </div>
            }
            <div className='min-w-0 flex-1'>
              <h3 className='text-sm font-bold text-white truncate'>
                {displayName || 'User'}
              </h3>
              <p className='text-[10px] text-pw-muted truncate font-mono'>
                @{username}
              </p>
            </div>
          </div>

          <div className='space-y-3 text-xs'>
            <div className='flex items-center justify-between text-pw-muted flex-wrap gap-2'>
              <span className='flex items-center gap-1.5'>
                <Mail className='h-3.5 w-3.5 text-pw-cyan' /> Email
              </span>
              <span className='font-mono text-white text-[11px]'>{email}</span>
            </div>

            <div className='flex items-center justify-between text-pw-muted flex-wrap gap-2'>
              <span className='flex items-center gap-1.5'>
                <Calendar className='h-3.5 w-3.5 text-pw-primary' /> Member
                Since
              </span>
              <span className='font-mono text-white text-[11px]'>
                {createdAtFormatted}
              </span>
            </div>

            <div className='flex items-center justify-between text-pw-muted flex-wrap gap-2'>
              <span className='flex items-center gap-1.5'>
                <Crown className='h-3.5 w-3.5 text-pw-success' /> Plan
              </span>
              <span className='font-bold uppercase text-pw-primary text-[11px]'>
                {premiumTier}
              </span>
            </div>

            {premiumTier !== 'free' && (
              <div className='flex items-center justify-between text-pw-muted flex-wrap gap-2'>
                <span className='flex items-center gap-1.5'>
                  <ClockIcon className='h-3.5 w-3.5 text-pw-warning animate-pulse' />{' '}
                  Expiry
                </span>
                <span className='font-light text-[10px] tracking-wide'>
                  {remaining}
                </span>
              </div>
            )}

            {premiumTier === 'flexible' &&
              formattedPurchasedList.length > 0 && (
                <div className='ml-3 pl-2 border-l-2 border-pw-primary space-y-1 gap-2'>
                  <span className='text-[10px] font-bold text-white uppercase tracking-wider block flex items-center gap-1'>
                    <ShieldCheck className='h-3 w-3' /> Active Tools
                  </span>
                  <div className='flex flex-wrap gap-1'>
                    {formattedPurchasedList.map((name) => (
                      <span
                        key={name}
                        className='text-[10px] font-semibold text-pw-primary px-1.5 py-0.5'>
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

           
          </div>

          <Link href='/pricing' className='mx-3'>
            <Button className='btn-primary h-9 w-full text-xs font-bold mt-2 gap-1.5'>
              <DollarSign className='h-4 w-4' /> Subscription
            </Button>
          </Link>
        </Card>

        {/* Profile Edit Form */}
        <Card className='p-4 sm:p-6 bg-[#0c0d1c]/70 bkblur border border-white/5 rounded-2xl space-y-6 shadow-xl md:col-span-2'>
          <div>
            <h3 className='text-lg font-bold font-display text-white'>
              Profile
            </h3>
            <p className='text-xs text-pw-muted'>
              Update your publicly visible display name and handle.
            </p>
          </div>

          <form
            onSubmit={handleUpdateProfile}
            className='space-y-4'>
            <div className='space-y-1.5'>
              <label className='text-xs font-bold uppercase tracking-wider text-pw-muted'>
                Display Name
              </label>
              <Input
                value={displayName}
                maxLength={20}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder='Your Name or Brand'
                className='h-10 bg-white/2 bkblur border-white/5 text-xs font-semibold'
              />
            </div>

            <div className='space-y-1.5'>
              <label className='text-xs font-bold uppercase tracking-wider text-pw-muted'>
                Email Address
              </label>
              <Input
                value={email}
                disabled
                className='h-10 bg-white/2 border-white/5 text-xs font-mono text-white/85 cursor-not-allowed'
              />
              <p className='text-[10px] text-pw-muted'>
                To change your login email,{' '}
                <button
                  type='button'
                  onClick={onNavigateSecurityTab}
                  className='ml-0.5 underline text-pw-primary hover:text-pw-primary/80 font-bold'>
                  Click here
                </button>
                .
              </p>
            </div>

            <Button
              type='submit'
              disabled={isUpdatingProfile}
              className='btn-primary h-9 px-5 text-xs font-bold gap-2'>
              <Save className='h-3.5 w-3.5' />{' '}
              {isUpdatingProfile ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </Card>
      </div>

      <div className='divider my-10 sm:hidden' />

      {/* Profile Avatar Designer with Object Mocks */}
      <ProfileAvatarDesigner
        initialImage={dp || null}
        displayName={displayName}
        onSaveAvatar={async (avatarDataUrl: string) => {
          try {
            if (user?.id) {
              // Do not add the base64 to the database, it'll take up space, create a storage bucket in supabase to save user profile images, and use them in things like anonumous or branding.
              const { error: profileError } = await supabase
                .from('profiles')
                .update({ avatar_url: avatarDataUrl })
                .eq('id', user.id);
              if (profileError) throw profileError;
            }
            const { error: authError } = await supabase.auth.updateUser({
              data: { avatar_url: null },
            });
            if (authError) throw authError;
            await refresh();
          } catch (err: any) {
            throw new Error(err?.message || 'Failed to update avatar.');
          }
        }}
      />
      
      <div className='divider my-15 sm:hidden' />

      {/* Danger Zone */}
      <Card className='p-4 sm:p-6 bg-pw-danger/2 border border-pw-danger/10 rounded-2xl space-y-4'>
        <div className='flex items-center gap-3'>
          <div className='p-2 rounded-xl bg-pw-danger/10 text-pw-danger border border-pw-danger/20'>
            <AlertTriangle className='h-5 w-5' />
          </div>
          <div>
            <h3 className='text-sm font-bold text-white'>Danger Zone</h3>
            <p className='text-xs text-pw-muted'>
              Permanently delete your account and all associated tool creations.
            </p>
          </div>
        </div>

        <div className='flex items-center justify-between flex-wrap gap-4 pt-2 border-t border-pw-danger/10'>
          <p className='text-[10px] text-pw-muted max-w-md'>
            This action is irreversible. All published quizzes, inbox messages,
            and books will be permanently erased.
          </p>
          <Button
            onClick={handleDeleteAccount}
            variant='destructive'
            className='h-9 px-4 text-xs font-bold gap-2'>
            <Trash2 className='h-3.5 w-3.5' /> Delete My Account
          </Button>
        </div>
      </Card>
    </div>
  );
}
