import React from 'react';
import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';
import { cn } from '../../utils/cn';

interface GlassCardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  className?: string;
  glowColor?: string; // Optional custom shadow glow
  hoverEffect?: boolean;
}

export function GlassCard({
  children,
  className,
  glowColor,
  hoverEffect = true,
  ...props
}: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      whileHover={hoverEffect ? { y: -4, scale: 1.005 } : undefined}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/40 p-6 shadow-2xl backdrop-blur-xl transition-all duration-300",
        hoverEffect && "hover:border-white/20 hover:shadow-[0_0_40px_-10px_rgba(255,255,255,0.08)]",
        className
      )}
      style={{
        boxShadow: glowColor ? `0 0 40px -10px ${glowColor}, inset 0 1px 1px rgba(255,255,255,0.1)` : undefined,
        ...props.style,
      }}
      {...props}
    >
      {/* Glossy top highlight */}
      <div className="absolute -inset-px -z-10 bg-gradient-to-br from-white/5 to-transparent opacity-50 pointer-events-none" />
      {children}
    </motion.div>
  );
}
