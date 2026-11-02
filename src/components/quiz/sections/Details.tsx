'use client';

import type { Quiz } from '@/app/(main)/quiz';
import { useAppModal } from '@/components/ui/AppModalProvider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { calculateDobAgeYears, formatDobAge, formatDobToWords } from '@/lib/quiz/quiz-piping';
import { capFirst, cn } from '@/lib/utils';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

export default function Details({
  quiz,
  startAssessment,
  setDetailsCollected,
  setUserData,
  userData,
}: {
  quiz: Quiz | null;
  userData: Record<string, string>;
  setDetailsCollected: (v: boolean) => void;
  startAssessment: (initialUserData?: Record<string, string>) => void;
  setUserData: (value: React.SetStateAction<Record<string, string>>) => void;
}) {
  const { showAlert } = useAppModal();
  return (
    <div
      key='inner-details-view'
      className='container relative z-10 mx-auto px-5 py-10 max-w-lg flex-1 flex flex-col justify-center'>
      <div className='sm:bg-white/5 sm:p-6 sm:rounded-[2.5rem] sm:border sm:border-white/10 sm:shadow-2xl sm:glass sm:bkblur'>
        <h3 className='text-sm font-bold mb-8 mt-4 uppercase tracking-widest text-center'>
          ENTER YOUR DETAILS
        </h3>
        <div className='space-y-4'>
          {quiz?.askDetails?.map((detail, idx) => (
            <div
              key={(detail?.title as string) + idx}
              className='space-y-1'>
              <label className='text-[10px] font-bold text-pw-muted uppercase ml-2'>
                {detail.title || 'Enter Detail'}
              </label>
              {detail.type === 'sex' ?
                <div className='flex gap-3'>
                  {['Male', 'Female'].map((s, idx) => (
                    <Button
                      key={s + 'detail-field' + idx}
                      variant='outline'
                      onClick={() =>
                        setUserData({ ...userData, [detail.title]: s })
                      }
                      className={cn(
                        'flex-1 h-11 rounded-2xl transition-all',
                        userData[detail.title] === s ?
                          'bg-pw-primary text-white border-pw-primary shadow-lg shadow-pw-primary/30'
                        : 'bg-black/20 hover:bg-black/40',
                      )}>
                      {s}
                    </Button>
                  ))}
                </div>
              : detail.type === 'dropdown' ?
                <div
                  className='flex gap-2 w-full'
                  style={{
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                  <p className='title font-bold'>{detail.title}</p>

                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className={'w-[40%] min-w-[100px] overflow-hidden'}>
                      <Button
                        variant='outline'
                        className='h-8 text-xs w-full flex justify-between rounded-xl bg-pw-surface/60 bkblur'>
                        {userData[detail.title] || 'Select'}
                        <ChevronDown size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className='w-56 bg-pw-surface/70 bkblur border-white/10 rounded-2xl'>
                      {detail.options?.map((opt, index) => (
                        <DropdownMenuItem
                          key={opt + index + 'dropdown-option'}
                          onClick={() =>
                            setUserData({
                              ...userData,
                              [detail.title]: opt,
                            })
                          }
                          className='h-8 rounded-xl focus:bg-pw-primary/10 cursor-pointer group justify-between gap-1 text-white hover:text-white'>
                          <span className='line-clamp-1 truncate'>
                            {capFirst(opt)}
                          </span>{' '}
                          <ChevronRight className='group-hover:scale-1.05' />
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              : detail.type === 'dob' ?
                <>
                  <input
                    type={'date'}
                    max={(() => {
                      const latest = new Date();
                      latest.setFullYear(
                        latest.getFullYear() -
                          Math.max(0, Number(detail.minAge) || 0),
                      );
                      return new Date(
                        latest.getTime() - latest.getTimezoneOffset() * 60_000,
                      )
                        .toISOString()
                        .slice(0, 10);
                    })()}
                    className='w-full h-12 bg-black/20 border border-white/10 rounded-2xl px-5 text-sm focus:border-pw-primary outline-none transition-all focus:ring-1 focus:ring-pw-primary bkblur'
                    placeholder={`Enter ${detail.title}...`}
                    value={userData[detail.title] || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      const today = new Date(
                        Date.now() - new Date().getTimezoneOffset() * 60_000,
                      )
                        .toISOString()
                        .slice(0, 10);
                      if (value > today) {
                        toast.error('Date of birth cannot be in the future.');
                        return;
                      }
                      if (value && detail.minAge) {
                        const ageYears = calculateDobAgeYears(value);
                        if (ageYears === null || ageYears < Number(detail.minAge)) {
                          toast.error(
                            `You're not old enough to assess this ${quiz.type}.`,
                          );
                          return;
                        }
                      }
                      setUserData({ ...userData, [detail.title]: value });
                    }}
                  />
                  {userData[detail.title] && (
                    <p className='text-xs py-1 pl-1 text-pw-primary font-medium'>
                      {formatDobToWords(userData[detail.title])}{' '}
                      <span className='text-pw-muted'>
                        (age {formatDobAge(userData[detail.title])})
                      </span>
                    </p>
                  )}
                </>
              : <input
                  type={
                    detail.type === 'email' ? 'email'
                    : detail.type === 'tel' ?
                      'tel'
                    : detail.type === 'date' ?
                      'date'
                    : detail.type === 'number' ?
                      'number'
                    : 'text'
                  }
                  minLength={
                    (
                      detail.type === 'tel' ||
                      detail.type === 'number' ||
                      detail.type === 'input'
                    ) ?
                      detail.minLength
                    : undefined
                  }
                  maxLength={
                    (
                      detail.type === 'tel' ||
                      detail.type === 'number' ||
                      detail.type === 'input'
                    ) ?
                      detail.maxLength
                    : undefined
                  }
                  className='w-full h-12 bg-black/20 border border-white/10 rounded-2xl px-5 text-sm focus:border-pw-primary outline-none transition-all focus:ring-1 focus:ring-pw-primary bkblur'
                  placeholder={`Enter ${detail.title}...`}
                  value={userData[detail.title] || ''}
                  onChange={(e) =>
                    setUserData({
                      ...userData,
                      [detail.title]: e.target.value,
                    })
                  }
                />
              }
              {(detail.minLength || detail.maxLength) && (
                <div className='flex justify-between items-center text-[10px] px-1 text-pw-muted mt-1'>
                  <span>
                    {detail.minLength === detail.maxLength ?
                      `${detail.maxLength} chars expected`
                    : `
                                  ${detail.minLength ? `Min: ${detail.minLength} chars` : ''}
                                  ${detail.minLength && detail.maxLength ? ' • ' : ''}
                                  ${detail.maxLength ? `Max: ${detail.maxLength} chars` : ''}
                                  `
                    }
                  </span>
                  <span
                    className={cn(
                      'font-mono',
                      detail.minLength &&
                        (userData[detail.title]?.length || 0) <
                          detail.minLength &&
                        'text-pw-warning',
                      detail.maxLength &&
                        (userData[detail.title]?.length || 0) >
                          detail.maxLength &&
                        'text-pw-danger font-bold',
                    )}>
                    {(userData[detail.title] || '').length}
                    {detail.maxLength ? `/${detail.maxLength}` : ' chars'}
                  </span>
                </div>
              )}
            </div>
          ))}
          <Button
            className='btn-primary h-10 sm:h-12 w-full mt-6 text-lg font-bold shadow-xl shadow-pw-primary/20'
            onClick={() => {
              const complete = quiz?.askDetails?.every(
                (d) =>
                  userData[d.title] && String(userData[d.title]).trim() !== '',
              );
              if (!complete)
                return toast.error('Required detail fields are missing.');

              let validationError = '';
              let mismatch = false;
              const cleanUserData: Record<string, any> = { ...userData };

              for (const d of quiz?.askDetails || []) {
                const rawEntered = userData[d.title];
                const val =
                  typeof rawEntered === 'string' ?
                    rawEntered.trim()
                  : String(rawEntered || '').trim();
                cleanUserData[d.title] = val;

                // 1. Min length validation
                if (
                  d.minLength !== undefined &&
                  d.minLength !== null &&
                  val.length < d.minLength
                ) {
                  validationError = `${d.title || 'Field'} must be at least ${d.minLength} characters (currently ${val.length}).`;
                  break;
                }

                // 2. Max length validation
                if (
                  d.maxLength !== undefined &&
                  d.maxLength !== null &&
                  val.length > d.maxLength
                ) {
                  validationError = `${d.title || 'Field'} cannot exceed ${d.maxLength} characters.`;
                  break;
                }

                // 3. Restricted / Prohibited keywords validation
                if (
                  (d as any).restrictedKeywords &&
                  String((d as any).restrictedKeywords).trim() !== ''
                ) {
                  const rawRestricted = String(
                    (d as any).restrictedKeywords,
                  ).trim();
                  const restrictedList = rawRestricted
                    .split(',')
                    .map((k) => k.trim().toLowerCase())
                    .filter(Boolean);
                  const valLower = val.toLowerCase();

                  let matchedRestricted: string | null = null;
                  for (const rk of restrictedList) {
                    if (valLower.includes(rk)) {
                      matchedRestricted = rk;
                      break;
                    }
                  }

                  if (!matchedRestricted) {
                    try {
                      const regex = new RegExp(rawRestricted, 'i');
                      if (regex.test(val)) {
                        matchedRestricted = rawRestricted;
                      }
                    } catch {}
                  }

                  if (matchedRestricted) {
                    validationError = `Invalid input: "${d.title}" contains restricted keyword ("${matchedRestricted}").`;
                    break;
                  }
                }

                // 4. Administrative Allowlist validation
                if (d.allowlist && d.allowlist.trim() !== '') {
                  const rawAllow = d.allowlist.trim();
                  const allowedItems = rawAllow
                    .split(',')
                    .map((item) => item.trim());

                  let matched = allowedItems.some(
                    (item) => item.toLowerCase() === val.toLowerCase(),
                  );

                  if (!matched) {
                    try {
                      const regex = new RegExp(rawAllow, 'i');
                      matched = regex.test(val);
                    } catch {}
                  }

                  if (!matched) {
                    mismatch = true;
                    showAlert(
                      quiz?.allowlistMessage ||
                        `Access Denied: The entered ${d.title} ("${val}") does not match the required administrative allowlist.`,
                    );
                    break;
                  }
                }
              }

              if (validationError) {
                toast.error(validationError);
                return;
              }

              if (mismatch) return;

              setUserData(cleanUserData);
              setDetailsCollected(true);
              startAssessment(cleanUserData);
            }}>
            START {quiz?.type?.toUpperCase() || 'ASSESSMENT'}
          </Button>
        </div>
      </div>
    </div>
  );
}
