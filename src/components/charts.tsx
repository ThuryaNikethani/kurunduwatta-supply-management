"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Small, dependency-free charts in the villa style.
 * Colours were checked with the dataviz palette validator (light surface).
 */
export const SERIES_COLORS = { guests: "#c9771a", staff: "#2f7fae" } as const;

/** Clean whole-number axis: a 1/2/5 × 10ⁿ step and the ticks up to the top. */
function niceTicks(v: number) {
  const raw = Math.max(v, 1) / 4;
  const p = 10 ** Math.floor(Math.log10(raw));
  const f = raw / p;
  const step = Math.max(1, (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p);
  const max = Math.ceil(Math.max(v, 1) / step) * step;
  return { max, ticks: Array.from({ length: max / step + 1 }, (_, i) => i * step) };
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: i.color }} aria-hidden />
          {i.label}
        </span>
      ))}
    </div>
  );
}

interface Series<K extends string> {
  key: K;
  label: string;
  color: string;
}

/** Stacked columns, one per day, with a hover/tap tooltip. */
export function StackedColumns<K extends string, R extends { day: number } & Record<K, number>>({
  rows, series, dayLabel, totalLabel, height = 220,
}: {
  rows: R[];
  series: Series<K>[];
  dayLabel: (day: number) => string;
  totalLabel: string;
  height?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const totals = rows.map((r) => series.reduce((s, x) => s + (r[x.key] ?? 0), 0));
  const { max, ticks } = niceTicks(Math.max(...totals, 0));

  return (
    <div className="relative" onMouseLeave={() => setHover(null)}>
      <div className="flex gap-2" style={{ height }}>
        {/* y axis */}
        <div className="relative w-8 shrink-0 text-right text-[10px] text-muted-foreground tabular-nums">
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ bottom: `${(t / max) * 100}%` }}>
              {t}
            </span>
          ))}
        </div>
        {/* plot */}
        <div className="relative flex-1">
          {ticks.map((t) => (
            <div key={t} className="absolute inset-x-0 border-t border-border" style={{ bottom: `${(t / max) * 100}%` }} aria-hidden />
          ))}
          <div className="absolute inset-0 flex items-end">
            {rows.map((r, i) => (
              <button
                key={r.day}
                type="button"
                className="group flex h-full flex-1 items-end justify-center focus:outline-none"
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                onClick={() => setHover(i)}
                aria-label={`${dayLabel(r.day)}: ${series.map((s) => `${s.label} ${r[s.key]}`).join(", ")}`}
              >
                <span
                  className={cn("flex w-full max-w-6 flex-col-reverse gap-[2px] px-[1px]", hover === i && "opacity-90")}
                  style={{ height: `${(totals[i] / max) * 100}%` }}
                >
                  {series.map((s, si) => {
                    const v = r[s.key] ?? 0;
                    if (!v) return null;
                    const isTop = series.slice(si + 1).every((x) => !r[x.key]);
                    return (
                      <span
                        key={s.key}
                        className={cn("block w-full", isTop && "rounded-t-[4px]")}
                        style={{ flexGrow: v, flexBasis: 0, background: s.color }}
                      />
                    );
                  })}
                </span>
              </button>
            ))}
          </div>
          {hover !== null && totals[hover] > 0 && (
            <div
              className="pointer-events-none absolute -top-2 z-10 min-w-36 -translate-x-1/2 -translate-y-full rounded-lg border bg-popover px-3 py-2 text-xs shadow-md"
              style={{ left: `${((hover + 0.5) / rows.length) * 100}%` }}
            >
              <p className="mb-1 font-medium">{dayLabel(rows[hover].day)}</p>
              {series.map((s) => (
                <p key={s.key} className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <span className="size-2 rounded-sm" style={{ background: s.color }} />
                    {s.label}
                  </span>
                  <span className="tabular-nums">{rows[hover][s.key]}</span>
                </p>
              ))}
              <p className="mt-1 flex justify-between gap-3 border-t pt-1 font-medium">
                <span>{totalLabel}</span>
                <span className="tabular-nums">{totals[hover]}</span>
              </p>
            </div>
          )}
        </div>
      </div>
      {/* x axis: every 5th day so labels never collide */}
      <div className="ml-10 flex text-[10px] text-muted-foreground">
        {rows.map((r) => (
          <span key={r.day} className="flex-1 text-center tabular-nums">
            {r.day === 1 || r.day % 5 === 0 ? r.day : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Horizontal bars for a single measure, value at the bar tip. */
export function HorizontalBars({ rows, color }: { rows: { label: string; value: number }[]; color: string }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="grid gap-2.5">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[minmax(0,10rem)_1fr] items-center gap-3 text-sm" title={`${r.label}: ${r.value}`}>
          <span className="truncate text-muted-foreground">{r.label}</span>
          <span className="flex items-center gap-2">
            <span className="h-4 rounded-r-[4px]" style={{ width: `${(r.value / max) * 85}%`, background: color, minWidth: 4 }} />
            <span className="text-xs tabular-nums">{r.value}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
