"use client";

import { useI18n } from "@/lib/i18n";
import { LangToggle } from "./AppShell";

/** Shared look for the sign-in and setup screens. */
export function AuthCard({ title, children }: { title: string; children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen flex-col bg-forest">
      <div className="flex justify-end p-4">
        <LangToggle className="border-cream/30 text-cream hover:bg-moss" />
      </div>
      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center text-cream">
            <p className="font-display text-4xl font-semibold">{t("appName")}</p>
            <p className="mt-1 text-sm text-amber">{t("appTagline")}</p>
          </div>
          <div className="rounded-2xl bg-cream p-6 shadow-xl">
            <h1 className="h2 mb-4">{title}</h1>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
