'use client';

import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useRef, type ReactNode } from 'react';

interface ParallaxProps {
  children: ReactNode;
  /** Applied to the outer wrapper. Give it absolute positioning + overflow-hidden, e.g. "absolute inset-0 overflow-hidden". */
  className?: string;
  /**
   * How far the layer drifts vertically over the section's scroll range,
   * as a fraction of the section height. Defaults to 0.08 (8%). The inner
   * layer is oversized by the same amount so no gaps appear at the edges.
   */
  amount?: number;
}

/**
 * Background parallax for full-bleed sections. Place inside a relatively
 * positioned section, put the background (image div, .kds-photo layer, etc.)
 * as children, and it will drift vertically as the section scrolls through
 * the viewport. Renders static when the user prefers reduced motion.
 */
export function Parallax({ children, className, amount = 0.08 }: ParallaxProps) {
  const reducedMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const drift = amount * 100;
  const y = useTransform(scrollYProgress, [0, 1], [`${-drift}%`, `${drift}%`]);

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div ref={ref} className={className}>
      <motion.div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: `${-drift}%`,
          bottom: `${-drift}%`,
          y,
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
