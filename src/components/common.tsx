"use client";

import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n, type TKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function PageHeader({
  title, subtitle, eyebrow, actions,
}: {
  title: string; subtitle?: React.ReactNode; eyebrow?: string; actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="text-xs font-medium tracking-widest text-amber-deep uppercase">{eyebrow}</p>}
        <h1 className="font-display text-3xl leading-tight font-semibold sm:text-4xl">{title}</h1>
        {subtitle && <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div>}
      </div>
      {actions && <div className="no-print flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** Label + control + translated validation error. */
export function Field({
  label, error, htmlFor, className, children, hint,
}: {
  label?: string; error?: string; htmlFor?: string; className?: string; children: React.ReactNode; hint?: string;
}) {
  const { t } = useI18n();
  return (
    <div className={cn("grid gap-1.5", className)}>
      {label && (
        <Label htmlFor={htmlFor} className="text-xs tracking-wide text-muted-foreground uppercase">
          {label}
        </Label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-destructive">{t(error as TKey)}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function EmptyState({ text, icon: Icon = Inbox, action }: { text: string; icon?: LucideIcon; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-card/60 px-6 py-10 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-secondary text-moss">
        <Icon className="size-5" />
      </span>
      <p className="max-w-sm text-sm text-muted-foreground">{text}</p>
      {action}
    </div>
  );
}

export function CardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-32 rounded-xl" />
      ))}
    </div>
  );
}

export function StepTitle({ n, title, extra }: { n: number; title: string; extra?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-forest text-sm font-semibold text-amber">
        {n}
      </span>
      <h2 className="font-display text-2xl font-semibold">{title}</h2>
      {extra && <div className="ml-auto">{extra}</div>}
    </div>
  );
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter((w) => /^[\p{L}]/u.test(w))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}
