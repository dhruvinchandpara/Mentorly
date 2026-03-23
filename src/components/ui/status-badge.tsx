import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Radio,
  XCircle,
  Loader2,
} from 'lucide-react';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 px-3 py-1 rounded-[10px] text-xs font-semibold transition-all shadow-sm',
  {
    variants: {
      variant: {
        active: 'bg-emerald-50 text-emerald-600 border border-emerald-200/60',
        pending: 'bg-amber-50 text-amber-600 border border-amber-200/60',
        inactive: 'bg-slate-100 text-slate-600 border border-slate-200/60',
        live: 'bg-red-50 text-red-600 border border-red-200/60',
        completed: 'bg-emerald-50 text-emerald-600 border border-emerald-200/60',
        cancelled: 'bg-slate-100 text-slate-500 border border-slate-200/60',
        upcoming: 'bg-blue-50 text-[#5b7cfa] border border-blue-200/60',
        success: 'bg-emerald-50 text-emerald-600 border border-emerald-200/60',
        warning: 'bg-amber-50 text-amber-600 border border-amber-200/60',
        error: 'bg-red-50 text-red-600 border border-red-200/60',
        info: 'bg-blue-50 text-[#5b7cfa] border border-blue-200/60',
      },
      size: {
        sm: 'text-[10px] px-2 py-0.5 gap-1',
        md: 'text-xs px-3 py-1 gap-1.5',
        lg: 'text-sm px-4 py-1.5 gap-2',
      },
      animated: {
        true: '',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'info',
      size: 'md',
      animated: false,
    },
  }
);

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  icon?: boolean;
  pulse?: boolean;
}

const iconMap = {
  active: CheckCircle2,
  pending: Clock,
  inactive: XCircle,
  live: Radio,
  completed: CheckCircle2,
  cancelled: XCircle,
  upcoming: Clock,
  success: CheckCircle2,
  warning: AlertCircle,
  error: XCircle,
  info: AlertCircle,
};

export function StatusBadge({
  className,
  variant = 'info',
  size = 'md',
  animated = false,
  icon = true,
  pulse = false,
  children,
  ...props
}: StatusBadgeProps) {
  const Icon = variant ? iconMap[variant] : null;
  const shouldPulse = pulse || variant === 'live';
  const shouldAnimate = animated || variant === 'live';

  return (
    <span
      className={cn(
        badgeVariants({ variant, size }),
        shouldAnimate && 'animate-pulse',
        className
      )}
      {...props}
    >
      {icon && Icon && (
        <Icon
          className={cn(
            size === 'sm' && 'w-3 h-3',
            size === 'md' && 'w-3.5 h-3.5',
            size === 'lg' && 'w-4 h-4',
            shouldPulse && variant !== 'live' && 'animate-pulse'
          )}
        />
      )}
      {!Icon && shouldPulse && (
        <span
          className={cn(
            'rounded-full bg-current',
            size === 'sm' && 'w-1 h-1',
            size === 'md' && 'w-1.5 h-1.5',
            size === 'lg' && 'w-2 h-2',
            'animate-pulse'
          )}
        />
      )}
      {children}
    </span>
  );
}

// Loading Badge variant
export function LoadingBadge({
  className,
  children = 'Loading',
  ...props
}: Omit<StatusBadgeProps, 'variant' | 'icon'>) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200',
        className
      )}
      {...props}
    >
      <Loader2 className="w-3.5 h-3.5 animate-spin" />
      {children}
    </span>
  );
}
