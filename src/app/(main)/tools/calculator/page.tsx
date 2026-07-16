'use client';

import { useState, useEffect } from 'react';
import {
  Calculator,
  Percent,
  Scale,
  DollarSign,
  Delete,
  Undo,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { capFirst, cn } from '@/lib/utils';
import { useComposer } from '@/lib/composer/useComposerStore';

export default function CalculatorPage() {
  // Tab control
  const [activeTab, setActiveTab] = useState('basic');

  // Basic Math States
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [prevCalc, setPrevCalc] = useState<string | null>(null);

  // Currency Converter States
  const [currencyAmount, setCurrencyAmount] = useState<number>(100);
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
  const [principal, setPrincipal] = useState<number>(1000);
  const [interestRate, setInterestRate] = useState<number>(5);
  const [compoundsPerYear, setCompoundsPerYear] = useState<number>(12);
  const [years, setYears] = useState<number>(5);
  const [futureValue, setFutureValue] = useState<number | null>(null);

  // Pricing Markup States
  const [cost, setCost] = useState<number>(50);
  const [markup, setMarkup] = useState<number>(30); // in percent
  const [sellingPrice, setSellingPrice] = useState<number | null>(null);
  const [profitMargin, setProfitMargin] = useState<number | null>(null);
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
    let res = 0;
    res = eval(calcDisplay);

    setPrevCalc(calcDisplay);
    setCalcDisplay(String(Number(res.toFixed(6))));
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
        }, 600);
      }
    };
    fetchRates();
  }, [fromCurrency, toCurrency, ONLINE]);

  useEffect(() => {
    setConvertedResult(Number((currencyAmount * exchangeRate).toFixed(2)));
  }, [currencyAmount, exchangeRate]);

  // -- Unit Converter calculations --
  const WEIGHT_FACTORS: Record<string, number> = {
    g: 1,
    kg: 1000,
    lbs: 453.592,
    oz: 28.3495,
  };

  const VOLUME_FACTORS: Record<string, number> = {
    ml: 1,
    l: 1000,
    gal: 3785.41,
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
    const p = principal;
    const fv = p * Math.pow(1 + r / n, n * t);
    setFutureValue(Number(fv.toFixed(2)));
  }, [principal, interestRate, compoundsPerYear, years]);

  // -- Pricing calculations --
  useEffect(() => {
    const calculatedPrice = cost * (1 + markup / 100);
    const calculatedMargin = ((calculatedPrice - cost) / calculatedPrice) * 100;
    setSellingPrice(Number(calculatedPrice.toFixed(2)));
    setProfitMargin(Number(calculatedMargin.toFixed(1)));
  }, [cost, markup]);

  const currencies: { value: string; name: string }[] = [
    { value: 'USD', name: 'US Dollar' },
    { value: 'EUR', name: 'Euro' },
    { value: 'NGN', name: 'Nigerian Naira' },
    { value: 'GBP', name: 'Britain Pounds' },
    { value: 'JPY', name: 'Japanese Yen' },
  ];

  const fromCurrencies = currencies.filter((c) => c.value !== toCurrency);
  const toCurrencies = currencies.filter((c) => c.value !== fromCurrency);

  const units = {
    weight: [
      { value: 'kg', name: 'Kilogram' },
      { value: 'g', name: 'grams' },
      { value: 'lbs', name: 'pounds' },
      { value: 'oz', name: 'Ounces' },
    ],
    volume: [
      { value: 'ml', name: 'milliliters' },
      { value: 'l', name: 'liters' },
      { value: 'gal', name: 'gallons' },
    ],
  };
  const fromUnits = units[unitType].filter((u) => u.value !== toUnit);
  const toUnits = units[unitType].filter((u) => u.value !== fromUnit);

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

      <Card className='bg-transparent ring-0 sm:ring-1 sm:card-glow p-5 space-y-8'>
        <Tabs
          defaultValue='basic'
          onValueChange={setActiveTab}
          className='w-full flex flex-col'>
          <TabsList
            className='flex bg-white/5 mb-8 gap-2 h-auto p-1 w-full sm:min-w-full rounded-full gap-1 overflow-x-auto'
            style={{
              placeSelf: 'center',
              justifyContent: 'flex-start',
              scrollbarWidth: 'none',
            }}>
            <TabsTrigger
              value='basic'
              className='gap-2 py-3 text-xs rounded-full px-2'>
              <Calculator className='h-4 w-4' /> Math
            </TabsTrigger>
            <TabsTrigger
              value='currency'
              className='gap-2 py-3 text-xs rounded-full px-2'>
              <DollarSign className='h-4 w-4' /> Currency
            </TabsTrigger>
            <TabsTrigger
              value='units'
              className='gap-2 py-3 text-xs rounded-full px-2'>
              <Scale className='h-4 w-4' /> Units
            </TabsTrigger>
            <TabsTrigger
              value='finance'
              className='gap-2 py-3 text-xs rounded-full px-2'>
              <Percent className='h-4 w-4' /> Interest
            </TabsTrigger>
            <TabsTrigger
              value='pricing'
              className='gap-2 py-3 text-xs rounded-full px-2'>
              <DollarSign className='h-4 w-4' /> Pricing
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
                {['3', '2', '1'].reverse().map((n) => (
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
                  type='number'
                  value={currencyAmount}
                  onChange={(e) => setCurrencyAmount(Number(e.target.value))}
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
                  {fromCurrencies.map((cur, idx) => {
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
                      {convertedResult} {toCurrency}
                    </span>
                  </div>
                  <div className='text-right'>
                    <span className='text-xs text-pw-muted font-bold block uppercase'>
                      Live Rate
                    </span>
                    <span className='text-xs font-mono font-bold text-pw-text'>
                      1 {fromCurrency} = {exchangeRate} {toCurrency}
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
                  Principal ($)
                </label>
                <Input
                  type='number'
                  value={principal}
                  onChange={(e) => setPrincipal(Number(e.target.value))}
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
                ${futureValue}
              </span>
              <p className='text-[10px] text-pw-muted mt-2'>
                Accumulated Profit:{' '}
                <span className='text-pw-success font-bold'>
                  ${futureValue ? (futureValue - principal).toFixed(2) : '0'}
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
                  Product Cost $
                </label>
                <Input
                  type='number'
                  value={cost}
                  onChange={(e) => setCost(Number(e.target.value))}
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
                  ${sellingPrice?.toLocaleString()}
                </span>
                <p className='text-[10px] text-pw-muted mt-1'>
                  Cost: ${cost} ◆ Profit:{' '}
                  <span className='text-pw-success font-bold'>
                    $
                    {sellingPrice ?
                      (sellingPrice - cost).toLocaleString()
                    : '0'}
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
        </Tabs>
      </Card>
    </div>
  );
}
