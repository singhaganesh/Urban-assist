'use client';
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './cn';

const buttonStyles = cva(
  'tap inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition focus-visible:ring-0 disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-ink hover:brightness-95',
        secondary: 'bg-ink text-bg hover:brightness-110',
        outline: 'border border-hairline bg-white text-ink hover:bg-bg',
        ghost: 'text-ink hover:bg-hairline/40',
        danger: 'bg-danger text-bg hover:brightness-110',
      },
      size: {
        sm: 'px-3 py-2 text-xs',
        md: 'px-4 py-2.5',
        lg: 'px-5 py-3 text-base',
        block: 'w-full px-5 py-3 text-base',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonStyles> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonStyles({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = 'Button';

// --- Input -------------------------------------------------------------
export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...p }, ref) => (
  <input
    ref={ref}
    className={cn(
      'tap w-full rounded-xl border border-hairline bg-white px-3.5 py-2.5 text-sm placeholder:text-muted',
      'focus:border-ink focus:outline-none',
      className,
    )}
    {...p}
  />
));
Input.displayName = 'Input';

// --- Textarea ----------------------------------------------------------
export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...p }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'w-full rounded-xl border border-hairline bg-white px-3.5 py-2.5 text-sm placeholder:text-muted focus:border-ink focus:outline-none',
      className,
    )}
    {...p}
  />
));
Textarea.displayName = 'Textarea';

// --- Label / Field -----------------------------------------------------
export function Label({
  children,
  htmlFor,
  className,
}: {
  children: React.ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <label htmlFor={htmlFor} className={cn('text-xs font-medium text-muted', className)}>
      {children}
    </label>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

// --- Card --------------------------------------------------------------
export function Card({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('card', className)} {...p} />;
}

// --- Badge -------------------------------------------------------------
const badgeStyles = cva(
  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
  {
    variants: {
      tone: {
        accent: 'bg-accent/15 text-[color:rgb(var(--accent))]',
        success: 'bg-success/15 text-[color:rgb(var(--success))]',
        danger: 'bg-danger/15 text-[color:rgb(var(--danger))]',
        muted: 'bg-hairline/60 text-muted',
        ink: 'bg-ink text-bg',
      },
    },
    defaultVariants: { tone: 'muted' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeStyles> {}

export function Badge({ className, tone, ...p }: BadgeProps) {
  return <span className={cn(badgeStyles({ tone }), className)} {...p} />;
}

// --- EmptyState --------------------------------------------------------
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center justify-center gap-3 py-12 text-center">
      <h3 className="font-display text-lg">{title}</h3>
      {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
      {action}
    </div>
  );
}

// --- Skeleton ----------------------------------------------------------
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-hairline/60',
        className,
      )}
      aria-hidden
    />
  );
}
