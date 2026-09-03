import clsx from 'clsx';
import type { Sale } from '@/types';

type BadgeVariant = 'green' | 'yellow' | 'red' | 'gray' | 'blue' | 'orange';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  green: 'bg-green-100 text-green-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  red: 'bg-red-100 text-red-800',
  gray: 'bg-gray-100 text-gray-700',
  blue: 'bg-blue-100 text-blue-800',
  orange: 'bg-orange-100 text-orange-800',
};

export function Badge({ children, variant = 'gray', className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

// Whether the store still owes goods on this sale. Separate from StatusBadge,
// which tracks money: a sale can be paid in full and still be undelivered.
export function OwingBadge({ sale }: { sale: Pick<Sale, 'owing' | 'owingFulfilledAt'> }) {
  if (!sale.owing) return null;
  return sale.owingFulfilledAt ? (
    <Badge variant="gray">Delivered</Badge>
  ) : (
    <Badge variant="orange">Owed</Badge>
  );
}

export function StatusBadge({ status }: { status: 'paid' | 'partial' | 'unpaid' }) {
  const map = {
    paid: { variant: 'green' as const, label: 'Paid' },
    partial: { variant: 'yellow' as const, label: 'Partial' },
    unpaid: { variant: 'red' as const, label: 'Unpaid' },
  };
  const { variant, label } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
}
