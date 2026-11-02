'use client';

import { quizHaptic, type Quiz } from '@/app/(main)/quiz';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { LoaderCircle, Lock } from 'lucide-react';
import type React from 'react';
import {useState} from 'react';
import { toast } from 'sonner';

export default function Private({
  quiz,
  routeParamId,
}: {
  quiz: Quiz;
  routeParamId: any;
    }) {
    
    const [isCheckingPrivateAccess, setIsCheckingPrivateAccess] = useState(false);
      const [privateAccessKey, setPrivateAccessKey] = useState('');
    
  const verifyPrivateAccess = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (isCheckingPrivateAccess) return;
      setIsCheckingPrivateAccess(true);
      
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch(
        `/api/quizzes/${encodeURIComponent(quiz.id)}/access`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(sessionData.session?.access_token ?
              { Authorization: `Bearer ${sessionData.session.access_token}` }
            : {}),
          },
          body: JSON.stringify({ key: privateAccessKey }),
          cache: 'no-store',
          credentials: 'omit',
        },
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(result.error || 'Access could not be verified.');
      if (!result.accessToken)
        throw new Error('Could not start a secure assessment session.');
      sessionStorage.setItem(
        `pw_private_quiz_access_v1_${quiz.id}`,
        result.accessToken,
      );
      if (routeParamId)
        sessionStorage.setItem(
          `pw_private_quiz_access_v1_${routeParamId}`,
          result.accessToken,
        );
      setPrivateAccessKey('');
      quizHaptic(30);
      window.location.reload();
    } catch (error) {
      toast.error(
        error instanceof Error ?
          error.message
        : 'Access could not be verified.',
      );
    } finally {
      setIsCheckingPrivateAccess(false);
    }
  };
  return (
    <div className='flex min-h-screen items-center justify-center bg-[#0A0C1B] p-4 text-white'>
      <Card className='w-full max-w-md space-y-5 border-white/10 bg-pw-surface/90 p-6 shadow-2xl backdrop-blur-xl'>
        <div className='flex items-center gap-3'>
          <Lock className='text-pw-primary' />
          <div>
            <h1 className='text-xl font-bold'>Private assessment</h1>
            <p className='text-sm text-pw-muted'>
              Enter the access key to continue.
            </p>
          </div>
        </div>
        <form
          className='space-y-3'
          onSubmit={verifyPrivateAccess}>
          <Input
            autoComplete='off'
            value={privateAccessKey}
            onChange={(event) => setPrivateAccessKey(event.target.value)}
            placeholder='Assessment access key'
            aria-label='Assessment access key'
          />
          <Button
            className='btn-primary w-full'
            type='submit'
            disabled={isCheckingPrivateAccess || !privateAccessKey.trim()}>
            {isCheckingPrivateAccess ?
              <>
                <LoaderCircle className='mr-2 h-4 w-4 animate-spin' />
                Checking access...
              </>
            : 'Continue'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
