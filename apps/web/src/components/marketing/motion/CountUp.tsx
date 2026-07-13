'use client';

import { animate, useInView, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

interface CountUpProps {
  /** Target value the numeral animates to. */
  value: number;
  /** Starting value. Defaults to 0. */
  from?: number;
  /** Rendered before the numeral, e.g. "<" or "$". */
  prefix?: string;
  /** Rendered after the numeral, e.g. "h" or "%". */
  suffix?: string;
  /** Decimal places to show. Defaults to the precision of `value`. */
  decimals?: number;
  /** Animation duration in seconds. Defaults to 1.6. */
  duration?: number;
  className?: string;
}

function precisionOf(value: number): number {
  if (Number.isInteger(value)) return 0;
  const text = value.toString();
  const dot = text.indexOf('.');
  return dot === -1 ? 0 : text.length - dot - 1;
}

/**
 * Animates a numeral from `from` to `value` once it enters the viewport.
 * Non-numeric parts go in prefix/suffix: "<2h" is prefix="<" value={2}
 * suffix="h"; "0.4%" is value={0.4} suffix="%"; "$2" is prefix="$" value={2}.
 * Renders the final value immediately when the user prefers reduced motion.
 */
export function CountUp({
  value,
  from = 0,
  prefix = '',
  suffix = '',
  decimals,
  duration = 1.6,
  className,
}: CountUpProps) {
  const reducedMotion = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const resolvedDecimals = decimals ?? precisionOf(value);
  const [display, setDisplay] = useState(() => from.toFixed(resolvedDecimals));

  useEffect(() => {
    if (!inView) return;
    if (reducedMotion) {
      setDisplay(value.toFixed(resolvedDecimals));
      return;
    }
    const controls = animate(from, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => setDisplay(latest.toFixed(resolvedDecimals)),
    });
    return () => controls.stop();
  }, [inView, reducedMotion, from, value, duration, resolvedDecimals]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}
