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
  Brain,
  MessageCircle,
  FileText,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  PREMIUM_TIERS,
  type PremiumTier,
  FLEXIBLE_FEATURES,
} from '@/lib/config/premium';
import { useAppContext } from '@/context/AppContext';
import { COMPANY } from '@/lib/config/company';
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

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

const TOOL_BENEFITS = [
  {
    id: 'quizzable',
    title: 'Quizzable Pro',
    icon: Brain,
    textColor: 'text-pw-primary',
    free: 'Create 5 quizzes with up to 4 options/question.',
    premium:
      'Unlock unlimited questions, more than 4 options, full responsive background images, local logo uploads, and 30-day lifespans.',
  },
  {
    id: 'composer',
    title: 'Creator Hub (Post Composer)',
    icon: Sparkles,
    textColor: 'text-pw-secondary',
    free: 'Basic writing with platform previews.',
    premium:
      'Unlock AI suggestions, translation, branding overlays, draggable logos, and unlimited post draft history syncing.',
  },
  {
    id: 'anonlink',
    title: 'Anonymous Feedback Link',
    icon: MessageCircle,
    textColor: 'text-pw-success',
    free: 'Standard inbox, 2-day lifespan limit.',
    premium:
      'Custom link-id alias, personalized questions, 30-day lifespan, and guest-read Public Message Boards.',
  },
  {
    id: 'pdf-tools',
    title: 'PDF Tool Studio',
    icon: FileText,
    textColor: 'text-pw-warning',
    free: 'Basic document compilation.',
    premium:
      'Chapter-to-page book flow, automatic metrics, title & footer editing, and true textual stream extraction converters.',
  },
];

export default function PricingPage() {
  const { premiumTier, refresh, user } = useAppContext();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTierId, setSelectedTierId] = useState<PremiumTier | null>(
    null,
  );
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>(
    'monthly',
  );
  const [isSimulating, setIsSimulating] = useState(false);

  const [selectedFlexibleToolId, setSelectedFlexibleToolId] =
    useState<string>('all');

  const [currency, setCurrency] = useState('USD');
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    if (!navigator.onLine) return;

    const detectCurrency = async () => {
      try {
        // 1. IP Lookup detection (reliable fallback-free)
        let ipCurrency = '';
        try {
          const res = await fetch('https://ipapi.co/json/');
          const data = await res.json();
          if (data && data.currency) {
            ipCurrency = data.currency;
          }
        } catch (e) {
          console.warn('IP lookup for currency failed:', e);
        }

        // 2. Browser Locale-based detection
        let localeCurrency = 'USD';
        try {
          const locale = navigator.language || 'en-US';
          const localeMap: Record<string, string> = {
            GB: 'GBP',
            DE: 'EUR',
            FR: 'EUR',
            IT: 'EUR',
            ES: 'EUR',
            NL: 'EUR',
            JP: 'JPY',
            CA: 'CAD',
            AU: 'AUD',
            CH: 'CHF',
            CN: 'CNY',
            IN: 'INR',
            KR: 'KRW',
            NZ: 'NZD',
            BR: 'BRL',
            MX: 'MXN',
            ZA: 'ZAR',
            NG: 'NGN',
          };
          const countryCode = locale.split('-')[1]?.toUpperCase();
          if (countryCode && localeMap[countryCode]) {
            localeCurrency = localeMap[countryCode];
          }
        } catch (e) {
          console.warn('Locale-based currency detection failed:', e);
        }

        // Compare and resolve currency code
        const resolvedCurrency =
          ipCurrency && ipCurrency !== 'USD' ? ipCurrency
          : localeCurrency !== 'USD' ? localeCurrency
          : 'USD';
        setCurrency(resolvedCurrency);

        if (resolvedCurrency && resolvedCurrency !== 'USD') {
          // Fetch live conversion rates from free open.er-api.com
          const rateRes = await fetch('https://open.er-api.com/v6/latest/USD');
          const rateData = await rateRes.json();
          if (rateData && rateData.rates && rateData.rates[resolvedCurrency]) {
            setExchangeRate(rateData.rates[resolvedCurrency]);
          }
        }
      } catch (err) {
        console.warn('Currency conversion setup failed:', err);
      }
    };

    detectCurrency();
  }, []);

  const selectedTier = selectedTierId ? PREMIUM_TIERS[selectedTierId] : null;
  const selectedFlexTool = FLEXIBLE_FEATURES.find(
    (f: any) => f.id === selectedFlexibleToolId,
  );

  const displayMonthly =
    selectedTierId === 'flexible' && selectedFlexTool ?
      selectedFlexTool.monthly
    : selectedTier?.price.monthly;

  const displayYearly =
    selectedTierId === 'flexible' && selectedFlexTool ?
      selectedFlexTool.yearly
    : selectedTier?.price.yearly;

  const activeFlexFeature =
    FLEXIBLE_FEATURES.find((f: any) => f.id === selectedFlexibleToolId) ||
    FLEXIBLE_FEATURES[0];
  const displayMonthlyPrice =
    selectedTierId === 'flexible' ?
      activeFlexFeature.monthly
    : selectedTier?.price.monthly || 0;
  const displayYearlyPrice =
    selectedTierId === 'flexible' ?
      activeFlexFeature.yearly
    : selectedTier?.price.yearly || 0;
  const savings = Math.round(displayMonthlyPrice * 12 - displayYearlyPrice);

  const handleCheckout = async () => {
    if (!selectedTierId || !selectedTier) return;

    if (!user) {
      toast.error(
        'Authentication Required: Please register or log in first to purchase a premium plan!',
      );
      return;
    }

    setIsSimulating(true);
    toast.loading(`Connecting...`);

    try {
      const targetPrice =
        billingCycle === 'monthly' ? displayMonthlyPrice : displayYearlyPrice;

      // Invoke server-side checkout session creation
      const res = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: selectedTierId,
          billingCycle,
          selectedFlexibleToolId:
            selectedTierId === 'flexible' ? selectedFlexibleToolId : 'all',
          price: targetPrice,
        }),
      });

      const sessionData = await res.json();

      if (sessionData.url) {
        toast.dismiss();
        toast.loading('Redirecting to payment...');
        window.location.href = sessionData.url;
        return;
      }

      // If Stripe secret key is not set, fall back to simulated sandbox upgrade
      toast.dismiss();
      toast.loading(
        `Running simulated sandbox checkout upgrade for ${selectedTier.label}...`,
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const existingTools: string[] = Array.isArray(user?.user_metadata?.purchased_tools)
        ? user.user_metadata.purchased_tools
        : [];

      const newTools =
        selectedTierId === 'flexible'
          ? Array.from(new Set([...existingTools, selectedFlexibleToolId]))
          : ['all'];

      const { error } = await supabase.auth.updateUser({
        data: {
          tier: selectedTierId,
          purchased_tools: newTools,
        },
      });

      if (error) throw error;

      // Force instant refresh of the global app context auth state
      await refresh();

      toast.dismiss();
      toast.success(
        `🎉 Sandbox Upgrade Success! Your plan was upgraded to ${selectedTier.label} successfully!`,
      );
      setIsModalOpen(false);
    } catch (err: any) {
      toast.dismiss();
      toast.error(`Payment failed: ${err?.message || 'Please try again.'}`);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleDowngradeToFree = async () => {
    if (!user) {
      toast.error('Please log in first to manage your subscription.');
      return;
    }
    try {
      toast.loading('Switching to Free Plan...');
      const { error } = await supabase.auth.updateUser({
        data: {
          tier: 'free',
          purchased_tools: [],
        },
      });
      if (error) throw error;
      await refresh();
      toast.dismiss();
      toast.success('Switched back to Free plan successfully.');
    } catch (err: any) {
      toast.dismiss();
      toast.error('Failed to change plan: ' + (err?.message || 'Please try again.'));
    }
  };

  const formatCurrencyAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

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

                    {isOnline &&
                      exchangeRate &&
                      currency !== 'USD' &&
                      tier.price.monthly !== null && (
                        <p className='text-xs text-pw-success font-bold font-mono mt-1'>
                          ~ {(tier.price.monthly * exchangeRate).toFixed(2)}{' '}
                          {currency} / month
                        </p>
                      )}

                    {tier.price.yearly && (
                      <p className='text-[11px] text-pw-muted mt-2.5'>
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
                      <CheckCircle
                        className={cn(
                          'h-3.5 w-3.5 shrink-0',
                          tierId === 'standard' || tierId === 'pro' ?
                            ''
                          : 'text-pw-success',
                        )}
                        style={
                          tierId === 'standard' || tierId === 'pro' ?
                            { color: tier.color }
                          : {}
                        }
                      />
                      <span>
                        {tier.maxMessages === Infinity ?
                          'Unlimited'
                        : tier.maxMessages}{' '}
                        messages
                      </span>
                    </li>
                    <li className='flex items-center gap-2 text-xs'>
                      <CheckCircle
                        className={cn(
                          'h-3.5 w-3.5 shrink-0',
                          tierId === 'standard' || tierId === 'pro' ?
                            ''
                          : 'text-pw-success',
                        )}
                        style={
                          tierId === 'standard' || tierId === 'pro' ?
                            { color: tier.color }
                          : {}
                        }
                      />
                      <span>
                        {tier.maxQuizzes === Infinity ?
                          'Unlimited'
                        : tier.maxQuizzes}{' '}
                        quizzes
                      </span>
                    </li>
                    <li className='flex items-center gap-2 text-xs'>
                      <CheckCircle
                        className={cn(
                          'h-3.5 w-3.5 shrink-0',
                          tierId === 'standard' || tierId === 'pro' ?
                            ''
                          : 'text-pw-success',
                        )}
                        style={
                          tierId === 'standard' || tierId === 'pro' ?
                            { color: tier.color }
                          : {}
                        }
                      />
                      <span>Up to {tier.maxExpiryDays} day expiry</span>
                    </li>
                    <li className='flex items-center gap-2 text-xs'>
                      {tier.publicInbox ?
                        <CheckCircle
                          className={cn(
                            'h-3.5 w-3.5 shrink-0',
                            tierId === 'standard' || tierId === 'pro' ?
                              ''
                            : 'text-pw-success',
                          )}
                          style={
                            tierId === 'standard' || tierId === 'pro' ?
                              { color: tier.color }
                            : {}
                          }
                        />
                      : <X className='h-3.5 w-3.5 text-pw-muted/40 shrink-0' />}
                      <span
                        className={!tier.publicInbox ? 'text-pw-muted/50' : ''}>
                        Public inbox
                      </span>
                    </li>
                    <li className='flex items-center gap-2 text-xs'>
                      {tier.proTools ?
                        <CheckCircle
                          className={cn(
                            'h-3.5 w-3.5 shrink-0',
                            tierId === 'standard' || tierId === 'pro' ?
                              ''
                            : 'text-pw-success',
                          )}
                          style={
                            tierId === 'standard' || tierId === 'pro' ?
                              { color: tier.color }
                            : {}
                          }
                        />
                      : <X className='h-3.5 w-3.5 text-pw-muted/40 shrink-0' />}
                      <span
                        className={!tier.proTools ? 'text-pw-muted/50' : ''}>
                        Pro tools access
                      </span>
                    </li>
                  </ul>

              
                      {premiumTier === 'flexible' && (
                        <div className='pt-3 border-t border-white/5 space-y-2.5'>
                          {/* Purchased Tools List */}
                          {(user?.user_metadata?.purchased_tools || []).length > 0 && (
                            <div className='space-y-1'>
                              <span className='text-[10px] font-bold uppercase tracking-wider text-pw-success block'>
                                Purchased Tools:
                              </span>
                              <div className='flex flex-wrap gap-1'>
                                {(user?.user_metadata?.purchased_tools || []).map((tId: string) => {
                                  const feat = FLEXIBLE_FEATURES.find((f) => f.id === tId);
                                  return (
                                    <span
                                      key={tId}
                                      className='text-[9px] font-bold px-2 py-0.5 rounded-md bg-pw-success/15 text-pw-success border border-pw-success/20'>
                                      ✓ {feat ? feat.label : tId}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          <div className='space-y-1.5'>
                            <label className='text-[10px] font-bold text-pw-primary uppercase block'>
                              Select Tool to Purchase
                            </label>
                            <div className='flex gap-1.5'>
                              <select
                                value={selectedFlexibleToolId}
                                onChange={(e) => setSelectedFlexibleToolId(e.target.value)}
                                className='w-full h-8 px-2 bg-[#0c0d1c] border border-white/10 rounded-lg text-xs text-pw-text focus:outline-none focus:border-pw-primary cursor-pointer'>
                                {FLEXIBLE_FEATURES.filter(
                                  (feat: any) => !(user?.user_metadata?.purchased_tools || []).includes(feat.id)
                                ).map((feat: any) => (
                                  <option key={feat.id} value={feat.id} className='bg-[#0c0d1c]'>
                                    {feat.label} (${feat.monthly}/mo)
                                  </option>
                                ))}
                                {FLEXIBLE_FEATURES.filter(
                                  (feat: any) => !(user?.user_metadata?.purchased_tools || []).includes(feat.id)
                                ).length === 0 && (
                                  <option value='' className='bg-[#0c0d1c]'>
                                    All Tools Purchased
                                  </option>
                                )}
                              </select>
                              <Button
                                size='sm'
                                onClick={() => {
                                  setSelectedTierId('flexible');
                                  setIsModalOpen(true);
                                }}
                                disabled={
                                  FLEXIBLE_FEATURES.filter(
                                    (feat: any) => !(user?.user_metadata?.purchased_tools || []).includes(feat.id)
                                  ).length === 0
                                }
                                className='btn-primary h-8 text-[10px] font-bold px-3 shrink-0'>
                                Buy
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                  {/* CTA */}
                  <Button
                    disabled={isCurrent}
                    onClick={() => {
                      if (tierId === 'free' && premiumTier !== 'free') {
                        handleDowngradeToFree();
                        return;
                      }
                      setSelectedTierId(tierId);
                      setIsModalOpen(true);
                    }}
                    className={cn(
                      'w-full h-11 font-bold text-sm gap-2 transition-all relative mt-auto',
                      isCurrent ?
                        'bg-white/10 text-pw-muted cursor-default border border-white/10'
                      : isPopular ? 'btn-primary shadow-xl shadow-pw-primary/20'
                      : 'bg-white/5 border border-white/10 hover:bg-white/10 text-pw-text',
                      isPro && 'btn-premium',
                    )}>
                    {isCurrent ?
                      'Current Plan'
                    : tierId === 'free' ?
                      'Go Free'
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

        <div className='mb-20 space-y-8'>
          <h2 className='text-3xl font-extrabold font-display text-center'>
            Plan Benefits <span className='gradient-text'>per Tool.</span>
          </h2>
          <p className='text-center text-pw-muted text-sm max-w-xl mx-auto'>
            Review exactly what each subscription tier unlocks across our core
            utilities.
          </p>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto'>
            {TOOL_BENEFITS.map((tool) => {
              const ToolIcon = tool.icon;
              return (
                <Card
                  key={tool.id}
                  className='p-6 bg-white/[0.01] border border-white/5 space-y-2 rounded-2xl hover:border-white/10 transition-all'>
                  <h4
                    className={cn(
                      'font-bold text-sm flex items-center gap-1.5',
                      tool.textColor,
                    )}>
                    <ToolIcon className='h-4 w-4' /> {tool.title}
                  </h4>
                  <p className='text-xs text-pw-muted leading-relaxed'>
                    <span className='font-bold text-white'>Free:</span>{' '}
                    {tool.free} <br />
                    <span className={cn('font-bold', tool.textColor)}>
                      Premium:
                    </span>{' '}
                    {tool.premium}
                  </p>
                </Card>
              );
            })}
          </div>
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

      <Dialog
        open={isModalOpen}
        onOpenChange={setIsModalOpen}>
        <DialogContent className='w-[90%] bg-[#0c0d1c] border border-white/10 rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar text-pw-text pt-1'>
          {selectedTier && (
            <div className='space-y-6'>
              <DialogHeader>
                <div className='flex items-center gap-3 pt-6'>
                  <div
                    className='h-12 w-12 rounded-xl flex items-center justify-center border'
                    style={{
                      backgroundColor: `${selectedTier.color}15`,
                      borderColor: `${selectedTier.color}30`,
                      color: selectedTier.color,
                    }}>
                    {TIER_ICONS[selectedTierId as PremiumTier]}
                  </div>
                  <div>
                    <DialogTitle className='text-2xl font-extrabold font-display'>
                      Unlock {selectedTier.label}
                    </DialogTitle>
                    <DialogDescription className='text-pw-muted text-xs'>
                      Gain instant access to premium features & elevated limits
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* Billing Cycle Selector */}
              {(selectedTierId === 'flexible' || selectedTier.price.yearly) && (
                <div className='bg-white/5 nav-glass rounded-full flex items-center justify-between h-9'>
                  <button
                    onClick={() => setBillingCycle('monthly')}
                    className={cn(
                      'flex-1 py-2 text-center text-xs font-semibold rounded-full transition-all h-10 text-base',
                      billingCycle === 'monthly' ? `text-black shadow-xl` : (
                        'text-pw-muted hover:text-pw-text'
                      ),
                    )}
                    style={{
                      backgroundColor: `${billingCycle === 'monthly' ? selectedTier.color : ''}`,
                    }}>
                    Monthly
                  </button>
                  <button
                    onClick={() => setBillingCycle('yearly')}
                    className={cn(
                      'flex-1 py-2 text-center text-base font-semibold rounded-full transition-all flex items-center h-10 justify-center gap-1.5',
                      billingCycle === 'yearly' ? `text-black shadow-xl` : (
                        'text-pw-muted hover:text-pw-text'
                      ),
                    )}
                    style={{
                      backgroundColor: `${billingCycle === 'yearly' ? selectedTier.color : ''}`,
                    }}>
                    Yearly
                    <span className='px-1.5 py-0.5 rounded bg-pw-success text-[8px] font-black uppercase tracking-wider text-black'>
                      Save{' '}
                      {selectedTierId === 'flexible' ?
                        Math.round(
                          (1 -
                            displayYearlyPrice / (displayMonthlyPrice * 12)) *
                            100,
                        )
                      : 16}
                      %
                    </span>
                  </button>
                </div>
              )}

              {/* Price Calculation Card */}
              <div className='p-4 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col items-center justify-center text-center'>
                <div>
                  <span className='text-xs text-pw-muted uppercase font-bold tracking-widest block'>
                    Total Checkout Price
                  </span>
                  <span className='text-3xl font-extrabold font-display text-white block'>
                    {billingCycle === 'monthly' ?
                      `$${formatCurrencyAmount(displayMonthlyPrice)}/mo`
                    : `$${formatCurrencyAmount(displayYearlyPrice)}/yr`}
                  </span>
                </div>

                {isOnline &&
                  exchangeRate &&
                  currency !== 'USD' &&
                  displayMonthlyPrice && (
                    <div className='mt-1.5'>
                      <span className='text-xs text-pw-success font-bold font-mono block'>
                        ~{' '}
                        {billingCycle === 'monthly' ?
                          `${formatCurrencyAmount(displayMonthlyPrice * exchangeRate)} ${currency} / month`
                        : `${formatCurrencyAmount(displayYearlyPrice * exchangeRate)} ${currency} / year`
                        }
                      </span>
                    </div>
                  )}

              </div>

              {selectedTierId === 'flexible' && (
                <div className='space-y-2 p-4 rounded-xl bg-white/[0.02] border border-white/5'>
                  <label className='text-xs font-bold text-pw-muted uppercase block'>
                    Choose Flexible Tool to License
                  </label>
                  <select
                    value={selectedFlexibleToolId}
                    onChange={(e) => setSelectedFlexibleToolId(e.target.value)}
                    className='w-full h-11 px-3 bg-[#0c0d1c] border border-white/10 rounded-xl text-xs text-pw-text focus:outline-none focus:border-pw-primary cursor-pointer'>
                    {FLEXIBLE_FEATURES
                      .filter((feat: any) => !(user?.user_metadata?.purchased_tools || []).includes(feat.id))
                      .map((feat: any) => (
                        <option
                          key={feat.id}
                          value={feat.id}
                          className='bg-[#0c0d1c] py-2'>
                          {feat.label} (${formatCurrencyAmount(feat.monthly)}/mo)
                        </option>
                      ))}
                    {FLEXIBLE_FEATURES.filter((feat: any) => !(user?.user_metadata?.purchased_tools || []).includes(feat.id)).length === 0 && (
                      <option value='all' className='bg-[#0c0d1c]'>
                        All Flexible Tools Already Unlocked
                      </option>
                    )}
                  </select>
                  <p className='text-[10px] text-pw-muted leading-relaxed mt-1'>
                    The flexible plan allows you to pay only for the tools you
                    use. Select your desired feature from the dropdown to adjust
                    your subscription price.
                  </p>
                </div>
              )}

              {selectedTierId !== 'flexible' && (
                <p className='text-[10px] text-pw-muted leading-relaxed mt-1'>
                  {selectedTier.description}
                </p>
              )}

              {/* Checkout Controls */}
              <DialogFooter className='pt-4 flex flex-col sm:flex-row gap-2'>
                <button
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSimulating}
                  className='flex-1 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-bold text-pw-muted hover:text-pw-text transition-all'>
                  Cancel
                </button>
                <button
                  onClick={handleCheckout}
                  disabled={isSimulating}
                  className='flex-1 py-2.5 rounded-xl btn-primary text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5'>
                  {isSimulating ? 'Processing...' : `Subscribe`}
                </button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
