'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Calculator,
  Percent,
  Scale,
  DollarSign,
  Delete,
  Undo,
  Heart,
  Calendar,
  Coins,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { capFirst, cn } from '@/lib/utils';

const formatAsUserTypes = (val: string): string => {
  const clean = val.replace(/,/g, '').replace(/[^0-9.]/g, '');
  if (!clean) return '';
  const parts = clean.split('.');
  // format first part
  if (parts[0]) {
    parts[0] = Number(parts[0]).toLocaleString('en-US');
  }
  return parts.join('.');
};

const parseFormattedFloat = (val: string): number => {
  return parseFloat(val.replace(/,/g, '')) || 0;
};

export default function CalculatorPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Tab control synced with URL query param `?tab=tabId`
  const urlTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(urlTab || 'basic');

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', val);
    router.replace(url.pathname + url.search, { scroll: false });
  };

  // Basic Math States
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [prevCalc, setPrevCalc] = useState<string | null>(null);

  // Currency Converter States
  const [currencyAmount, setCurrencyAmount] = useState('100');
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('NGN');
  const [convertedResult, setConvertedResult] = useState<number | null>(null);
  const [exchangeRate, setExchangeRate] = useState<number>(0);
  const [curLoading, setCurLoading] = useState(true);

  // Unit Converter States
  const [unitType, setUnitType] = useState<'weight' | 'volume'>('weight');
  const [unitVal, setUnitVal] = useState<number>(1);
  const [fromUnit, setFromUnit] = useState('kg');
  const [toUnit, setToUnit] = useState('lbs');
  const [convertedUnit, setConvertedUnit] = useState<number | null>(null);

  // Interest Finance Calculator States
  const [principal, setPrincipal] = useState('1,000');
  const [interestRate, setInterestRate] = useState<number>(5);
  const [compoundsPerYear, setCompoundsPerYear] = useState<number>(12);
  const [years, setYears] = useState<number>(5);
  const [futureValue, setFutureValue] = useState<number | null>(null);

  // Pricing Markup States
  const [cost, setCost] = useState('50');
  const [markup, setMarkup] = useState<number>(30); // in percent
  const [sellingPrice, setSellingPrice] = useState<number | null>(null);
  const [profitMargin, setProfitMargin] = useState<number | null>(null);

  // BMI Calculator States
  const [bmiWeight, setBmiWeight] = useState('70');
  const [bmiWeightUnit, setBmiWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [bmiHeight, setBmiHeight] = useState('175');
  const [bmiHeightUnit, setBmiHeightUnit] = useState<'cm' | 'ft'>('cm');
  const [bmiFt, setBmiFt] = useState('5');
  const [bmiIn, setBmiIn] = useState('8');
  const [bmiValue, setBmiValue] = useState<number | null>(null);
  const [bmiCategory, setBmiCategory] = useState<string>('');

  // Loan/EMI Calculator States
  const [loanPrincipal, setLoanPrincipal] = useState('10,000');
  const [loanRate, setLoanRate] = useState('5.5');
  const [loanTerm, setLoanTerm] = useState('5'); // in years
  const [monthlyPayment, setMonthlyPayment] = useState<number | null>(null);
  const [totalLoanInterest, setTotalLoanInterest] = useState<number | null>(
    null,
  );
  const [totalLoanCost, setTotalLoanCost] = useState<number | null>(null);

  // Age Calculator States
  const [birthDate, setBirthDate] = useState('2000-01-01');
  const [ageYears, setAgeYears] = useState<number | null>(null);
  const [ageMonths, setAgeMonths] = useState<number | null>(null);
  const [ageDays, setAgeDays] = useState<number | null>(null);
  const [daysToBirthday, setDaysToBirthday] = useState<number | null>(null);

  // Tip Calculator States
  const [tipBill, setTipBill] = useState('50');
  const [tipPercent, setTipPercent] = useState('15');
  const [tipPeople, setTipPeople] = useState('2');
  const [tipPerPerson, setTipPerPerson] = useState<number | null>(null);
  const [totalPerPerson, setTotalPerPerson] = useState<number | null>(null);

  const [ONLINE, ISONLINE] = useState(false);

  // Online/offline detection
  useEffect(() => {
    const setOnline = () => ISONLINE(true);
    const setOffline = () => ISONLINE(false);
    ISONLINE(navigator.onLine);
    window.addEventListener('online', setOnline);
    window.addEventListener('offline', setOffline);
    return () => {
      window.removeEventListener('online', setOnline);
      window.removeEventListener('offline', setOffline);
    };
  }, []);

  // -- Math Calculator Handlers --
  const pressNum = (num: string) => {
    if (calcDisplay === '0') {
      setCalcDisplay(num);
    } else {
      setCalcDisplay(calcDisplay + num);
    }
  };

  const pressOp = (op: string) => {
    setCalcDisplay(`${calcDisplay}${op}`);
  };

  const calculateResult = () => {
    if (!calcDisplay || calcDisplay.toString() === '0') return;
    try {
      const res = eval(calcDisplay);
      setPrevCalc(calcDisplay);
      setCalcDisplay(String(Number(res.toFixed(6))));
    } catch (e) {
      toast.error('Invalid Math Equation');
    }
  };

  const clearCalc = () => {
    setCalcDisplay('0');
    setPrevCalc(null);
  };

  const deleteCalc = () => {
    if (calcDisplay !== '0' && calcDisplay.length > 0) {
      setCalcDisplay(calcDisplay.slice(0, -1));
    } else {
      setCalcDisplay('0');
    }
  };

  // -- Currency API & Handler --
  useEffect(() => {
    const fetchRates = async () => {
      setCurLoading(true);
      try {
        const res = await fetch(
          `https://open.er-api.com/v6/latest/${fromCurrency}`,
        );
        const data = await res.json();
        if (data && data.rates && data.rates[toCurrency]) {
          setExchangeRate(data.rates[toCurrency]);
        }
      } catch (err) {
        toast.warning('Currency rate fetch failed');
        console.warn('Currency rate fetch failed');
      } finally {
        setTimeout(() => {
          ONLINE ? setCurLoading(false) : null;
        }, 300);
      }
    };
    fetchRates();
  }, [fromCurrency, toCurrency, ONLINE]);

  useEffect(() => {
    const amount = parseFormattedFloat(currencyAmount);
    setConvertedResult(Number((amount * exchangeRate).toFixed(2)));
  }, [currencyAmount, exchangeRate]);

  // -- Unit Converter calculations --
  const WEIGHT_FACTORS: Record<string, number> = {
    g: 1,
    kg: 1000,
    lbs: 453.592,
    oz: 28.3495,
    t: 1000000,
  };

  const VOLUME_FACTORS: Record<string, number> = {
    ml: 1,
    l: 1000,
    gal: 3785.41,
    qt: 946.353,
    pt: 473.176,
    fl_oz: 29.5735,
  };

  useEffect(() => {
    const factors = unitType === 'weight' ? WEIGHT_FACTORS : VOLUME_FACTORS;
    const fromFactor = factors[fromUnit] ?? 1;
    const toFactor = factors[toUnit] ?? 1;
    const valInBase = unitVal * fromFactor;
    setConvertedUnit(Number((valInBase / toFactor).toFixed(4)));
  }, [unitVal, fromUnit, toUnit, unitType]);

  // -- Interest calculations --
  useEffect(() => {
    const r = interestRate / 100;
    const n = compoundsPerYear;
    const t = years;
    const p = parseFormattedFloat(principal);
    const fv = p * Math.pow(1 + r / n, n * t);
    setFutureValue(Number(fv.toFixed(2)));
  }, [principal, interestRate, compoundsPerYear, years]);

  // -- Pricing calculations --
  useEffect(() => {
    const costNum = parseFormattedFloat(cost);
    const calculatedPrice = costNum * (1 + markup / 100);
    const calculatedMargin =
      calculatedPrice > 0 ?
        ((calculatedPrice - costNum) / calculatedPrice) * 100
      : 0;
    setSellingPrice(Number(calculatedPrice.toFixed(2)));
    setProfitMargin(Number(calculatedMargin.toFixed(1)));
  }, [cost, markup]);

  // -- BMI calculations --
  useEffect(() => {
    let weightKg = parseFloat(bmiWeight) || 0;
    if (bmiWeightUnit === 'lbs') {
      weightKg = weightKg * 0.45359237;
    }

    let heightM = 0;
    if (bmiHeightUnit === 'cm') {
      heightM = (parseFloat(bmiHeight) || 0) / 100;
    } else {
      const feet = parseFloat(bmiFt) || 0;
      const inches = parseFloat(bmiIn) || 0;
      const totalInches = feet * 12 + inches;
      heightM = totalInches * 0.0254;
    }

    if (heightM > 0 && weightKg > 0) {
      const bmi = weightKg / (heightM * heightM);
      setBmiValue(Number(bmi.toFixed(1)));

      if (bmi < 18.5) {
        setBmiCategory('Underweight');
      } else if (bmi >= 18.5 && bmi < 25) {
        setBmiCategory('Normal weight');
      } else if (bmi >= 25 && bmi < 30) {
        setBmiCategory('Overweight');
      } else {
        setBmiCategory('Obese');
      }
    } else {
      setBmiValue(null);
      setBmiCategory('');
    }
  }, [bmiWeight, bmiWeightUnit, bmiHeight, bmiHeightUnit, bmiFt, bmiIn]);

  // -- Loan/EMI calculations --
  useEffect(() => {
    const P = parseFormattedFloat(loanPrincipal);
    const r = (parseFloat(loanRate) || 0) / 12 / 100;
    const n = (parseFloat(loanTerm) || 0) * 12;

    if (P > 0 && n > 0) {
      if (r === 0) {
        const emi = P / n;
        setMonthlyPayment(Number(emi.toFixed(2)));
        setTotalLoanInterest(0);
        setTotalLoanCost(P);
      } else {
        const emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
        const totalCost = emi * n;
        const totalInterest = totalCost - P;
        setMonthlyPayment(Number(emi.toFixed(2)));
        setTotalLoanInterest(Number(totalInterest.toFixed(2)));
        setTotalLoanCost(Number(totalCost.toFixed(2)));
      }
    } else {
      setMonthlyPayment(null);
      setTotalLoanInterest(null);
      setTotalLoanCost(null);
    }
  }, [loanPrincipal, loanRate, loanTerm]);

  // -- Age calculations --
  useEffect(() => {
    if (!birthDate) return;
    const birth = new Date(birthDate);
    const now = new Date();

    if (isNaN(birth.getTime()) || birth > now) {
      setAgeYears(null);
      setAgeMonths(null);
      setAgeDays(null);
      setDaysToBirthday(null);
      return;
    }

    let yearsDiff = now.getFullYear() - birth.getFullYear();
    let monthsDiff = now.getMonth() - birth.getMonth();
    let daysDiff = now.getDate() - birth.getDate();

    if (daysDiff < 0) {
      monthsDiff--;
      const lastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      daysDiff += lastMonth.getDate();
    }

    if (monthsDiff < 0) {
      yearsDiff--;
      monthsDiff += 12;
    }

    setAgeYears(yearsDiff);
    setAgeMonths(monthsDiff);
    setAgeDays(daysDiff);

    // Days to next birthday calculation
    const nextBdate = new Date(
      now.getFullYear(),
      birth.getMonth(),
      birth.getDate(),
    );
    if (nextBdate < now) {
      nextBdate.setFullYear(now.getFullYear() + 1);
    }
    const diffTime = Math.abs(nextBdate.getTime() - now.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    setDaysToBirthday(diffDays === 365 || diffDays === 366 ? 0 : diffDays);
  }, [birthDate]);

  // -- Tip calculations --
  useEffect(() => {
    const bill = parseFormattedFloat(tipBill);
    const pct = parseFloat(tipPercent) || 0;
    const people = parseInt(tipPeople) || 1;

    if (bill > 0 && people > 0) {
      const tipAmount = bill * (pct / 100);
      const totalAmount = bill + tipAmount;
      setTipPerPerson(Number((tipAmount / people).toFixed(2)));
      setTotalPerPerson(Number((totalAmount / people).toFixed(2)));
    } else {
      setTipPerPerson(null);
      setTotalPerPerson(null);
    }
  }, [tipBill, tipPercent, tipPeople]);

  const currencies: { value: string; name: string }[] = [
    { value: 'USD', name: 'US Dollar' },
    { value: 'EUR', name: 'Euro' },
    { value: 'NGN', name: 'Nigerian Naira' },
    { value: 'GBP', name: 'Britain Pounds' },
    { value: 'JPY', name: 'Japanese Yen' },
    { value: 'CAD', name: 'Canadian Dollar' },
    { value: 'AUD', name: 'Australian Dollar' },
    { value: 'INR', name: 'Indian Rupee' },
    { value: 'CNY', name: 'Chinese Yuan' },
    { value: 'CHF', name: 'Swiss Franc' },
    { value: 'ZAR', name: 'South African Rand' },
    { value: 'GHS', name: 'Ghanaian Cedi' },
    { value: 'KES', name: 'Kenyan Shilling' },
  ];

  const fromCurrencies = currencies.filter((c) => c.value !== toCurrency);
  const toCurrencies = currencies.filter((c) => c.value !== fromCurrency);

  const units = {
    weight: [
      { value: 'kg', name: 'Kilogram' },
      { value: 'g', name: 'grams' },
      { value: 'mg', name: 'milligrams' },
      { value: 'lbs', name: 'pounds' },
      { value: 'oz', name: 'Ounces' },
      { value: 't', name: 'Metric Ton' },
    ],
    volume: [
      { value: 'ml', name: 'milliliters' },
      { value: 'l', name: 'liters' },
      { value: 'gal', name: 'gallons' },
      { value: 'qt', name: 'Quarts' },
      { value: 'pt', name: 'Pints' },
      { value: 'fl_oz', name: 'Fluid Ounces' },
    ],
  };

  const fromUnits = units[unitType].filter((u) => u.value !== toUnit);
  const toUnits = units[unitType].filter((u) => u.value !== fromUnit);

  const formatOutput = (val: number | null): string => {
    if (val === null) return '0.00';
    return val.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className='container mx-auto px-6 py-12 max-w-5xl min-h-[calc(100vh-64px)] pb-20'>
      <div className='flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12'>
        <div>
          <div className='badge mb-4'>
            <Calculator className='h-3.5 w-3.5' />
            Utility
          </div>
          <h1 className='text-4xl font-extrabold font-display leading-[1.1]'>
            Multi <span className='gradient-text'>Calculator.</span>
          </h1>
          <p className='mt-2 text-pw-muted'>
            Instantly perform math, conversions, compound interests, unit
            metrics, and real-time live currency conversions.
          </p>
        </div>
      </div>

      <Card className='bg-transparent ring-0 space-y-8 flex items-center shrink-0'>
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className='w-full flex flex-col max-w-[700px]'>
          <TabsList
            className='flex bg-white/5 mb-8 gap-2 px-1 min-h-10 w-full sm:min-w-full rounded-full gap-1 overflow-x-auto'
            style={{
              placeSelf: 'center',
              justifyContent: 'flex-start',
              scrollbarWidth: 'none',
            }}>
            <TabsTrigger
              value='basic'
              className='gap-2 h-8 text-xs rounded-full px-4'>
              <Calculator className='h-4 w-4' /> Math
            </TabsTrigger>
            <TabsTrigger
              value='currency'
              className='gap-2 h-8 text-xs rounded-full px-4'>
              <DollarSign className='h-4 w-4' /> Currency
            </TabsTrigger>
            <TabsTrigger
              value='units'
              className='gap-2 h-8 text-xs rounded-full px-4'>
              <Scale className='h-4 w-4' /> Units
            </TabsTrigger>
            <TabsTrigger
              value='finance'
              className='gap-2 h-8 text-xs rounded-full px-4'>
              <Percent className='h-4 w-4' /> Interest
            </TabsTrigger>
            <TabsTrigger
              value='pricing'
              className='gap-2 h-8 text-xs rounded-full px-4'>
              <DollarSign className='h-4 w-4' /> Pricing
            </TabsTrigger>
            <TabsTrigger
              value='bmi'
              className='gap-2 h-8 text-xs rounded-full px-4'>
              <Heart className='h-4 w-4' /> BMI
            </TabsTrigger>
            <TabsTrigger
              value='loan'
              className='gap-2 h-8 text-xs rounded-full px-4'>
              <DollarSign className='h-4 w-4' /> Loan/EMI
            </TabsTrigger>
            <TabsTrigger
              value='age'
              className='gap-2 h-8 text-xs rounded-full px-4'>
              <Calendar className='h-4 w-4' /> Age
            </TabsTrigger>
            <TabsTrigger
              value='tip'
              className='gap-2 h-8 text-xs rounded-full px-4'>
              <Coins className='h-4 w-4' /> Tip
            </TabsTrigger>
          </TabsList>

          {/* BASIC MATH TAB */}
          <TabsContent
            value='basic'
            className='m-0 flex flex-col items-center'>
            <div className='w-full max-w-[400px] bg-white/5 border border-white/10 rounded-3xl p-4 space-y-4'>
              <div className='bg-black/40 h-16 rounded-2xl px-4 flex items-center justify-end text-3xl font-mono truncate relative'>
                {prevCalc !== null && (
                  <div
                    className='w-10 h-10 p-1 rounded-full absolute left-3 opacity-80 hover:opacity-100 card-glow grid items-center cursor-pointer'
                    title='Undo Calculation'
                    onClick={() => {
                      if (prevCalc !== null) {
                        setCalcDisplay(prevCalc as string);
                      }
                    }}>
                    <Undo className=' rotate-10' />
                  </div>
                )}
                {calcDisplay}
              </div>
              <div className='grid grid-cols-4 gap-2'>
                {['1', '2', '3'].map((n) => (
                  <button
                    key={n}
                    onClick={() => pressNum(n)}
                    className='h-10 rounded-2xl bkblur bg-white/5 text-pw-text font-semibold'>
                    {n}
                  </button>
                ))}
                <button
                  onClick={clearCalc}
                  className='h-10 rounded-2xl bkblur bg-pw-danger/25 text-pw-danger font-bold text-xl'>
                  C
                </button>

                {['4', '5', '6'].map((n) => (
                  <button
                    key={n}
                    onClick={() => pressNum(n)}
                    className='h-10 rounded-2xl bkblur bg-white/5 text-pw-text font-semibold'>
                    {n}
                  </button>
                ))}

                <button
                  onClick={() => pressOp('/')}
                  className='h-10 rounded-2xl bkblur bg-purple-500/5 text-pw-primary font-bold text-xl'>
                  /
                </button>

                {['7', '8', '9'].map((n) => (
                  <button
                    key={n}
                    onClick={() => pressNum(n)}
                    className='h-10 rounded-2xl bkblur bg-white/5 text-pw-text font-semibold'>
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => pressOp('*')}
                  className='h-10 rounded-2xl bkblur bg-purple-500/5 text-pw-primary font-bold text-xl'>
                  x
                </button>
                <button
                  onClick={() => pressNum('0')}
                  className='h-10 rounded-2xl bkblur bg-white/5 text-pw-text font-semibold'>
                  0
                </button>

                <button
                  onClick={() => pressNum('.')}
                  className='h-10 rounded-2xl bkblur bg-white/5 text-pw-text font-semibold'>
                  .
                </button>

                <button
                  onClick={() => pressOp('-')}
                  className='h-10 rounded-2xl bkblur bg-purple-500/5 text-pw-primary font-bold text-xl'>
                  -
                </button>

                <button
                  onClick={() => pressOp('+')}
                  className='h-10 rounded-2xl bkblur bg-purple-500/5 text-pw-primary text-xl font-bold'>
                  +
                </button>

                <button
                  onClick={deleteCalc}
                  disabled={calcDisplay.length < 1 || calcDisplay == '0'}
                  className={cn(
                    'mt-1 h-10 rounded-2xl bkblur bg-pw-danger text-white font-bold grid items-center',
                    calcDisplay.length < 1 ||
                      (calcDisplay == '0' && 'bg-pw-muted'),
                  )}
                  style={{ placeItems: 'center' }}>
                  <Delete className='w-6 h-6 text-white' />
                </button>
                <button
                  disabled={!calcDisplay || calcDisplay.toString() === '0'}
                  onClick={calculateResult}
                  className={cn(
                    'mt-1 h-10 rounded-2xl bkblur bg-pw-primary text-white font-bold col-span-3',
                    (!calcDisplay || calcDisplay.toString() === '0') &&
                      'opacity-50',
                  )}>
                  Calculate
                </button>
              </div>
            </div>
          </TabsContent>

          {/* CURRENCY CONVERTER TAB */}
          <TabsContent
            value='currency'
            className='m-0 space-y-6'>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
              <div>
                <label className='text-xs font-bold text-pw-muted uppercase block mb-1'>
                  Amount
                </label>
                <Input
                  type='text'
                  value={currencyAmount}
                  onChange={(e) =>
                    setCurrencyAmount(formatAsUserTypes(e.target.value))
                  }
                  className='bg-white/5 border-white/10 h-10'
                />
              </div>
              <div>
                <label className='text-xs font-bold text-pw-muted uppercase block mb-1'>
                  From Currency
                </label>
                <select
                  value={fromCurrency}
                  onChange={(e) => setFromCurrency(e.target.value)}
                  className='w-full h-10 bg-white/5 border border-white/10 rounded-lg px-3 focus:border-pw-primary focus:outline-none cursor-pointer'>
                  {fromCurrencies.map((cur) => {
                    return (
                      <option
                        value={cur.value}
                        className='bg-pw-surface text-pw-text'>
                        {cur.value} - {cur.name}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className='text-xs font-bold text-pw-muted uppercase block mb-1'>
                  To Currency
                </label>
                <select
                  value={toCurrency}
                  onChange={(e) => setToCurrency(e.target.value)}
                  className='w-full h-10 bg-white/5 border border-white/10 rounded-lg px-3 focus:border-pw-primary focus:outline-none cursor-pointer'>
                  {toCurrencies.map((cur) => (
                    <option
                      key={cur.value}
                      value={cur.value}
                      className='bg-pw-surface text-pw-text'>
                      {cur.value} - {cur.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className='p-6 rounded-2xl border border-white/5 bg-white/[0.02] flex flex-wrap items-center justify-between'>
              {curLoading ?
                <div>
                  {!ONLINE ?
                    <p>No Internet Connection </p>
                  : <p className='animate-pulse '>Checking exchange rate...</p>}
                </div>
              : <>
                  <div>
                    <p className='text-xs text-pw-muted font-bold uppercase'>
                      Exchange Result
                    </p>
                    <span className='text-3xl font-bold font-display text-pw-success mt-1 block'>
                      {formatOutput(convertedResult)} {toCurrency}
                    </span>
                  </div>
                  <div className='text-right'>
                    <span className='text-xs text-pw-muted font-bold block uppercase'>
                      Live Rate
                    </span>
                    <span className='text-xs font-mono font-bold text-pw-text'>
                      1 {fromCurrency} = {formatOutput(exchangeRate)}{' '}
                      {toCurrency}
                    </span>
                  </div>
                </>
              }
            </div>
          </TabsContent>

          {/* UNIT CONVERTER TAB */}
          <TabsContent
            value='units'
            className='m-0 space-y-6'>
            <div className='grid grid-cols-1 md:grid-cols-4 gap-6'>
              <div>
                <label className='text-xs font-bold text-pw-muted uppercase block mb-1'>
                  Category
                </label>
                <select
                  value={unitType}
                  onChange={(e) => {
                    const type = e.target.value as 'weight' | 'volume';
                    setUnitType(type);
                    setFromUnit(type === 'weight' ? 'kg' : 'ml');
                    setToUnit(type === 'weight' ? 'lbs' : 'l');
                  }}
                  className='w-full h-10 bg-white/5 border border-white/10 rounded-lg px-3 focus:border-pw-primary focus:outline-none'>
                  <option
                    value='weight'
                    className='bg-pw-surface text-pw-text'>
                    Weight / Mass
                  </option>
                  <option
                    value='volume'
                    className='bg-pw-surface text-pw-text'>
                    Volume / Fluid
                  </option>
                </select>
              </div>
              <div>
                <label className='text-xs font-bold text-pw-muted uppercase block mb-1'>
                  Value
                </label>
                <Input
                  type='number'
                  value={unitVal}
                  onChange={(e) => setUnitVal(Number(e.target.value))}
                  className='bg-white/5 border-white/10 h-10'
                />
              </div>
              <div>
                <label className='text-xs font-bold text-pw-muted uppercase block mb-1'>
                  From Unit
                </label>
                <select
                  value={fromUnit}
                  onChange={(e) => setFromUnit(e.target.value)}
                  className='w-full h-10 bg-white/5 border border-white/10 rounded-lg px-3 focus:border-pw-primary focus:outline-none'>
                  {fromUnits.map((u) => (
                    <option
                      key={u.value}
                      value={u.value}
                      className='bg-pw-surface text-pw-text'>
                      {capFirst(u.name)} ({u.value})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className='text-xs font-bold text-pw-muted uppercase block mb-1'>
                  To Unit
                </label>
                <select
                  value={toUnit}
                  onChange={(e) => setToUnit(e.target.value)}
                  className='w-full h-10 bg-white/5 border border-white/10 rounded-lg px-3 focus:border-pw-primary focus:outline-none'>
                  {toUnits.map((u) => (
                    <option
                      key={u.value}
                      value={u.value}
                      className='bg-pw-surface text-pw-text'>
                      {capFirst(u.name)} ({u.value})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className='p-6 rounded-2xl border border-white/5 bg-white/[0.02]'>
              <p className='text-xs text-pw-muted font-bold uppercase'>
                Conversion Result
              </p>
              <span className='text-3xl font-bold font-display text-pw-primary mt-1 block'>
                {convertedUnit} {toUnit}
              </span>
            </div>
          </TabsContent>

          {/* INTEREST FINANCE TAB */}
          <TabsContent
            value='finance'
            className='m-0 space-y-6'>
            <div className='grid grid-cols-1 md:grid-cols-4 gap-6'>
              <div>
                <label className='text-xs font-bold text-pw-muted uppercase block mb-1'>
                  Principal
                </label>
                <Input
                  type='text'
                  value={principal}
                  onChange={(e) =>
                    setPrincipal(formatAsUserTypes(e.target.value))
                  }
                  className='bg-white/5 border-white/10 h-10'
                />
              </div>
              <div>
                <label className='text-xs font-bold text-pw-muted uppercase block mb-1'>
                  Interest Rate (%)
                </label>
                <Input
                  type='number'
                  value={interestRate}
                  onChange={(e) => setInterestRate(Number(e.target.value))}
                  className='bg-white/5 border-white/10 h-10'
                />
              </div>
              <div>
                <label className='text-xs font-bold text-pw-muted uppercase block mb-1'>
                  Compounding frequency
                </label>
                <select
                  value={compoundsPerYear}
                  onChange={(e) => setCompoundsPerYear(Number(e.target.value))}
                  className='w-full h-10 bg-white/5 border border-white/10 rounded-lg px-3 focus:border-pw-primary focus:outline-none'>
                  <option
                    value='12'
                    className='bg-pw-surface text-pw-text'>
                    Monthly (12/yr)
                  </option>
                  <option
                    value='4'
                    className='bg-pw-surface text-pw-text'>
                    Quarterly (4/yr)
                  </option>
                  <option
                    value='1'
                    className='bg-pw-surface text-pw-text'>
                    Annually (1/yr)
                  </option>
                  <option
                    value='365'
                    className='bg-pw-surface text-pw-text'>
                    Daily (365/yr)
                  </option>
                </select>
              </div>
              <div>
                <label className='text-xs font-bold text-pw-muted uppercase block mb-1'>
                  Years
                </label>
                <Input
                  type='number'
                  value={years}
                  onChange={(e) => setYears(Number(e.target.value))}
                  className='bg-white/5 border-white/10 h-10'
                />
              </div>
            </div>

            <div className='p-6 rounded-2xl border border-white/5 bg-white/[0.02]'>
              <p className='text-xs text-pw-muted font-bold uppercase'>
                Compound Future Value
              </p>
              <span className='text-3xl font-bold font-display text-pw-primary mt-1 block'>
                {formatOutput(futureValue)}
              </span>
              <p className='text-[10px] text-pw-muted mt-2'>
                Accumulated Profit:{' '}
                <span className='text-pw-success font-bold'>
                  {formatOutput(
                    futureValue ?
                      futureValue - parseFormattedFloat(principal)
                    : 0,
                  )}{' '}
                </span>
              </p>
            </div>
          </TabsContent>

          {/* PRICING MARKUP TAB */}
          <TabsContent
            value='pricing'
            className='m-0 space-y-6'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div>
                <label className='text-xs font-bold text-pw-muted uppercase block mb-1'>
                  Product Cost
                </label>
                <Input
                  type='text'
                  value={cost}
                  onChange={(e) => setCost(formatAsUserTypes(e.target.value))}
                  className='bg-white/5 border-white/10 h-10'
                />
              </div>
              <div>
                <label className='text-xs font-bold text-pw-muted uppercase block mb-1'>
                  Profit Percentage %
                </label>
                <Input
                  type='number'
                  value={markup}
                  onChange={(e) => setMarkup(Number(e.target.value))}
                  className='bg-white/5 border-white/10 h-10'
                />
              </div>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div className='p-4 rounded-2xl border border-white/5 bg-white/[0.02]'>
                <p className='text-xs text-pw-muted font-bold uppercase'>
                  Target Selling Price
                </p>
                <span className='text-3xl font-bold font-display text-pw-primary mt-1 block'>
                  {sellingPrice?.toLocaleString()}
                </span>
                <p className='text-[10px] text-pw-muted mt-1'>
                  Cost: {formatOutput(parseFormattedFloat(cost))} ◆ Profit:{' '}
                  <span className='text-pw-success font-bold'>
                    {sellingPrice ?
                      formatOutput(sellingPrice - parseFormattedFloat(cost))
                    : '0.00'}
                  </span>
                </p>
              </div>

              <div className='p-4 rounded-2xl border border-white/5 bg-white/[0.02]'>
                <p className='text-xs text-pw-muted font-bold uppercase'>
                  Net Gross Margin
                </p>
                <span className='text-3xl font-bold font-display text-pw-success mt-1 block'>
                  {profitMargin}%
                </span>
                <p className='text-[10px] text-pw-muted mt-1'>
                  Percentage of pricing that constitutes direct gross profit.
                </p>
              </div>
            </div>
          </TabsContent>

          {/* BMI CALCULATOR TAB */}
          <TabsContent
            value='bmi'
            className='m-0 space-y-6'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div className='space-y-4'>
                <div className='flex gap-4 items-end'>
                  <div className='flex-1'>
                    <label className='text-xs font-bold text-pw-muted uppercase block mb-1'>
                      Weight
                    </label>
                    <Input
                      type='number'
                      value={bmiWeight}
                      onChange={(e) => setBmiWeight(e.target.value)}
                      className='bg-white/5 border-white/10 h-10'
                    />
                  </div>
                  <select
                    value={bmiWeightUnit}
                    onChange={(e) =>
                      setBmiWeightUnit(e.target.value as 'kg' | 'lbs')
                    }
                    className='h-10 bg-white/5 border border-white/10 rounded-lg px-3 focus:outline-none cursor-pointer'>
                    <option
                      value='kg'
                      className='bg-pw-surface text-pw-text'>
                      kg
                    </option>
                    <option
                      value='lbs'
                      className='bg-pw-surface text-pw-text'>
                      lbs
                    </option>
                  </select>
                </div>

                <div className='space-y-2'>
                  <label className='text-xs font-bold text-pw-muted uppercase block'>
                    Height Unit
                  </label>
                  <div className='flex gap-2'>
                    {['cm', 'ft'].map((unit) => (
                      <button
                        key={unit}
                        type='button'
                        onClick={() => setBmiHeightUnit(unit as 'cm' | 'ft')}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                          bmiHeightUnit === unit ?
                            'bg-pw-primary text-white'
                          : 'bg-white/5 text-pw-muted',
                        )}>
                        {unit === 'cm' ?
                          'Centimeters (cm)'
                        : 'Feet & Inches (ft/in)'}
                      </button>
                    ))}
                  </div>
                </div>

                {bmiHeightUnit === 'cm' ?
                  <div>
                    <label className='text-xs font-bold text-pw-muted uppercase block mb-1'>
                      Height (cm)
                    </label>
                    <Input
                      type='number'
                      value={bmiHeight}
                      onChange={(e) => setBmiHeight(e.target.value)}
                      className='bg-white/5 border-white/10 h-10'
                    />
                  </div>
                : <div className='grid grid-cols-2 gap-4'>
                    <div>
                      <label className='text-xs font-bold text-pw-muted uppercase block mb-1'>
                        Feet (ft)
                      </label>
                      <Input
                        type='number'
                        value={bmiFt}
                        onChange={(e) => setBmiFt(e.target.value)}
                        className='bg-white/5 border-white/10 h-10'
                      />
                    </div>
                    <div>
                      <label className='text-xs font-bold text-pw-muted uppercase block mb-1'>
                        Inches (in)
                      </label>
                      <Input
                        type='number'
                        value={bmiIn}
                        onChange={(e) => setBmiIn(e.target.value)}
                        className='bg-white/5 border-white/10 h-10'
                      />
                    </div>
                  </div>
                }
              </div>

              <div className='p-6 rounded-2xl border border-white/5 bg-white/[0.02] flex flex-col justify-center space-y-4'>
                <div>
                  <p className='text-xs text-pw-muted font-bold uppercase'>
                    Your BMI Index
                  </p>
                  <span className='text-4xl font-extrabold font-display text-pw-primary mt-1 block'>
                    {bmiValue !== null ? bmiValue : '--.-'}
                  </span>
                </div>

                <div>
                  <p className='text-xs text-pw-muted font-bold uppercase'>
                    Weight Status
                  </p>
                  <span
                    className={cn(
                      'text-xl font-bold mt-1 block',
                      bmiCategory === 'Normal weight' ? 'text-pw-success'
                      : bmiCategory === 'Underweight' ? 'text-pw-secondary'
                      : 'text-pw-danger',
                    )}>
                    {bmiCategory || 'Enter measurements'}
                  </span>
                </div>

                <div className='text-xs text-pw-muted pt-2 border-t border-white/5 leading-relaxed'>
                  BMI Categories:
                  <br />
                  • Underweight: &lt; 18.5
                  <br />
                  • Normal weight: 18.5 - 24.9
                  <br />
                  • Overweight: 25.0 - 29.9
                  <br />• Obese: 30.0 or greater
                </div>
              </div>
            </div>
          </TabsContent>

          {/* LOAN / EMI CALCULATOR TAB */}
          <TabsContent
            value='loan'
            className='m-0 space-y-6'>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
              <div>
                <label className='text-xs font-bold text-pw-muted uppercase block mb-1'>
                  Loan Principal Amount
                </label>
                <Input
                  type='text'
                  value={loanPrincipal}
                  onChange={(e) =>
                    setLoanPrincipal(formatAsUserTypes(e.target.value))
                  }
                  className='bg-white/5 border-white/10 h-10'
                />
              </div>
              <div>
                <label className='text-xs font-bold text-pw-muted uppercase block mb-1'>
                  Interest Rate (% p.a.)
                </label>
                <Input
                  type='number'
                  step='0.1'
                  value={loanRate}
                  onChange={(e) => setLoanRate(e.target.value)}
                  className='bg-white/5 border-white/10 h-10'
                />
              </div>
              <div>
                <label className='text-xs font-bold text-pw-muted uppercase block mb-1'>
                  Loan Term (Years)
                </label>
                <Input
                  type='number'
                  value={loanTerm}
                  onChange={(e) => setLoanTerm(e.target.value)}
                  className='bg-white/5 border-white/10 h-10'
                />
              </div>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
              <div className='p-5 rounded-2xl border border-white/5 bg-white/[0.02]'>
                <p className='text-xs text-pw-muted font-bold uppercase'>
                  Monthly Payment (EMI)
                </p>
                <span className='text-xl sm:text-3xl font-bold font-display text-pw-primary mt-1 block'>
                  {formatOutput(monthlyPayment)}
                </span>
                <p className='text-[10px] text-pw-muted mt-1'>
                  Installment calculated per month.
                </p>
              </div>

              <div className='p-5 rounded-2xl border border-white/5 bg-white/[0.02]'>
                <p className='text-xs text-pw-muted font-bold uppercase'>
                  Total Interest Payed
                </p>
                <span className='text-xl sm:text-3xl font-bold font-display text-pw-secondary mt-1 block'>
                  {formatOutput(totalLoanInterest)}
                </span>
                <p className='text-[10px] text-pw-muted mt-1'>
                  Accumulated interest cost over term.
                </p>
              </div>

              <div className='p-5 rounded-2xl border border-white/5 bg-white/[0.02]'>
                <p className='text-xs text-pw-muted font-bold uppercase'>
                  Total Payments Cost
                </p>
                <span className='text-xl sm:text-3xl font-bold font-display text-pw-success mt-1 block'>
                  {formatOutput(totalLoanCost)}
                </span>
                <p className='text-[10px] text-pw-muted mt-1'>
                  Principal + Interest combined.
                </p>
              </div>
            </div>
          </TabsContent>

          {/* AGE CALCULATOR TAB */}
          <TabsContent
            value='age'
            className='m-0 space-y-6'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div>
                <label className='text-xs font-bold text-pw-muted uppercase block mb-1'>
                  Date of Birth
                </label>
                <Input
                  type='date'
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className='bg-white/5 border-white/10 h-10 text-pw-text cursor-pointer'
                />
              </div>

              <div className='p-6 rounded-2xl border border-white/5 bg-white/[0.02] space-y-4'>
                <div>
                  <p className='text-xs text-pw-muted font-bold uppercase'>
                    Calculated Age
                  </p>
                  <span className='text-xl sm:text-2xl font-extrabold font-display text-pw-primary mt-1 block'>
                    {ageYears !== null ?
                      `${ageYears} Years, ${ageMonths} Months, ${ageDays} Days`
                    : 'Enter birthdate'}
                  </span>
                </div>

                <div>
                  <p className='text-xs text-pw-muted font-bold uppercase'>
                    Next Birthday In
                  </p>
                  <span className='text-lg font-bold text-pw-success mt-1 block'>
                    {daysToBirthday !== null ?
                      `${daysToBirthday} Days`
                    : '-- days'}
                  </span>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TIP CALCULATOR TAB */}
          <TabsContent
            value='tip'
            className='m-0 space-y-6'>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
              <div>
                <label className='text-xs font-bold text-pw-muted uppercase block mb-1'>
                  Bill Amount ($)
                </label>
                <Input
                  type='text'
                  value={tipBill}
                  onChange={(e) =>
                    setTipBill(formatAsUserTypes(e.target.value))
                  }
                  className='bg-white/5 border-white/10 h-10'
                />
              </div>
              <div>
                <label className='text-xs font-bold text-pw-muted uppercase block mb-1'>
                  Tip Percentage (%)
                </label>
                <Input
                  type='number'
                  value={tipPercent}
                  onChange={(e) => setTipPercent(e.target.value)}
                  className='bg-white/5 border-white/10 h-10'
                />
              </div>
              <div>
                <label className='text-xs font-bold text-pw-muted uppercase block mb-1'>
                  Number of People
                </label>
                <Input
                  type='number'
                  value={tipPeople}
                  onChange={(e) => setTipPeople(e.target.value)}
                  className='bg-white/5 border-white/10 h-10'
                />
              </div>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div className='p-6 rounded-2xl border border-white/5 bg-white/[0.02]'>
                <p className='text-xs text-pw-muted font-bold uppercase'>
                  Tip Per Person
                </p>
                <span className='text-3xl font-bold font-display text-pw-primary mt-1 block'>
                  ${formatOutput(tipPerPerson)}
                </span>
                <p className='text-[10px] text-pw-muted mt-1'>
                  Tip portion divided equally.
                </p>
              </div>

              <div className='p-6 rounded-2xl border border-white/5 bg-white/[0.02]'>
                <p className='text-xs text-pw-muted font-bold uppercase'>
                  Total Per Person
                </p>
                <span className='text-3xl font-bold font-display text-pw-success mt-1 block'>
                  ${formatOutput(totalPerPerson)}
                </span>
                <p className='text-[10px] text-pw-muted mt-1'>
                  Total bill + tip divided equally.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
