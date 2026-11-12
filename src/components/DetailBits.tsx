"use client";

import Link from "next/link";
import { ArrowLeft, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import { PrintButton } from "./PrintHeader";

export function BackBar({ href = "/dashboard" }: { href?: string }) {
  const { t } = useI18n();
  return (
    <div className="no-print flex items-center justify-between gap-3">
      <Link href={href} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-forest">
        <ArrowLeft className="size-4" /> {t("back")}
      </Link>
      <PrintButton />
    </div>
  );
}

export function InfoGrid({ items }: { items: { Icon: LucideIcon; label: string; value: React.ReactNode }[] }) {
  return (
    <Card className="py-4">
      <CardContent className="grid grid-cols-2 gap-4 px-4 sm:grid-cols-4">
        {items.map(({ Icon, label, value }) => (
          <div key={label} className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-moss">
              <Icon className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] tracking-wide text-muted-foreground uppercase">{label}</p>
              <p className="truncate text-sm font-medium">{value}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
