'use client';

import { useEffect, useRef, useState, type CSSProperties, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type NativeRangeProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'>;

export interface ThemedSliderProps extends NativeRangeProps {
  /** CSS width. Defaults to w-full and can be overridden with className. */
  length?: CSSProperties['width'];
  gradient?: boolean;
  gradientStart?: string;
  gradientEnd?: string;
  trackColor?: string;
  thumbColor?: string;
  thumbShape?: 'circle' | 'square' | 'rounded';
  thumbSize?: number;
  trackHeight?: number;
  activeHeight?: number;
  growOnHover?: boolean;
  roundedness?: 'full' | 'rounded' | 'square' | number;
  shimmer?: boolean;
}

/** A native, keyboard-accessible range input with a configurable PingWorld track and thumb. */
export function ThemedSlider({
  className,
  style,
  length,
  gradient = true,
  gradientStart = '#22d4fd',
  gradientEnd = '#985cff',
  trackColor = 'rgba(148, 163, 184, .24)',
  thumbColor = '#f8fafc',
  thumbShape = 'circle',
  thumbSize = 15,
  trackHeight = 5,
  activeHeight = Math.max(trackHeight + 3, 8),
  growOnHover = true,
  roundedness = 'full',
  shimmer = false,
  min = 0,
  max = 100,
  value,
  defaultValue,
  onChange,
  onPointerDown,
  onPointerUp,
  onKeyDown,
  onKeyUp,
  onBlur,
  disabled,
  ...inputProps
}: ThemedSliderProps) {
  const [active, setActive] = useState(false);
  const [internalValue, setInternalValue] = useState(Number(defaultValue ?? min));
  const releaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (releaseTimer.current) clearTimeout(releaseTimer.current);
  }, []);

  const currentValue = value === undefined ? internalValue : Number(value);
  const span = Number(max) - Number(min);
  const progress = Number.isFinite(currentValue) && span > 0
    ? Math.min(100, Math.max(0, ((currentValue - Number(min)) / span) * 100))
    : 0;
  const radius = roundedness === 'full' ? '999px'
    : roundedness === 'rounded' ? '8px'
    : roundedness === 'square' ? '0px'
    : `${Math.max(0, roundedness)}px`;
  const shapeRadius = thumbShape === 'circle' ? '50%'
    : thumbShape === 'square' ? '3px'
    : '7px';
  const cssVars = {
    '--pw-range-fill': gradient ? `linear-gradient(100deg, ${gradientStart}, ${gradientEnd})` : gradientStart,
    '--pw-range-track': trackColor,
    '--pw-range-thumb': thumbColor,
    '--pw-range-thumb-size': `${Math.max(8, thumbSize)}px`,
    '--pw-range-idle-height': `${Math.max(1, trackHeight)}px`,
    '--pw-range-active-height': `${Math.max(trackHeight, activeHeight)}px`,
    '--pw-range-radius': radius,
    '--pw-range-thumb-radius': shapeRadius,
    '--pw-range-progress': `${progress}%`,
    width: length,
    ...style,
  } as CSSProperties;

  const pulseActive = () => {
    setActive(true);
    if (releaseTimer.current) clearTimeout(releaseTimer.current);
    releaseTimer.current = setTimeout(() => setActive(false), 500);
  };

  return (
    <span
      className={cn('pw-themed-range', 'w-full', growOnHover && 'pw-themed-range--grow', active && 'pw-themed-range--active', disabled && 'pw-themed-range--disabled', className)}
      style={cssVars}
      onPointerEnter={() => growOnHover && setActive(true)}
      onPointerLeave={() => setActive(false)}
    >
      <span aria-hidden='true' className={cn('pw-themed-range__track', shimmer && 'pw-themed-range__track--shimmer')}>
        <span className='pw-themed-range__fill' />
      </span>
      <input
        {...inputProps}
        type='range'
        min={min}
        max={max}
        value={value}
        defaultValue={defaultValue}
        disabled={disabled}
        onChange={(event) => {
          if (value === undefined) setInternalValue(Number(event.currentTarget.value));
          pulseActive();
          onChange?.(event);
        }}
        onPointerDown={(event) => { setActive(true); onPointerDown?.(event); }}
        onPointerUp={(event) => { pulseActive(); onPointerUp?.(event); }}
        onKeyDown={(event) => { setActive(true); onKeyDown?.(event); }}
        onKeyUp={(event) => { pulseActive(); onKeyUp?.(event); }}
        onBlur={(event) => { setActive(false); onBlur?.(event); }}
        className='pw-themed-range__input'
        aria-valuetext={inputProps['aria-valuetext']}
      />
    </span>
  );
}
