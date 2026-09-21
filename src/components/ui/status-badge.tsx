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
      // Mesa status-badge palette (see .claude/skills/mentorly-ui-ux §4):
      // Requested/Awaiting -> pale lemon tint + deep-teal-black text
      // Scheduled/Completed/Approved -> cream-butter + deep-teal-black text
      // Rejected -> pale crimson tint + dark-maroon text
      // Revise -> peach-beige + dark-maroon text
      variant: {
        active: 'bg-[#FBF4D7] text-[#0F1919] border border-[#0F1919]/10',
        pending: 'bg-[#FBF7D9] text-[#0F1919] border border-[#0F1919]/10',
        inactive: 'bg-muted text-muted-foreground border border-border',
        live: 'bg-[#FBF4D7] text-[#0F1919] border border-[#0F1919]/10',
        completed: 'bg-[#FBF4D7] text-[#0F1919] border border-[#0F1919]/10',
        cancelled: 'bg-[#F7E2E3] text-[#702327] border border-[#702327]/15',
        rejected: 'bg-[#F7E2E3] text-[#702327] border border-[#702327]/15',
        revise: 'bg-[var(--peach-beige)] text-[#702327] border border-[#702327]/15',
        upcoming: 'bg-[#FBF4D7] text-[#0F1919] border border-[#0F1919]/10',
        success: 'bg-[#FBF4D7] text-[#0F1919] border border-[#0F1919]/10',
        warning: 'bg-[#FBF7D9] text-[#0F1919] border border-[#0F1919]/10',
        error: 'bg-[#F7E2E3] text-[#702327] border border-[#702327]/15',
        info: 'bg-info-bg text-info border border-info/20',
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
  rejected: XCircle,
  revise: AlertCircle,
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
        'inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-info-bg text-info border border-info/20',
        className
      )}
      {...props}
    >
      <Loader2 className="w-3.5 h-3.5 animate-spin" />
      {children}
    </span>
  );
}
