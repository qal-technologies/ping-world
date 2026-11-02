'use client';

import { useCallback, useState } from 'react';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { cn } from '@/lib/utils';

type CalculatorAngleMode = 'DEG' | 'RAD';

function evaluateCalculatorExpression(
  expression: string,
  angleMode: CalculatorAngleMode,
): number {
  if (!expression.trim() || expression.length > 160)
    throw new Error('Enter an expression under 160 characters.');
  const tokens: string[] = [];
  const scanner = /\s*(?:(\d+(?:\.\d*)?|\.\d+)|([a-zA-Z]+)|([()+\-*/%^!,]))/gy;
  let scanIndex = 0;
  while (scanIndex < expression.length) {
    scanner.lastIndex = scanIndex;
    const match = scanner.exec(expression);
    if (!match) throw new Error('Unsupported character in expression.');
    tokens.push(match[1] || match[2]?.toLowerCase() || match[3]);
    scanIndex = scanner.lastIndex;
  }
  let cursor = 0;
  const peek = () => tokens[cursor];
  const take = () => tokens[cursor++];
  const expect = (value: string) => {
    if (take() !== value) throw new Error(`Expected “${value}”.`);
  };
  const toRadians = (value: number) =>
    angleMode === 'DEG' ? (value * Math.PI) / 180 : value;
  const fromRadians = (value: number) =>
    angleMode === 'DEG' ? (value * 180) / Math.PI : value;
  const functions: Record<string, (args: number[]) => number> = {
    sin: ([x]) => Math.sin(toRadians(x)),
    cos: ([x]) => Math.cos(toRadians(x)),
    tan: ([x]) => Math.tan(toRadians(x)),
    asin: ([x]) => fromRadians(Math.asin(x)),
    acos: ([x]) => fromRadians(Math.acos(x)),
    atan: ([x]) => fromRadians(Math.atan(x)),
    sqrt: ([x]) => Math.sqrt(x),
    cbrt: ([x]) => Math.cbrt(x),
    abs: ([x]) => Math.abs(x),
    ln: ([x]) => Math.log(x),
    log: ([x]) => Math.log10(x),
    exp: ([x]) => Math.exp(x),
    floor: ([x]) => Math.floor(x),
    ceil: ([x]) => Math.ceil(x),
    round: ([x, digits = 0]) => {
      const scale = 10 ** Math.max(-10, Math.min(10, digits));
      return Math.round(x * scale) / scale;
    },
    min: (args) => Math.min(...args),
    max: (args) => Math.max(...args),
    pow: ([x, y]) => x ** y,
  };
  const parseExpression = (): number => {
    let value = parseTerm();
    while (peek() === '+' || peek() === '-') {
      const operator = take();
      const next = parseTerm();
      value = operator === '+' ? value + next : value - next;
    }
    return value;
  };
  const parseTerm = (): number => {
    let value = parseUnary();
    while (peek() === '*' || peek() === '/' || peek() === '%') {
      const operator = take();
      const next = parseUnary();
      if ((operator === '/' || operator === '%') && next === 0)
        throw new Error('Cannot divide by zero.');
      value =
        operator === '*' ? value * next
        : operator === '/' ? value / next
        : value % next;
    }
    return value;
  };
  const parseUnary = (): number => {
    if (peek() === '+') {
      take();
      return parseUnary();
    }
    if (peek() === '-') {
      take();
      return -parseUnary();
    }
    return parsePower();
  };
  const parsePower = (): number => {
    const base = parsePostfix();
    if (peek() === '^') {
      take();
      return base ** parseUnary();
    }
    return base;
  };
  const parsePostfix = (): number => {
    let value = parsePrimary();
    while (peek() === '!') {
      take();
      if (!Number.isInteger(value) || value < 0 || value > 170)
        throw new Error('Factorial needs a whole number from 0 to 170.');
      let product = 1;
      for (let number = 2; number <= value; number++) product *= number;
      value = product;
    }
    return value;
  };
  const parsePrimary = (): number => {
    const token = take();
    if (token === '(') {
      const value = parseExpression();
      expect(')');
      return value;
    }
    if (token && /^\d+(?:\.\d*)?$|^\.\d+$/.test(token)) return Number(token);
    if (!token || !/^[a-z]+$/.test(token))
      throw new Error('Check the expression syntax.');
    if (token === 'pi') return Math.PI;
    if (token === 'e') return Math.E;
    if (!(token in functions) || peek() !== '(')
      throw new Error(`Unknown function or constant “${token}”.`);
    take();
    const args: number[] = [];
    if (peek() !== ')') {
      args.push(parseExpression());
      while (peek() === ',') {
        take();
        args.push(parseExpression());
      }
    }
    expect(')');
    if (
      token === 'min' || token === 'max' ? args.length < 1
      : token === 'pow' ? args.length !== 2
      : token === 'round' ? args.length < 1 || args.length > 2
      : args.length !== 1
    )
      throw new Error(`Wrong number of values for ${token}().`);
    return functions[token](args);
  };
  const value = parseExpression();
  if (cursor !== tokens.length) throw new Error('Check the expression syntax.');
  if (!Number.isFinite(value))
    throw new Error('The result is outside the supported range.');
  return value;
}

const CALCULATOR_KEYS = [
  'sin(',
  'cos(',
  'tan(',
  'asin(',
  'acos(',
  'atan(',
  'sqrt(',
  'cbrt(',
  'log(',
  'ln(',
  'abs(',
  'min(',
  'max(',
  'pow(',
  'π',
  'C',
  'DEL',
  'e',
  'x²',
  '^',
  '!',
  '(',
  ')',
  '÷',
  '×',
  '1',
  '2',
  '3',
  '7',
  '8',
  '9',
  '−',
  '4',
  '5',
  '6',
  '+',
  '%',
  '0',
  '.',
  'Ans',
  '=',
];

const Calculator = () => {
  const [val, setVal] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [angleMode, setAngleMode] = useState<CalculatorAngleMode>('DEG');
  const calculate = useCallback(
    (expression: string) => {
      try {
        const number = evaluateCalculatorExpression(
          expression
            .replaceAll('×', '*')
            .replaceAll('÷', '/')
            .replaceAll('−', '-')
            .replaceAll('π', 'pi'),
          angleMode,
        );
        const formatted = Number(number.toPrecision(12)).toString();
        setResult(formatted);
        setError('');
        return formatted;
      } catch (cause) {
        setResult(null);
        setError(
          cause instanceof Error ? cause.message : 'Invalid expression.',
        );
        return null;
      }
    },
    [angleMode],
  );
  const press = (key: string) => {
    if (key === 'C') {
      setVal('');
      setResult(null);
      setError('');
      return;
    }
    if (key === 'DEL') {
      setVal((current) => current.slice(0, -1));
      setResult(null);
      setError('');
      return;
    }
    if (key === '=') {
      calculate(val);
      return;
    }
    if (key === 'Ans') {
      setVal((current) => `${current}${result || ''}`);
      setResult(null);
      return;
    }
    if (key === 'x²') {
      setVal((current) => `${current}^2`);
      setResult(null);
      return;
    }
    const insertion = key === '×' || key === '÷' || key === '−' ? key : key;
    if (result && (/^\d$/.test(key) || key === '.' || key === 'π'))
      setVal(insertion);
    else setVal((current) => `${current}${insertion}`);
    setResult(null);
    setError('');
  };
  return (
    <Card className='m-2 w-full max-w-md rounded-2xl border-white/10 bg-pw-surface p-4 shadow-2xl ring-1 ring-white/10 bkblur sm:p-5'>
      <div className='mb-3 flex items-center justify-between'>
        <h3 className='text-xs font-bold uppercase tracking-widest text-pw-primary'>
          Scientific Calculator
        </h3>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={() =>
            setAngleMode((mode) => (mode === 'DEG' ? 'RAD' : 'DEG'))
          }
          className='h-8 min-w-14 text-[10px]'
          aria-label={`Angle mode ${angleMode}; click to change`}>
          {angleMode}
        </Button>
      </div>
      <div className='mb-3 rounded-xl border border-white/10 bg-black/40 p-3 text-right font-mono'>
        <Input
          value={val}
          onChange={(event) => {
            setVal(event.target.value);
            setResult(null);
            setError('');
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              calculate(val);
            }
            if (event.key === 'Escape') press('C');
          }}
          aria-label='Calculator expression'
          placeholder='Try sin(30) + sqrt(16)'
          className='h-7 border-0 bg-transparent p-0 text-right text-xs shadow-none focus-visible:ring-0'
        />
        <div
          className='mt-2 min-h-8 break-all text-2xl font-bold text-pw-primary'
          aria-live='polite'>
          {result ?? (val || '0')}
        </div>
        <p
          className='min-h-4 text-left text-[10px] text-pw-danger'
          role='status'>
          {error}
        </p>
      </div>
      <div className='grid grid-cols-5 gap-1.5'>
        {CALCULATOR_KEYS.map((key) => {
          const isClear = key === 'C' || key === 'DEL';
          const isOperator = ['^', '!', '%', '+', '−', '×', '÷', '='].includes(
            key,
          );
          return (
            <Button
              key={key}
              type='button'
              variant={
                key === '=' ? 'default'
                : isClear ?
                  'destructive'
                : isOperator ?
                  'secondary'
                : 'outline'
              }
              onClick={() => press(key)}
              className={cn(
                'h-10 min-w-0 rounded-lg px-1 font-mono text-sm font-bold transition active:scale-95 sm:text-xs',
                key.endsWith('(') && 'text-pw-cyan',
                isOperator &&
                  key !== '=' &&
                  'border-pw-primary/20 bg-pw-primary/10 text-pw-primary cols-span-2',
                key === '=' && 'bg-pw-primary text-white',
              )}
              aria-label={
                key === 'DEL' ? 'Delete last character'
                : key === '=' ?
                  'Calculate'
                : key
              }>
              {key}
            </Button>
          );
        })}
      </div>
      <p className='mt-3 text-[10px] text-pw-muted'>
        Supports arithmetic, powers, factorials, constants, and scientific
        functions. Trigonometry uses {angleMode.toLowerCase()}.
      </p>
    </Card>
  );
};

export default Calculator;
