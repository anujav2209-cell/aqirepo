import React, { useEffect, useRef } from 'react';
import { useMotionValue, useSpring, animate } from 'framer-motion';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
}

export function AnimatedCounter({ value, duration = 1.0, className }: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  
  // Motion value starting at 0
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    damping: 20,
    stiffness: 80,
  });

  useEffect(() => {
    // Reset and trigger counting animation
    motionValue.set(0);
    const controls = animate(motionValue, value, { duration, ease: 'easeOut' });
    return () => controls.stop();
  }, [value, duration, motionValue]);

  useEffect(() => {
    return springValue.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = Math.round(latest).toString();
      }
    });
  }, [springValue]);

  return <span ref={ref} className={className}>{value}</span>;
}
