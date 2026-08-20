'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Settings,
  User,
  Shield,
  HardDrive,
  Bell,
  Trash2,
  LogOut,
  Sparkles,
  Key,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Crown,
  Calendar,
  Mail,
  Smartphone,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useAppContext } from '@/context/AppContext';
import { useAppModal } from '@/components/ui/AppModalProvider';
import { supabase } from '@/lib/supabase';
import { HybridStorage } from '@/lib/storage-utils';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function SettingsPage() {
  const { user, username, refresh, premiumTier, isPremium } = useAppContext();
  const router = useRouter();
  const { showAlert, showConfirm, showPrompt } = useAppModal();

  // Form states
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Security states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Storage / Cache stats
  const [cacheCounts, setCacheCounts] = useState<{ quizzes: number; messages: number; documents: number }>({
    quizzes: 0,
    messages: 0,
    documents: 0,
  });
  const [isSyncingStorage, setIsSyncingStorage] = useState(false);

  // Preferences & Push Notification states
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyInApp, setNotifyInApp] = useState(true);
  const [notifyWebPush, setNotifyWebPush] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPushPermission(Notification.permission);
      if (Notification.permission === 'granted') {
        setNotifyWebPush(true);
      }
    }
  }, []);

  const handleToggleWebPush = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast.error('Web Push notifications are not supported in this browser.');
      return;
    }

    if (Notification.permission === 'granted') {
      setNotifyWebPush(!notifyWebPush);
      toast.success(
        !notifyWebPush ? 'Web Push notifications enabled.' : 'Web Push notifications disabled.',
      );
      return;
    }

    const permission = await Notification.requestPermission();
    setPushPermission(permission);
    if (permission === 'granted') {
      setNotifyWebPush(true);
      if ('serviceWorker' in navigator) {
        try {
          await navigator.serviceWorker.register('/sw.js').catch(() => {});
        } catch {
          // fallback
        }
      }
      toast.success('🎉 Web Push permission granted and Service Worker registered!');
    } else {
      setNotifyWebPush(false);
      toast.error('Web Push permission denied by browser settings.');
    }
  };

  useEffect(() => {
    if (user) {
      setDisplayName(user.user_metadata?.full_name || username || user.email?.split('@')[0] || '');
      setEmail(user.email || '');
    }

    // Tally hybrid cached items
    try {
      const keys = Object.keys(localStorage);
      const quizzes = keys.filter((k) => k.startsWith('pw_quiz') || k.includes('quizzes')).length;
      const messages = keys.filter((k) => k.startsWith('pw_message') || k.includes('messages')).length;
      const documents = keys.filter((k) => k.startsWith('pw_pdf') || k.includes('doc')).length;
      setCacheCounts({ quizzes, messages, documents });
    } catch {
      // ignore
    }
  }, [user, username]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      toast.error('Display name cannot be empty.');
      return;
    }

    setIsUpdatingProfile(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: displayName.trim() },
      });

      if (error) throw error;

      if (user?.id) {
        await supabase
          .from('profiles')
          .update({ display_name: displayName.trim() })
          .eq('id', user.id);
      }

      await refresh();
      toast.success('Account profile updated successfully!');
    } catch (err: any) {
      toast.error('Failed to update profile: ' + (err?.message || 'Please try again.'));
    } finally {
      setIsUpdatingProfile(false);
    }
  };

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
      toast.error('Failed to update password: ' + (err?.message || 'Please try again.'));
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleClearCache = async () => {
    const confirmed = await showConfirm(
      'Clear all local cache & temporary drafts from this device? Saved cloud items will not be affected.',
      {
        title: 'Clear Local Storage',
        confirmText: 'Clear Cache',
        type: 'warning',
      }
    );

    if (!confirmed) return;

    try {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith('pw_')) {
          localStorage.removeItem(key);
        }
      });
      setCacheCounts({ quizzes: 0, messages: 0, documents: 0 });
      toast.success('Local device storage cleared.');
    } catch (err) {
      toast.error('Failed to clear cache.');
    }
  };

  const handleSyncOfflineQueue = async () => {
    setIsSyncingStorage(true);
    const toastId = toast.loading('Syncing offline hybrid records with database...');
    try {
      await HybridStorage.syncPending();
      toast.dismiss(toastId);
      toast.success('All local changes synchronized with cloud storage!');
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error('Sync failed: ' + (err?.message || 'Network unreachable.'));
    } finally {
      setIsSyncingStorage(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmation = await showPrompt(
      'DANGER: Deleting your account will permanently wipe all your quizzes, messages, and books. Type "DELETE" to confirm:',
      {
        title: 'Permanently Delete Account',
        placeholder: 'DELETE',
      }
    );

    if (confirmation !== 'DELETE') {
      toast.info('Account deletion cancelled.');
      return;
    }

    try {
      toast.loading('Processing account deletion...');
      if (user?.id) {
        await supabase.from('profiles').delete().eq('id', user.id);
      }
      await supabase.auth.signOut();
      await refresh();
      toast.dismiss();
      toast.success('Your account has been deleted.');
      router.push('/');
    } catch (err: any) {
      toast.dismiss();
      toast.error('Failed to delete account: ' + (err?.message || 'Please contact support.'));
    }
  };

  // jules edit: Cloud Sync Guard on Logout to alert users about unsynced drafts before signing out
  const handleSignOut = async () => {
    const confirmed = await showConfirm(
      'Cloud Sync Guard: Are you sure you want to log out? Please ensure any offline drafts or unsynced manuscript changes have been synchronized with your cloud workspace before signing out.',
      {
        title: 'Confirm Sign Out & Cloud Sync',
        confirmText: 'Sign Out Now',
        type: 'warning',
      },
    );

    if (!confirmed) return;

    await supabase.auth.signOut();
    await refresh();
    toast.success('Logged out successfully.');
    router.push('/');
  };

  const createdAtFormatted = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Recently';

  return (
    <div className='min-h-[calc(100vh-64px)] pb-24 pt-8 px-4 sm:px-6 max-w-5xl mx-auto'>
      {/* Settings Header */}
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-white/5 pb-6'>
        <div>
          <div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pw-primary/10 border border-pw-primary/20 text-pw-primary text-xs font-bold mb-2'>
            <Settings className='h-3.5 w-3.5' /> Control Panel
          </div>
          <h1 className='text-3xl sm:text-4xl font-extrabold font-display text-white tracking-tight'>
            Settings & <span className='gradient-text'>Account.</span>
          </h1>
          <p className='text-pw-muted text-xs sm:text-sm mt-1 max-w-xl'>
            Manage your account identity, authentication security, app preferences, and local hybrid storage.
          </p>
        </div>

        <Button
          onClick={handleSignOut}
          variant='outline'
          className='h-10 px-4 border-white/10 hover:bg-pw-danger/10 hover:border-pw-danger/30 text-pw-muted hover:text-pw-danger text-xs font-bold gap-2 self-start md:self-auto transition-all'>
          <LogOut className='h-3.5 w-3.5' /> Log Out
        </Button>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue='account' className='space-y-6'>
        <TabsList className='bg-white/5 border border-white/10 p-1 rounded-2xl h-11'>
          <TabsTrigger
            value='account'
            className='rounded-xl text-xs font-bold data-[state=active]:bg-pw-primary data-[state=active]:text-white gap-2'>
            <User className='h-3.5 w-3.5' /> Account & Profile
          </TabsTrigger>
          <TabsTrigger
            value='security'
            className='rounded-xl text-xs font-bold data-[state=active]:bg-pw-primary data-[state=active]:text-white gap-2'>
            <Shield className='h-3.5 w-3.5' /> Security
          </TabsTrigger>
          <TabsTrigger
            value='storage'
            className='rounded-xl text-xs font-bold data-[state=active]:bg-pw-primary data-[state=active]:text-white gap-2'>
            <HardDrive className='h-3.5 w-3.5' /> Storage & Sync
          </TabsTrigger>
          <TabsTrigger
            value='preferences'
            className='rounded-xl text-xs font-bold data-[state=active]:bg-pw-primary data-[state=active]:text-white gap-2'>
            <Bell className='h-3.5 w-3.5' /> Preferences
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: ACCOUNT & PROFILE ─────────────────────────────── */}
        <TabsContent value='account' className='space-y-6'>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            {/* Account Info Card */}
            <Card className='p-6 bg-[#0c0d1c] border border-white/10 rounded-2xl space-y-4 shadow-xl md:col-span-1'>
              <div className='flex items-center gap-3 border-b border-white/5 pb-4'>
                <div className='w-12 h-12 rounded-2xl bg-pw-primary/10 border border-pw-primary/20 text-pw-primary flex items-center justify-center font-bold text-lg'>
                  {displayName ? displayName[0].toUpperCase() : 'U'}
                </div>
                <div className='min-w-0 flex-1'>
                  <h3 className='text-sm font-bold text-white truncate'>{displayName || 'Ping World User'}</h3>
                  <p className='text-[10px] text-pw-muted truncate font-mono'>{email}</p>
                </div>
              </div>

              <div className='space-y-3 text-xs'>
                <div className='flex items-center justify-between text-pw-muted'>
                  <span className='flex items-center gap-1.5'>
                    <Calendar className='h-3.5 w-3.5 text-pw-primary' /> Member Since
                  </span>
                  <span className='font-mono text-white text-[11px]'>{createdAtFormatted}</span>
                </div>

                <div className='flex items-center justify-between text-pw-muted'>
                  <span className='flex items-center gap-1.5'>
                    <Crown className='h-3.5 w-3.5 text-pw-warning' /> Active Plan
                  </span>
                  <span className='font-bold uppercase text-pw-primary text-[11px]'>{premiumTier}</span>
                </div>
              </div>

              <Link href='/pricing'>
                <Button className='btn-primary h-9 w-full text-xs font-bold mt-2 gap-1.5'>
                  <Sparkles className='h-3.5 w-3.5' /> Upgrade / Change Plan
                </Button>
              </Link>
            </Card>

            {/* Profile Edit Form */}
            <Card className='p-6 bg-[#0c0d1c] border border-white/10 rounded-2xl space-y-6 shadow-xl md:col-span-2'>
              <div>
                <h3 className='text-lg font-bold font-display text-white'>Profile Information</h3>
                <p className='text-xs text-pw-muted'>Update your publicly visible display name and handle.</p>
              </div>

              <form onSubmit={handleUpdateProfile} className='space-y-4'>
                <div className='space-y-1.5'>
                  <label className='text-xs font-bold uppercase tracking-wider text-pw-muted'>Display Name</label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder='Your Name or Brand'
                    className='h-10 bg-white/5 border-white/10 text-xs font-semibold'
                  />
                </div>

                <div className='space-y-1.5'>
                  <label className='text-xs font-bold uppercase tracking-wider text-pw-muted'>Email Address</label>
                  <Input
                    value={email}
                    disabled
                    className='h-10 bg-white/[0.02] border-white/5 text-xs font-mono text-pw-muted cursor-not-allowed'
                  />
                  <p className='text-[10px] text-pw-muted'>To change your login email, please contact customer support.</p>
                </div>

                <Button type='submit' disabled={isUpdatingProfile} className='btn-primary h-10 px-6 text-xs font-bold gap-2'>
                  <Save className='h-3.5 w-3.5' /> {isUpdatingProfile ? 'Saving...' : 'Save Profile Changes'}
                </Button>
              </form>
            </Card>
          </div>

          {/* Danger Zone */}
          <Card className='p-6 bg-pw-danger/5 border border-pw-danger/20 rounded-2xl space-y-4'>
            <div className='flex items-center gap-3'>
              <div className='p-2 rounded-xl bg-pw-danger/10 text-pw-danger border border-pw-danger/20'>
                <AlertTriangle className='h-5 w-5' />
              </div>
              <div>
                <h4 className='text-sm font-bold text-white'>Danger Zone</h4>
                <p className='text-xs text-pw-muted'>Permanently delete your account and all associated studio creations.</p>
              </div>
            </div>

            <div className='flex items-center justify-between flex-wrap gap-4 pt-2 border-t border-pw-danger/10'>
              <p className='text-xs text-pw-muted max-w-md'>
                This action is irreversible. All published quizzes, inbox messages, and book manuscripts will be permanently erased.
              </p>
              <Button onClick={handleDeleteAccount} variant='destructive' className='h-9 px-4 text-xs font-bold gap-2'>
                <Trash2 className='h-3.5 w-3.5' /> Delete My Account
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* ── TAB 2: SECURITY ──────────────────────────────────────── */}
        <TabsContent value='security' className='space-y-6'>
          <Card className='p-6 bg-[#0c0d1c] border border-white/10 rounded-2xl space-y-6 shadow-xl max-w-2xl'>
            <div>
              <h3 className='text-lg font-bold font-display text-white flex items-center gap-2'>
                <Key className='h-4 w-4 text-pw-primary' /> Change Authentication Password
              </h3>
              <p className='text-xs text-pw-muted'>Ensure your account uses a secure password of 6 or more characters.</p>
            </div>

            <form onSubmit={handleUpdatePassword} className='space-y-4'>
              <div className='space-y-1.5'>
                <label className='text-xs font-bold uppercase tracking-wider text-pw-muted'>New Password</label>
                <Input
                  type='password'
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder='••••••••'
                  className='h-10 bg-white/5 border-white/10 text-xs'
                />
              </div>

              <div className='space-y-1.5'>
                <label className='text-xs font-bold uppercase tracking-wider text-pw-muted'>Confirm New Password</label>
                <Input
                  type='password'
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder='••••••••'
                  className='h-10 bg-white/5 border-white/10 text-xs'
                />
              </div>

              <Button type='submit' disabled={isUpdatingPassword} className='btn-primary h-10 px-6 text-xs font-bold gap-2'>
                <Shield className='h-3.5 w-3.5' /> {isUpdatingPassword ? 'Updating...' : 'Update Password'}
              </Button>
            </form>
          </Card>
        </TabsContent>

        {/* ── TAB 3: STORAGE & SYNC ────────────────────────────────── */}
        <TabsContent value='storage' className='space-y-6'>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            <Card className='p-5 bg-[#0c0d1c] border border-white/10 rounded-2xl space-y-2'>
              <span className='text-xs text-pw-muted font-bold uppercase'>Cached Quizzes</span>
              <p className='text-2xl font-extrabold text-white font-mono'>{cacheCounts.quizzes}</p>
            </Card>
            <Card className='p-5 bg-[#0c0d1c] border border-white/10 rounded-2xl space-y-2'>
              <span className='text-xs text-pw-muted font-bold uppercase'>Cached Messages</span>
              <p className='text-2xl font-extrabold text-white font-mono'>{cacheCounts.messages}</p>
            </Card>
            <Card className='p-5 bg-[#0c0d1c] border border-white/10 rounded-2xl space-y-2'>
              <span className='text-xs text-pw-muted font-bold uppercase'>Book Manuscripts</span>
              <p className='text-2xl font-extrabold text-white font-mono'>{cacheCounts.documents}</p>
            </Card>
          </div>

          <Card className='p-6 bg-[#0c0d1c] border border-white/10 rounded-2xl space-y-6 shadow-xl'>
            <div>
              <h3 className='text-lg font-bold font-display text-white'>Hybrid Edge Storage Management</h3>
              <p className='text-xs text-pw-muted'>
                Ping World uses an offline-first hybrid database architecture. Changes made while offline are saved to your browser and pushed when connected.
              </p>
            </div>

            <div className='flex items-center justify-between flex-wrap gap-4 pt-4 border-t border-white/5'>
              <div>
                <h4 className='text-xs font-bold text-white'>Force Synchronize Database</h4>
                <p className='text-[10px] text-pw-muted'>Manually push pending offline mutations to the remote database.</p>
              </div>
              <Button
                onClick={handleSyncOfflineQueue}
                disabled={isSyncingStorage}
                variant='outline'
                className='h-9 px-4 border-white/10 hover:bg-white/5 text-xs font-bold gap-2 text-pw-primary'>
                <RefreshCw className={cn('h-3.5 w-3.5', isSyncingStorage && 'animate-spin')} /> Synchronize Cloud
              </Button>
            </div>

            <div className='flex items-center justify-between flex-wrap gap-4 pt-4 border-t border-white/5'>
              <div>
                <h4 className='text-xs font-bold text-white'>Clear Local Storage Cache</h4>
                <p className='text-[10px] text-pw-muted'>Remove cached offline items and temporary working copies on this device.</p>
              </div>
              <Button
                onClick={handleClearCache}
                variant='outline'
                className='h-9 px-4 border-white/10 hover:bg-pw-danger/10 hover:border-pw-danger/30 text-pw-muted hover:text-pw-danger text-xs font-bold gap-2'>
                <Trash2 className='h-3.5 w-3.5' /> Clear Local Storage
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* ── TAB 4: PREFERENCES ───────────────────────────────────── */}
        <TabsContent value='preferences' className='space-y-6'>
          <Card className='p-6 bg-[#0c0d1c] border border-white/10 rounded-2xl space-y-6 shadow-xl max-w-2xl'>
            <div>
              <h3 className='text-lg font-bold font-display text-white'>Notification Preferences</h3>
              <p className='text-xs text-pw-muted'>Choose how you want to be notified of anonymous responses and submissions.</p>
            </div>

            <div className='space-y-4'>
              <div className='flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5'>
                <div className='flex items-center gap-3'>
                  <Mail className='h-4 w-4 text-pw-primary' />
                  <div>
                    <span className='text-xs font-bold text-white block'>Email Notifications</span>
                    <span className='text-[10px] text-pw-muted'>Receive weekly summaries of quiz completions</span>
                  </div>
                </div>
                <input
                  type='checkbox'
                  checked={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.checked)}
                  className='h-4 w-4 rounded accent-pw-primary cursor-pointer'
                />
              </div>

              {/* jules edit: Real Web Push Notification permission & Service Worker toggle */}
              <div className='flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5'>
                <div className='flex items-center gap-3'>
                  <Bell className='h-4 w-4 text-pw-primary' />
                  <div>
                    <span className='text-xs font-bold text-white block'>Web Push & Browser Notifications</span>
                    <span className='text-[10px] text-pw-muted'>
                      {pushPermission === 'granted' ?
                        'Browser push permission granted'
                      : 'Click to enable real browser push alerts via Service Worker'}
                    </span>
                  </div>
                </div>
                <input
                  type='checkbox'
                  checked={notifyWebPush}
                  onChange={handleToggleWebPush}
                  className='h-4 w-4 rounded accent-pw-primary cursor-pointer'
                />
              </div>

              <div className='flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5'>
                <div className='flex items-center gap-3'>
                  <Smartphone className='h-4 w-4 text-pw-primary' />
                  <div>
                    <span className='text-xs font-bold text-white block'>In-App Toast Alerts</span>
                    <span className='text-[10px] text-pw-muted'>Display real-time desktop toast badges for new messages</span>
                  </div>
                </div>
                <input
                  type='checkbox'
                  checked={notifyInApp}
                  onChange={(e) => setNotifyInApp(e.target.checked)}
                  className='h-4 w-4 rounded accent-pw-primary cursor-pointer'
                />
              </div>
            </div>

            <Button
              onClick={() => toast.success('Notification preferences updated!')}
              className='btn-primary h-10 px-6 text-xs font-bold gap-2'>
              <Save className='h-3.5 w-3.5' /> Save Preferences
            </Button>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
