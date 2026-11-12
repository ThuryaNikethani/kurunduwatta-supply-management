"use client";

import Image from "next/image";
import { ChefHat, ClipboardCheck, ShieldCheck, UserCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";

/** Split screen used by the sign-in and setup pages. */
export function AuthLayout({ title, children }: { title: string; children: React.ReactNode }) {
  const { t } = useI18n();
  const steps = [
    { Icon: ChefHat, label: t("role.chef") },
    { Icon: UserCheck, label: t("role.supervisor") },
    { Icon: ShieldCheck, label: t("role.hr") },
  ];
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-forest p-10 text-cream lg:flex">
        <div className="absolute -top-24 -right-24 size-96 rounded-full bg-moss/60" aria-hidden />
        <div className="absolute -bottom-32 -left-16 size-80 rounded-full bg-moss/40" aria-hidden />
        <div className="relative flex items-center gap-4">
          <Image src="/logos/ag-light.png" alt={t("auth.group")} width={58} height={64} priority className="h-16 w-auto" />
          <Image src="/logos/villa-light.png" alt={t("villa")} width={122} height={64} priority className="h-16 w-auto" />
          <span className="font-display text-2xl font-semibold">{t("auth.group")}</span>
        </div>
        <div className="relative">
          <p className="font-display text-4xl leading-tight font-semibold">{t("auth.heading")}</p>
          <p className="mt-3 max-w-md text-cream/70">{t("appTagline")}</p>
          <div className="mt-10 flex items-center gap-3">
            {steps.map(({ Icon, label }, i) => (
              <div key={label} className="flex items-center gap-3">
                <div className="flex flex-col items-center gap-2">
                  <span className="flex size-12 items-center justify-center rounded-full bg-moss text-amber ring-1 ring-cream/10">
                    <Icon className="size-5" />
                  </span>
                  <span className="text-xs text-cream/80">{label}</span>
                </div>
                {i < steps.length - 1 && <span className="mb-6 h-px w-10 bg-amber/50" />}
              </div>
            ))}
            <span className="mb-6 h-px w-10 bg-amber/50" />
            <div className="flex flex-col items-center gap-2">
              <span className="flex size-12 items-center justify-center rounded-full bg-leaf text-forest">
                <ClipboardCheck className="size-5" />
              </span>
              <span className="text-xs text-cream/80">{t("status.approved")}</span>
            </div>
          </div>
        </div>
        <p className="relative text-xs text-cream/50">© {t("auth.group")}</p>
      </div>

      <div className="flex flex-col bg-background">
        <div className="flex items-center justify-between p-4">
          <span className="flex items-center gap-3 lg:invisible">
            <Image src="/logos/ag-clear.png" alt={t("auth.group")} width={36} height={40} priority className="h-10 w-auto" />
            <Image src="/logos/villa.png" alt={t("villa")} width={76} height={40} priority className="h-10 w-auto" />
            <span className="font-display text-lg font-semibold">{t("auth.group")}</span>
          </span>
        </div>
        <div className="flex flex-1 items-center justify-center px-4 pb-16">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle className="font-display text-3xl">{title}</CardTitle>
            </CardHeader>
            <CardContent>{children}</CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
