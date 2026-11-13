"use client";

import Image from "next/image";
import { ChefHat, ClipboardCheck, ShieldCheck, UserCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** A tea leaf, drawn with currentColor. */
function Leaf({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 40 64" className={className} style={style} aria-hidden>
      <path d="M20 2C34 16 38 38 20 62 2 38 6 16 20 2Z" fill="currentColor" />
      <path d="M20 8V58M20 22l-7-6M20 32l8-7M20 42l-8-7M20 50l7-6" stroke="rgba(19,40,27,0.35)" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/** Leaves drifting down the left side: [left %, size px, seconds, delay s, colour]. */
const LEAVES: [number, number, number, number, string][] = [
  [8, 22, 17, 0, "text-leaf/70"],
  [24, 16, 21, 5, "text-leaf-deep/80"],
  [41, 26, 19, 9, "text-leaf/50"],
  [58, 14, 23, 2, "text-amber/50"],
  [72, 20, 18, 12, "text-leaf/60"],
  [86, 18, 25, 7, "text-leaf-deep/70"],
  [94, 12, 20, 15, "text-leaf/40"],
];

/** Rolling tea-estate hills along the bottom of the left side. */
function Hills() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-72" aria-hidden>
      <svg viewBox="0 0 1200 300" preserveAspectRatio="none" className="auth-sway-slow absolute -left-[5%] bottom-0 h-full w-[110%]">
        <path d="M0 150C150 90 300 120 450 100S750 40 900 80 1100 120 1200 90V300H0Z" fill="#1d3a27" />
        {/* tea rows */}
        {[0, 1, 2, 3].map((i) => (
          <path key={i} d={`M0 ${190 + i * 22}C200 ${150 + i * 22} 420 ${175 + i * 22} 620 ${150 + i * 22}S1000 ${120 + i * 22} 1200 ${150 + i * 22}`}
            stroke="#2c5638" strokeWidth="5" strokeDasharray="2 14" strokeLinecap="round" fill="none" />
        ))}
      </svg>
      <svg viewBox="0 0 1200 300" preserveAspectRatio="none" className="auth-sway absolute -left-[5%] bottom-0 h-3/4 w-[110%]">
        <path d="M0 140C180 80 380 150 560 120S900 60 1200 130V300H0Z" fill="#22432d" />
        {[0, 1, 2].map((i) => (
          <path key={i} d={`M0 ${180 + i * 26}C220 ${130 + i * 26} 420 ${190 + i * 26} 640 ${160 + i * 26}S1000 ${110 + i * 26} 1200 ${170 + i * 26}`}
            stroke="#3a6b45" strokeWidth="6" strokeDasharray="2 16" strokeLinecap="round" fill="none" />
        ))}
      </svg>
    </div>
  );
}

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
    <div className="auth-anim grid min-h-screen lg:grid-cols-2">
      {/* left: picture side */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[#0f2216] via-forest to-[#1a3624] p-10 text-cream lg:flex">
        {/* morning sun */}
        <div className="auth-glow absolute -top-28 -right-28 size-[28rem] rounded-full bg-[radial-gradient(circle,rgba(255,195,92,0.35),rgba(255,169,26,0.08)_45%,transparent_70%)]" aria-hidden />
        <div className="auth-glow-slow absolute top-1/3 -left-40 size-96 rounded-full bg-[radial-gradient(circle,rgba(181,211,67,0.18),transparent_65%)]" aria-hidden />
        <Hills />
        {LEAVES.map(([left, size, dur, delay, colour], i) => (
          <Leaf key={i} className={cn("auth-leaf absolute -top-16", colour)}
            style={{ left: `${left}%`, width: size, animationDuration: `${dur}s`, animationDelay: `${delay}s` }} />
        ))}

        <div className="auth-fade-up relative flex items-center gap-4">
          <Image src="/logos/ag-light.png" alt={t("auth.group")} width={58} height={64} priority className="h-16 w-auto drop-shadow-lg" />
          <Image src="/logos/villa-light.png" alt={t("villa")} width={122} height={64} priority className="h-16 w-auto drop-shadow-lg" />
          <span className="font-display text-2xl font-semibold">{t("auth.group")}</span>
        </div>

        <div className="relative pb-24">
          <span className="auth-fade-up mb-5 block h-1 w-16 rounded-full bg-gradient-to-r from-amber to-leaf" style={{ animationDelay: "0.15s" }} />
          <p className="auth-fade-up font-display text-4xl leading-tight font-semibold" style={{ animationDelay: "0.25s" }}>
            {t("auth.heading")}
          </p>
          <p className="auth-fade-up mt-3 max-w-md text-cream/75" style={{ animationDelay: "0.4s" }}>{t("appTagline")}</p>

          {/* the approval steps, lighting up one after the other */}
          <div className="auth-fade-up mt-10 flex items-start" style={{ animationDelay: "0.55s" }}>
            {steps.map(({ Icon, label }, i) => (
              <div key={label} className="flex items-start">
                <div className="flex w-20 flex-col items-center gap-2">
                  <span className={cn(
                    "auth-step flex size-14 items-center justify-center rounded-full ring-1 ring-cream/15 backdrop-blur",
                    i === steps.length - 1 ? "bg-leaf text-forest" : "bg-moss/80 text-amber",
                  )} style={{ animationDelay: `${i * 0.9}s` }}>
                    <Icon className="size-6" />
                  </span>
                  <span className="text-center text-xs text-cream/85">{label}</span>
                </div>
                {i < steps.length - 1 && (
                  <span className="relative mt-7 h-0.5 w-10 overflow-hidden rounded-full bg-amber/25">
                    <span className="auth-travel absolute inset-y-0 w-1/2 rounded-full bg-amber" style={{ animationDelay: `${i * 0.9 + 0.45}s` }} />
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-cream/60">© {t("auth.group")}</p>
      </div>

      {/* right: sign-in box (unchanged form) */}
      <div className="relative flex flex-col overflow-hidden bg-background">
        <Leaf className="auth-float pointer-events-none absolute -top-6 right-10 hidden w-24 rotate-[25deg] text-leaf/15 opacity-60 lg:block" />
        <Leaf className="auth-float-slow pointer-events-none absolute bottom-10 -left-6 w-32 -rotate-[30deg] text-leaf-deep/10 opacity-60" />
        <div className="relative flex items-center justify-between p-4">
          <span className="flex items-center gap-3 lg:invisible">
            <Image src="/logos/ag-clear.png" alt={t("auth.group")} width={36} height={40} priority className="h-10 w-auto" />
            <Image src="/logos/villa.png" alt={t("villa")} width={76} height={40} priority className="h-10 w-auto" />
            <span className="font-display text-lg font-semibold">{t("auth.group")}</span>
          </span>
        </div>
        <div className="relative flex flex-1 items-center justify-center px-4 pb-16">
          <Card className="auth-fade-up w-full max-w-sm overflow-hidden shadow-xl shadow-forest/10" style={{ animationDelay: "0.2s" }}>
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
