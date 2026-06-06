import { format, isToday, isYesterday } from 'date-fns';
import type { Timestamp } from 'firebase/firestore';

export function naira(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(timestamp: Timestamp | Date | null | undefined): string {
  if (!timestamp) return '';
  const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
  if (isToday(date)) return `Today, ${format(date, 'h:mm a')}`;
  if (isYesterday(date)) return `Yesterday, ${format(date, 'h:mm a')}`;
  return format(date, 'dd MMM yyyy, h:mm a');
}

export function formatDateShort(timestamp: Timestamp | Date | null | undefined): string {
  if (!timestamp) return '';
  const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
  return format(date, 'dd MMM yyyy');
}
