'use client';

import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion';
import type { ReactNode } from 'react';

const fadeUpTransition = { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const };

interface FadeUpProps extends Omit<HTMLMotionProps<'div'>, 'initial' | 'whileInView' | 'viewport' | 'transition'> {
  children: ReactNode;
  delay?: number;
}

export function FadeUp({ children, delay = 0, className, ...props }: FadeUpProps) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return (
      <div className={className} {...(props as React.HTMLAttributes<HTMLDivElement>)}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ ...fadeUpTransition, delay }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
