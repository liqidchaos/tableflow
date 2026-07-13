import React from 'react';

interface LogoProps {
  size?: number;
  color?: string;
  className?: string;
}

/** Abstract "table-from-above" logomark: rounded square with corner notch */
export function Logo({ size = 24, color = 'var(--color-flow)', className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <rect x="4" y="4" width="24" height="24" rx="7" fill={color} />
      <circle cx="24" cy="8" r="4" fill={color} opacity="0.85" />
      <circle cx="24" cy="8" r="2.5" fill="white" opacity="0.9" />
    </svg>
  );
}

interface LogoWordmarkProps {
  className?: string;
  color?: string;
}

export function LogoWordmark({ className, color }: LogoWordmarkProps) {
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: 22,
        color: color ?? 'var(--color-ink)',
        textDecoration: 'none',
      }}
    >
      <Logo size={28} color={color ?? 'var(--color-flow)'} />
      TableFlow
    </span>
  );
}
