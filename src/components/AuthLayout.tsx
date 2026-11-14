"use client";

import Image from "next/image";
import { ChefHat, ClipboardCheck, ShieldCheck, UserCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Real photos of the villa, shown one after another behind the welcome text. */
const PHOTOS = ["/auth/villa-dusk.jpg", "/auth/tea-pluckers.jpg", "/auth/garden-cottage.jpg"];

/** Split screen used by the sign-in and setup pages. */
export function AuthLayout({ title, children }: { title: string; children: React.ReactNode }) {
  const { t } = useI18n();
  const steps = [
    { Icon: ChefHat, label: t("role.chef") },
    { Icon: UserCheck, label: t("role.supervisor") },
    { Icon: ShieldCheck, label: t("role.hr") },
    { Icon: ClipboardCheck, label: t("status.approved") },
  ];
  return (
    <div className="auth-anim grid min-h-screen lg:grid-cols-[1.15fr_1fr]">
      {/* left: photo side */}
      <div className="relative hidden overflow-hidden bg-forest text-cream lg:block">
        {PHOTOS.map((src, i) => (
          <div key={src} className="auth-slide absolute inset-0" style={{ animationDelay: `${i * 7}s`, opacity: i === 0 ? 1 : 0 }}>
            <Image src={src} alt="" fill priority={i === 0} sizes="60vw" className="auth-kenburns object-cover" />
          </div>
        ))}
        {/* shade so the words stay easy to read */}
        <div className="absolute inset-0 bg-gradient-to-t from-forest via-forest/55 to-forest/30" aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-r from-forest/70 via-transparent to-transparent" aria-hidden />

        <div className="relative flex h-full flex-col justify-between p-10 xl:p-14">
          <div className="auth-fade-up flex items-center gap-4">
            <Image src="/logos/ag-light.png" alt={t("auth.group")} width={58} height={64} priority className="h-16 w-auto drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]" />
            <Image src="/logos/villa-light.png" alt={t("villa")} width={122} height={64} priority className="h-16 w-auto drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]" />
            <span className="font-display text-2xl font-semibold drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">{t("auth.group")}</span>
          </div>

          <div>
            <span className="auth-fade-up mb-5 block h-1 w-16 rounded-full bg-gradient-to-r from-amber to-leaf" style={{ animationDelay: "0.15s" }} />
            <p className="auth-fade-up max-w-xl font-display text-4xl leading-tight font-semibold drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] xl:text-5xl 2xl:max-w-2xl 2xl:text-6xl"
              style={{ animationDelay: "0.25s" }}>
              {t("auth.heading")}
            </p>
            <p className="auth-fade-up mt-3 max-w-md text-lg text-cream/85" style={{ animationDelay: "0.4s" }}>{t("appTagline")}</p>

            {/* the approval steps, lighting up one after the other */}
            <div className="auth-fade-up mt-8 inline-flex items-start rounded-2xl bg-white/10 px-4 py-4 ring-1 ring-white/15 backdrop-blur-md"
              style={{ animationDelay: "0.55s" }}>
              {steps.map(({ Icon, label }, i) => (
                <div key={label} className="flex items-start">
                  <div className="flex w-20 flex-col items-center gap-2">
                    <span className={cn(
                      "auth-step flex size-12 items-center justify-center rounded-full ring-1 ring-white/20",
                      i === steps.length - 1 ? "bg-leaf text-forest" : "bg-forest/70 text-amber",
                    )} style={{ animationDelay: `${i * 0.9}s` }}>
                      <Icon className="size-5" />
                    </span>
                    <span className="text-center text-xs text-cream/90">{label}</span>
                  </div>
                  {i < steps.length - 1 && (
                    <span className="relative mt-6 h-0.5 w-8 overflow-hidden rounded-full bg-white/20">
                      <span className="auth-travel absolute inset-y-0 w-1/2 rounded-full bg-amber" style={{ animationDelay: `${i * 0.9 + 0.45}s` }} />
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* which photo is showing */}
            <div className="mt-8 flex items-center justify-between gap-4">
              <p className="text-xs text-cream/70">© {t("auth.group")}</p>
              <div className="flex gap-1.5" aria-hidden>
                {PHOTOS.map((src, i) => (
                  <span key={src} className="h-1 w-8 overflow-hidden rounded-full bg-white/25">
                    <span className="auth-dot block h-full w-full origin-left rounded-full bg-amber" style={{ animationDelay: `${i * 7}s` }} />
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* right: sign-in box (form unchanged) */}
      <div className="relative flex flex-col overflow-hidden bg-[radial-gradient(ellipse_at_top_right,rgba(181,211,67,0.14),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(255,169,26,0.10),transparent_50%)] bg-background">
        <Image src="/auth/tea-leaf-1.webp" alt="" width={106} height={180} aria-hidden
          className="auth-float pointer-events-none absolute -top-4 right-8 hidden w-20 rotate-[28deg] opacity-80 drop-shadow-xl lg:block" />
        <Image src="/auth/tea-leaf-3.webp" alt="" width={109} height={180} aria-hidden
          className="auth-float-slow pointer-events-none absolute bottom-6 left-6 hidden w-16 -rotate-[35deg] opacity-70 drop-shadow-xl lg:block" />
        <Image src="/auth/tea-leaf-5.webp" alt="" width={71} height={180} aria-hidden
          className="auth-float pointer-events-none absolute top-1/2 right-4 hidden w-10 rotate-[60deg] opacity-60 drop-shadow-lg xl:block" style={{ animationDelay: "2s" }} />

        {/* phones: a photo header with both logos */}
        <div className="relative h-44 overflow-hidden md:h-60 lg:hidden">
          <Image src={PHOTOS[0]} alt="" fill priority sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-forest/90 to-forest/30" aria-hidden />
          <div className="relative flex h-full items-end gap-3 p-4 text-cream">
            <Image src="/logos/ag-light.png" alt={t("auth.group")} width={40} height={44} priority className="h-11 w-auto" />
            <Image src="/logos/villa-light.png" alt={t("villa")} width={84} height={44} priority className="h-11 w-auto" />
            <span className="font-display text-lg leading-tight font-semibold">{t("auth.group")}</span>
          </div>
        </div>

        <div className="relative flex flex-1 items-center justify-center px-4 py-10">
          <Card className="auth-fade-up w-full max-w-sm overflow-hidden shadow-2xl shadow-forest/15 2xl:max-w-md" style={{ animationDelay: "0.2s" }}>
            <span className="-mt-6 block h-1.5 bg-gradient-to-r from-amber via-leaf to-moss" aria-hidden />
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
