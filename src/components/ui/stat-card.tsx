'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
  delay?: number;
}

const variantStyles = {
  default: {
    card: 'bg-white border-slate-200',
    icon: 'bg-blue-100 text-blue-600',
    value: 'text-slate-900',
  },
  success: {
    card: 'bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-700 text-white',
    icon: 'bg-white/20 text-white',
    value: 'text-white',
  },
  warning: {
    card: 'bg-gradient-to-br from-amber-500 to-amber-600 border-amber-700 text-white',
    icon: 'bg-white/20 text-white',
    value: 'text-white',
  },
  danger: {
    card: 'bg-gradient-to-br from-red-500 to-red-600 border-red-700 text-white',
    icon: 'bg-white/20 text-white',
    value: 'text-white',
  },
  info: {
    card: 'bg-gradient-to-br from-blue-500 to-blue-600 border-blue-700 text-white',
    icon: 'bg-white/20 text-white',
    value: 'text-white',
  },
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
  className,
  delay = 0,
}: StatCardProps) {
  const styles = variantStyles[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay,
        ease: [0.25, 0.4, 0.25, 1],
      }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={cn(
        'rounded-2xl border p-6 shadow-sm transition-shadow hover:shadow-lg',
        styles.card,
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p
            className={cn(
              'text-sm font-medium mb-1',
              variant === 'default' ? 'text-slate-600' : 'text-white/80'
            )}
          >
            {title}
          </p>
          <p className={cn('text-3xl font-bold tracking-tight', styles.value)}>
            {value}
          </p>
          {subtitle && (
            <p
              className={cn(
                'text-xs mt-2',
                variant === 'default' ? 'text-slate-500' : 'text-white/70'
              )}
            >
              {subtitle}
            </p>
          )}
        </div>

        {Icon && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: delay + 0.1, duration: 0.3 }}
            className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
              styles.icon
            )}
          >
            <Icon className="w-6 h-6" />
          </motion.div>
        )}
      </div>

      {trend && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: delay + 0.2, duration: 0.3 }}
          className="mt-4 pt-4 border-t border-current/10"
        >
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-sm font-semibold',
                trend.value > 0 ? 'text-emerald-600' : 'text-red-600',
                variant !== 'default' && 'text-white'
              )}
            >
              {trend.value > 0 ? '↑' : '↓'} {Math.abs(trend.value)}%
            </span>
            <span
              className={cn(
                'text-xs',
                variant === 'default' ? 'text-slate-500' : 'text-white/70'
              )}
            >
              {trend.label}
            </span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

// Grid container for stat cards with stagger animation
export function StatGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.1,
          },
        },
      }}
      className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4', className)}
    >
      {children}
    </motion.div>
  );
}
