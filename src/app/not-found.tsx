"use client";

import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

/** Any address that is not a page of the app (an old link, a mistyped address). */
export default function NotFound() {
  const { t } = useI18n();
  return (
    <main className="grid min-h-dvh place-items-center bg-background p-6 text-center">
      <div className="grid justify-items-center gap-3">
        <SearchX className="size-10 text-muted-foreground" />
        <h1 className="font-display text-2xl font-semibold">{t("notFound.title")}</h1>
        <p className="max-w-xs text-sm text-muted-foreground">{t("notFound.help")}</p>
        <Button asChild variant="accent" size="lg" className="mt-2">
          <Link href="/">{t("notFound.home")}</Link>
        </Button>
      </div>
    </main>
  );
}
