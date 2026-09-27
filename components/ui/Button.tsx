import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'success' | 'honey' | 'dark' | 'soft';
export type ButtonSize = 'sm' | 'md' | 'lg';

const base =
  'relative inline-flex items-center justify-center gap-2 font-extrabold tracking-tight rounded-[var(--radius-button)] ' +
  'transition-[transform,box-shadow,background-color,opacity] duration-150 ease-out select-none ' +
  'active:translate-y-[3px] disabled:opacity-45 disabled:pointer-events-none';

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-terracotta text-white shadow-[0_4px_0_var(--color-terracotta-dark)] active:shadow-[0_1px_0_var(--color-terracotta-dark)] hover:brightness-105',
  secondary:
    'bg-paper text-ink border-2 border-sand shadow-[0_3px_0_var(--color-sand)] active:shadow-[0_0_0_var(--color-sand)] hover:bg-white',
  ghost: 'bg-transparent text-ink-soft hover:bg-cream-deep active:translate-y-0',
  success:
    'bg-sage text-white shadow-[0_4px_0_var(--color-sage-dark)] active:shadow-[0_1px_0_var(--color-sage-dark)] hover:brightness-105',
  honey:
    'bg-honey text-white shadow-[0_4px_0_var(--color-honey-dark)] active:shadow-[0_1px_0_var(--color-honey-dark)] hover:brightness-105',
  dark: 'bg-ink text-cream shadow-[0_4px_0_#0f0c0b] active:shadow-[0_1px_0_#0f0c0b] hover:brightness-110',
  soft: 'bg-terracotta-light text-terracotta-dark hover:brightness-[0.98] active:translate-y-[1px]',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-10 px-4 text-sm',
  md: 'h-12 px-5 text-[15px]',
  lg: 'h-14 px-6 text-base uppercase tracking-[0.06em]',
};

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  icon?: ReactNode;
}

export function buttonClasses({ variant = 'primary', size = 'md', block }: CommonProps & { className?: string }) {
  return cn(base, variants[variant], sizes[size], block && 'w-full');
}

export function Button({
  variant = 'primary',
  size = 'md',
  block,
  icon,
  className,
  children,
  type = 'button',
  ...props
}: CommonProps & ComponentProps<'button'>) {
  return (
    <button type={type} className={cn(buttonClasses({ variant, size, block }), className)} {...props}>
      {icon}
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  block,
  icon,
  className,
  children,
  ...props
}: CommonProps & ComponentProps<typeof Link>) {
  return (
    <Link className={cn(buttonClasses({ variant, size, block }), className)} {...props}>
      {icon}
      {children}
    </Link>
  );
}
