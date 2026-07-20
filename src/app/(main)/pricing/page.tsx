'use client';

import { motion } from 'framer-motion';
import {
  CheckCircle,
  X,
  Sparkles,
  Zap,
  Crown,
  Rocket,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { PREMIUM_TIERS, type PremiumTier } from '@/lib/config/premium';
import { useAppContext } from '@/context/AppContext';
import { COMPANY } from '@/lib/config/company';

const TIER_ICONS: Record<PremiumTier, React.ReactNode> = {
  free: <Zap className='h-6 w-6' />,
  flexible: <Sparkles className='h-6 w-6' />,
  standard: <Crown className='h-6 w-6' />,
  pro: <Rocket className='h-6 w-6' />,
};

const FEATURES: {
  label: string;
  tiers: Record<PremiumTier, string | boolean>;
}[] = [
  {
    label: 'Quiz Builder',
    tiers: {
      free: '5 quizzes',
      flexible: '20 quizzes',
      standard: '100 quizzes',
      pro: 'Unlimited',
    },
  },
  {
    label: 'Quiz / Message Expiry',
    tiers: {
      free: '2 days',
      flexible: '3–7 days',
      standard: '7–14 days',
      pro: 'Up to 30 days',
    },
  },
  {
    label: 'Anonymous Messages',
    tiers: {
      free: '20 messages',
      flexible: '100 messages',
      standard: '500 messages',
      pro: 'Unlimited',
    },
  },
  {
    label: 'Public Message Board',
    tiers: { free: false, flexible: true, standard: true, pro: true },
  },
  {
    label: 'AI Requests / day',
    tiers: { free: '5', flexible: '15', standard: '30', pro: '60' },
  },
  {
    label: 'Pro-exclusive Tools',
    tiers: { free: false, flexible: false, standard: false, pro: true },
  },
  {
    label: 'CSV Export',
    tiers: { free: true, flexible: true, standard: true, pro: true },
  },
  {
    label: 'Priority Support',
    tiers: { free: false, flexible: false, standard: true, pro: true },
  },
];

const TIER_ORDER: PremiumTier[] = ['free', 'flexible', 'standard', 'pro'];

export default function PricingPage() {
  const { premiumTier } = useAppContext();

  return (
    <div className='relative overflow-hidden min-h-[calc(100vh-64px)] pb-20'>
      {/* Background decoration */}
      <div className='orb orb-primary w-[600px] h-[600px] -top-60 -right-40 opacity-15' />
      <div className='orb orb-secondary w-[400px] h-[400px] bottom-20 -left-40 opacity-10' />

      <div className='container relative mx-auto px-4 sm:px-6 pt-14 max-w-7xl'>
        {/* Header */}
        <div className='text-center mb-16'>
          <div className='badge border-pw-primary/20 bg-pw-primary/10 text-pw-primary mb-4 mx-auto'>
            <Sparkles className='h-3.5 w-3.5' />
            Pricing
          </div>
          <h1 className='text-4xl sm:text-5xl font-extrabold font-display mb-4 leading-[1.1]'>
            Simple, <span className='gradient-text'>transparent</span> pricing.
          </h1>
          <p className='text-pw-muted max-w-lg mx-auto'>
            Start free, upgrade when you need more power. All plans include core{' '}
            {COMPANY.name} utilities.
          </p>
        </div>

        {/* Tier Cards */}
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-20'>
          {TIER_ORDER.map((tierId, i) => {
            const tier = PREMIUM_TIERS[tierId];
            const isCurrent = premiumTier === tierId;
            const isPopular = tierId === 'standard';
            const isPro = tierId === 'pro';

            return (
              <motion.div
                key={tierId}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}>
                <Card
                  className={cn(
                    'relative p-6 flex flex-col h-full transition-all hover:scale-[1.02] border bg-card/40 bkblur',
                    isPopular &&
                      'bg-pw-primary/5 shadow-2xl shadow-pw-primary/10 border-pw-primary',
                    isPro &&
                      'bg-pw-warning/5 shadow-2xl shadow-pw-warning/10 border-pw-warning',
                  )}>
                  {isPopular && (
                    <div
                      className='px-4 py-1 rounded-full bg-pw-primary text-white text-[10px] font-black uppercase tracking-widest shadow-lg'
                      style={{ maxWidth: 'max-content' }}>
                      Most Popular
                    </div>
                  )}

                  {/* Icon + name */}
                  <div className='flex items-center gap-3 mb-4 mt-1'>
                    <div
                      className='h-10 w-10 rounded-xl flex items-center justify-center border'
                      style={{
                        backgroundColor: `${tier.color}15`,
                        borderColor: `${tier.color}30`,
                        color: tier.color,
                      }}>
                      {TIER_ICONS[tierId]}
                    </div>
                    <div>
                      <h3 className='text-lg font-bold'>{tier.label}</h3>
                      <span
                        className='text-[9px] font-black uppercase tracking-widest'
                        style={{ color: tier.color }}>
                        {tier.badge}
                      </span>
                    </div>
                  </div>

                  {/* Price */}
                  <div className='mb-6'>
                    {tier.price.monthly === null ?
                      <div className='flex items-baseline gap-1'>
                        <span className='text-4xl font-black font-display'>
                          $0
                        </span>
                        <span className='text-sm text-pw-muted'>/forever</span>
                      </div>
                    : <div className='flex items-baseline gap-1'>
                        <span className='text-4xl font-black font-display'>
                          ${tier.price.monthly}
                        </span>
                        <span className='text-sm text-pw-muted'>/mo</span>
                      </div>
                    }
                    {tier.price.yearly && (
                      <p className='text-[11px] text-pw-muted mt-1'>
                        or ${tier.price.yearly}/year (save{' '}
                        {Math.round(
                          (1 - tier.price.yearly / (tier.price.monthly! * 12)) *
                            100,
                        )}
                        %)
                      </p>
                    )}
                  </div>

                  {/* Feature highlights */}
                  <ul className='space-y-2.5 flex-1 mb-6'>
                    <li className='flex items-center gap-2 text-xs'>
                      <CheckCircle className='h-3.5 w-3.5 text-pw-success shrink-0' />
                      <span>
                        {tier.maxQuizzes === Infinity ?
                          'Unlimited'
                        : tier.maxQuizzes}{' '}
                        quizzes
                      </span>
                    </li>
                    <li className='flex items-center gap-2 text-xs'>
                      <CheckCircle className='h-3.5 w-3.5 text-pw-success shrink-0' />
                      <span>
                        {tier.maxMessages === Infinity ?
                          'Unlimited'
                        : tier.maxMessages}{' '}
                        messages
                      </span>
                    </li>
                    <li className='flex items-center gap-2 text-xs'>
                      <CheckCircle className='h-3.5 w-3.5 text-pw-success shrink-0' />
                      <span>Up to {tier.maxExpiryDays} day expiry</span>
                    </li>
                    <li className='flex items-center gap-2 text-xs'>
                      {tier.publicInbox ?
                        <CheckCircle className='h-3.5 w-3.5 text-pw-success shrink-0' />
                      : <X className='h-3.5 w-3.5 text-pw-muted/40 shrink-0' />}
                      <span
                        className={!tier.publicInbox ? 'text-pw-muted/50' : ''}>
                        Public inbox
                      </span>
                    </li>
                    <li className='flex items-center gap-2 text-xs'>
                      {tier.proTools ?
                        <CheckCircle className='h-3.5 w-3.5 text-pw-success shrink-0' />
                      : <X className='h-3.5 w-3.5 text-pw-muted/40 shrink-0' />}
                      <span
                        className={!tier.proTools ? 'text-pw-muted/50' : ''}>
                        Pro tools access
                      </span>
                    </li>
                  </ul>

                  {/* CTA */}
                  <Button
                    disabled={isCurrent}
                    className={cn(
                      'w-full h-11 font-bold text-sm gap-2 transition-all relative',
                      isCurrent ?
                        'bg-white/10 text-pw-muted cursor-default border border-white/10'
                      : isPopular ? 'btn-primary shadow-xl shadow-pw-primary/20'
                      : 'bg-white/5 border border-white/10 hover:bg-white/10 text-pw-text',
                      isPro && 'btn-premium',
                    )}>
                    {isCurrent ?
                      'Current Plan'
                    : tierId === 'pro' ?
                      <>
                        Become Pro
                        <Rocket className='h-4 w-4' />
                      </>
                    : <>
                        Upgrade <ArrowRight className='h-4 w-4' />
                      </>
                    }
                  </Button>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Feature Comparison Table */}
        <div className='mb-20'>
          <h2 className='text-2xl font-bold font-display text-center mb-8'>
            Feature Comparison
          </h2>
          <Card className='card-glow overflow-hidden'>
            <div className='overflow-x-auto'>
              <table className='w-full text-sm'>
                <thead>
                  <tr className='border-b border-white/10'>
                    <th className='text-left p-4 text-pw-muted font-bold uppercase text-[10px] tracking-widest'>
                      Feature
                    </th>
                    {TIER_ORDER.map((t) => (
                      <th
                        key={t}
                        className='p-4 text-center font-bold uppercase text-[10px] tracking-widest'
                        style={{ color: PREMIUM_TIERS[t].color }}>
                        {PREMIUM_TIERS[t].label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FEATURES.map((feat, i) => (
                    <tr
                      key={feat.label}
                      className={cn(
                        'border-b border-white/5',
                        i % 2 === 0 ? 'bg-white/[0.02]' : '',
                      )}>
                      <td className='p-4 font-medium text-pw-text'>
                        {feat.label}
                      </td>
                      {TIER_ORDER.map((t) => {
                        const val = feat.tiers[t];
                        return (
                          <td
                            key={t}
                            className='p-4 text-center'>
                            {typeof val === 'boolean' ?
                              val ?
                                <CheckCircle className='h-4 w-4 text-pw-success mx-auto' />
                              : <X className='h-4 w-4 text-pw-muted/30 mx-auto' />

                            : <span className='text-xs font-mono font-bold text-pw-text'>
                                {val}
                              </span>
                            }
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* FAQ / Bottom CTA */}
        <div className='text-center'>
          <p className='text-sm text-pw-muted'>
            Questions? Reach out at{' '}
            <a
              href={`mailto:${COMPANY.supportEmail}`}
              className='text-pw-primary hover:underline font-medium'>
              {COMPANY.supportEmail}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
