'use client';

import React from 'react';

interface XIconProps {
  className?: string;
  size?: number | string;
  style?: React.CSSProperties;
  color?: string;
}

export function XIcon({ className, size = '1em', style, color = 'currentColor' }: XIconProps) {
  return (
    <svg
      viewBox='0 0 20 20'
      aria-hidden='true'
      className={className}
      style={{
        width: size,
        height: size,
        display: 'inline-block',
        verticalAlign: 'middle',
        ...style,
      }}
      fill={color}
    >
      <path d='M18.244 2.25h3.308l-4.827 5.517 5.678 7.5H16.16l-4.437-5.793-5.228 5.793H3.185l5.323-6.083L3 2.25h6.78l3.96 5.238L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z' />
    </svg>
  );
}
export default XIcon;
