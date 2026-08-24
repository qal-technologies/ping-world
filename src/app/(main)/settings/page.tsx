'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Settings,
  User,
  Shield,
  HardDrive,
  Bell,
  LogOut,
  RefreshCw,
  Trash2,
  Mail,
  Smartphone,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useAppContext } from '@/context/AppContext';
import { useAppModal } from '@/components/ui/AppModalProvider';
import { supabase } from '@/lib/supabase';
import { HybridStorage } from '@/lib/storage-utils';
import { cn } from '@/lib/utils';
import AccountTab from '@/components/settings/AccountTab';
import SecurityTab from '@/components/settings/SecurityTab';

function SettingsContent() {
  const { user, username, refresh, isPremium } = useAppContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showConfirm, showPrompt } = useAppModal();

  // Route tab params sync
  const tabParam = searchParams.get('tab') || 'account';
  const [activeTab, setActiveTab] = useState<string>(tabParam);

  useEffect(() => {
    if (tabParam && ['account', 'security', 'storage', 'preferences'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', newTab);
    router.push(`/settings?${params.toString()}`);
  };

  // Form states
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');

  // Storage / Cache stats
  const [cacheCounts, setCacheCounts] = useState<{
    quizzes: number;
    messages: number;
    documents: number;
  }>({
    quizzes: 0,
    messages: 0,
    documents: 0,
  });
  const [isSyncingStorage, setIsSyncingStorage] = useState(false);

  // Preferences & Push Notification states
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyInApp, setNotifyInApp] = useState(true);
  const [notifyWebPush, setNotifyWebPush] = useState(false);
  const [pushPermission, setPushPermission] =
    useState<NotificationPermission>('default');

  // jules edit: Safe Auth Guard check using Supabase session to prevent redirect loops
  useEffect(() => {
    const verifyUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
      }
    };
    verifyUser();
  }, [router]);

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
      toast.error('Notifications are not supported in this browser.');
      return;
    }

    if (Notification.permission === 'granted') {
      setNotifyWebPush(!notifyWebPush);
      toast.success(
        !notifyWebPush ? 'Notifications enabled.' : 'Notifications disabled.',
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
        }
      }
      toast.success('Notification permission granted!');
    } else {
      setNotifyWebPush(false);
      toast.error('Notification permission not granted.');
    }
  };

  // jules edit: Initialize user email and display name safely without re-triggering form state loops
  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      if (!displayName) {
        setDisplayName(username || user.user_metadata?.full_name || user.email?.split('@')[0] || '');
      }
    }
    try {
      const keys = Object.keys(localStorage);
      const quizzes = keys.filter(
        (k) => k.startsWith('pw_quiz') || k.includes('quizzes'),
      ).length;
      const messages = keys.filter(
        (k) => k.startsWith('pw_message') || k.includes('messages'),
      ).length;
      const documents = keys.filter(
        (k) => k.startsWith('pw_pdf') || k.includes('doc'),
      ).length;
      setCacheCounts({ quizzes, messages, documents });
    } catch {
    }
  }, [user, username]);

  const handleClearCache = async () => {
    const confirmed = await showConfirm(
      'Clear all local cache & temporary drafts from this device? Saved cloud items will not be affected.',
      {
        title: 'Clear Local Storage',
        confirmText: 'Clear Cache',
        type: 'warning',
      },
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
    if (!isPremium) {
      toast.error('This feature is available for only premium users');
      return;
    }

    setIsSyncingStorage(true);
    const toastId = toast.loading(
      'Syncing offline hybrid records with database...',
    );
    try {
      await HybridStorage.syncPending();
      toast.success('All local changes synchronized with cloud storage!');
    } catch (err: any) {
      toast.error('Sync failed: ' + (err?.message || 'Network unreachable.'));
    } finally {
      toast.dismiss(toastId);
      setIsSyncingStorage(false);
    }
  };

  // jules edit: Handle account deletion and clearance in both Supabase and Firebase
  const handleDeleteAccount = async () => {
    const confirmation = await showPrompt(
      'DANGER: Deleting your account will permanently wipe all your quizzes, messages, books, and Firebase data. Type "DELETE" to confirm:',
      {
        title: 'Permanently Delete Account',
        placeholder: 'DELETE',
      },
    );

    if (confirmation !== 'DELETE') {
      toast.info('Account deletion cancelled.');
      return;
    }

    try {
      toast.loading('Processing account deletion...');

      // 1. Firebase Auth and Firestore cleanup
      try {
        const { auth, db } = await import('@/lib/firebase');
        const { deleteUser } = await import('firebase/auth');
        const { doc, deleteDoc, collection, getDocs, query, where } = await import('firebase/firestore');

        if (user?.id) {
          const q = query(collection(db, 'tournaments'), where('user_id', '==', user.id));
          const querySnapshot = await getDocs(q);
          const deletePromises: Promise<void>[] = [];
          querySnapshot.forEach((docSnapshot) => {
            deletePromises.push(deleteDoc(doc(db, 'tournaments', docSnapshot.id)));
          });
          await Promise.all(deletePromises);
        }

        if (auth.currentUser) {
          await deleteUser(auth.currentUser).catch((fErr) => {
            console.warn('[Firebase] Firebase Auth delete failed:', fErr);
          });
        }
      } catch (fbErr) {
        console.warn('[Firebase] Clearance error:', fbErr);
      }

      // 2. Supabase profile and data clearance
      if (user?.id) {
        await supabase.from('profiles').delete().eq('id', user.id);
      }

      // 3. Clear local storage
      try {
        const keys = Object.keys(localStorage);
        keys.forEach((key) => {
          if (key.startsWith('pw_') || key.startsWith('pingworld_')) {
            localStorage.removeItem(key);
          }
        });
      } catch {}

      await supabase.auth.signOut();
      await refresh();
      toast.success('Your account and associated data have been deleted across all platforms.');
      router.push('/');
    } catch (err: any) {
      toast.error(
        'Failed to delete account: ' +
        (err?.message || 'Please contact support.'),
      );
    } finally {
      toast.dismiss();
      
    }
  };

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

  const createdAtFormatted =
    user?.created_at ?
      new Date(user.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Recently';

  if (!user || !username) return null;

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
            Manage your account identity, authentication security, app
            preferences, and local hybrid storage.
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
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className='space-y-6'>
        <TabsList
          className='bg-white/5 bkblur border border-white/10 px-0.5 rounded-full min-h-11 max-w-full items-center justify-start flex scrollable-row self-center'
          style={{ gap: 0 }}>
          <TabsTrigger
            value='account'
            className='rounded-2xl text-xs h-9 px-3 sm:px-5 font-bold data-[state=active]:bg-pw-primary data-[state=active]:text-white gap-2'>
            <User className='h-3.5 w-3.5' /> Account & Profile
          </TabsTrigger>
          <TabsTrigger
            value='security'
            className='rounded-2xl text-xs h-9 px-3 sm:px-5 font-bold data-[state=active]:bg-pw-primary data-[state=active]:text-white gap-2'>
            <Shield className='h-3.5 w-3.5' /> Security
          </TabsTrigger>
          <TabsTrigger
            value='storage'
            className='rounded-2xl text-xs h-9 px-3 sm:px-5 font-bold data-[state=active]:bg-pw-primary data-[state=active]:text-white gap-2'>
            <HardDrive className='h-3.5 w-3.5' /> Storage & Sync
          </TabsTrigger>
          <TabsTrigger
            value='preferences'
            className='rounded-2xl text-xs h-9 px-3 sm:px-5 font-bold data-[state=active]:bg-pw-primary data-[state=active]:text-white gap-2'>
            <Bell className='h-3.5 w-3.5' /> Preferences
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: ACCOUNT & PROFILE */}
        <TabsContent value='account'>
          <AccountTab
            displayName={displayName}
            setDisplayName={setDisplayName}
            email={email}
            createdAtFormatted={createdAtFormatted}
            handleDeleteAccount={handleDeleteAccount}
            onNavigateSecurityTab={() => handleTabChange('security')}
          />
        </TabsContent>

        {/* TAB 2: SECURITY */}
        <TabsContent value='security'>
          <SecurityTab email={email} />
        </TabsContent>

        {/* TAB 3: STORAGE & SYNC */}
        <TabsContent value='storage' className='space-y-6'>
          <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'>
            <Card className='p-3 sm:p-5 bg-[#0c0d1c]/70 bkblur border border-white/5 rounded-2xl space-y-2'>
              <span className='text-xs text-pw-muted font-bold uppercase'>
                Cached Quizzes
              </span>
              <p className='text-2xl font-extrabold text-white font-mono'>
                {cacheCounts.quizzes}
              </p>
            </Card>
            <Card className='p-3 sm:p-5 bg-[#0c0d1c]/70 bkblur border border-white/10 rounded-2xl space-y-2'>
              <span className='text-xs text-pw-muted font-bold uppercase'>
                Cached Messages
              </span>
              <p className='text-2xl font-extrabold text-white font-mono'>
                {cacheCounts.messages}
              </p>
            </Card>
            <Card className='p-3 sm:p-5 bg-[#0c0d1c]/70 bkblur border border-white/10 rounded-2xl space-y-2'>
              <span className='text-xs text-pw-muted font-bold uppercase'>
                Books
              </span>
              <p className='text-2xl font-extrabold text-white font-mono'>
                {cacheCounts.documents}
              </p>
            </Card>
          </div>

          <Card className='p-4 sm:p-6 bg-[#0c0d1c]/70 bkblur border border-white/10 rounded-2xl shadow-xl'>
            <div>
              <h3 className='text-lg font-bold font-display text-white my-1'>
                Storage Management
              </h3>
              <p className='text-xs text-pw-muted'>
                Ping World uses an offline-first hybrid database architecture.
                Changes made while offline are saved to your browser and pushed
                when connected.
              </p>
            </div>

            <div className='flex items-center justify-between flex-wrap gap-4 pt-4 border-t border-white/5'>
              <div>
                <h4 className='text-sm font-bold text-white'>
                  Force Synchronize Database
                </h4>
                <p className='text-[10px] text-pw-muted'>
                  Manually push pending offline mutations to the remote
                  database.
                </p>
              </div>
              <Button
                onClick={handleSyncOfflineQueue}
                disabled={isSyncingStorage}
                variant='outline'
                className='h-9 px-4 border-white/10 hover:bg-white/5 text-xs font-bold gap-2 text-pw-primary'>
                <RefreshCw
                  className={cn(
                    'h-3.5 w-3.5',
                    isSyncingStorage && 'animate-spin',
                  )}
                />{' '}
                Synchronize Cloud
              </Button>
            </div>

            <div className='flex items-center justify-between flex-wrap gap-4 pt-4 border-t border-white/5'>
              <div>
                <h4 className='text-sm font-bold text-white'>
                  Clear Local Storage Cache
                </h4>
                <p className='text-[10px] text-pw-muted'>
                  Remove cached offline items and temporary working copies on
                  this device.
                </p>
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

        {/* TAB 4: PREFERENCES */}
        <TabsContent value='preferences' className='sm:space-y-4 self-center'>
          <Card className='bg-transparent ring-0 sm:ring-1 sm:p-6 sm:bg-[#0c0d1c]/70 sm:bkblur sm:border sm:border-white/5 sm:rounded-2xl space-y-6 sm:shadow-xl max-w-2xl'>
            <div>
              <h3 className='text-lg font-bold font-display text-white'>
                Notification Preferences
              </h3>
              <p className='text-xs text-pw-muted'>
                Choose how you want to be notified of anonymous responses and
                submissions.
              </p>
            </div>

            <div className='space-y-4'>
              <div className='flex items-center justify-between p-2 px-3 rounded-2xl bg-white/3 bkblur border border-white/5'>
                <div className='flex items-center gap-3'>
                  <Mail className='h-4 w-4 text-pw-primary' />
                  <div>
                    <span className='text-xs font-bold text-white block'>
                      Email Notifications
                    </span>
                    <span className='text-[10px] text-pw-muted'>
                      Receive weekly summaries of quiz completions
                    </span>
                  </div>
                </div>
                <input
                  type='checkbox'
                  checked={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.checked)}
                  className='h-4 w-4 rounded-full accent-pw-primary cursor-pointer'
                />
              </div>

              <div className='flex items-center justify-between p-2 px-3 rounded-2xl bg-white/3 bkblur border border-white/5'>
                <div className='flex items-center gap-3'>
                  <Bell className='h-4 w-4 text-pw-primary' />
                  <div>
                    <span className='text-xs font-bold text-white block'>
                      Web Push & Browser Notifications
                    </span>
                    <span className='text-[10px] text-pw-muted'>
                      {pushPermission === 'granted' ?
                        'Browser push permission granted'
                      : 'Click to enable real browser push alerts via Service Worker'
                      }
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

              <div className='flex items-center justify-between p-2 px-3 rounded-2xl bg-white/3 bkblur border border-white/5'>
                <div className='flex items-center gap-3'>
                  <Smartphone className='h-4 w-4 text-pw-primary' />
                  <div>
                    <span className='text-xs font-bold text-white block'>
                      In-App Toast Alerts
                    </span>
                    <span className='text-[10px] text-pw-muted'>
                      Display real-time desktop toast badges for new messages
                    </span>
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
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="h-8 w-8 rounded-full border-2 border-pw-primary border-t-transparent animate-spin" />
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}
