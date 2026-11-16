"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { useRecipes, useSupplyLists } from "@/lib/hooks";
import type { Unit } from "@/lib/types";
import { loginSkeleton as sound, singlishSpelling as spell } from "@/lib/username";
import { cn } from "@/lib/utils";

/** Same text however it was typed (case, extra spaces, invisible joiners). */
const key = (s: string) => s.normalize("NFC").replace(/[​-‍⁠﻿]/g, "").replace(/\s+/g, " ").trim().toLowerCase();

export interface KnownItem {
  name: string;
  unit: Unit;
  /** How often it has been used, so common items come first. */
  uses: number;
}

/** Every item name the app already knows: recipe ingredients and items from earlier lists. */
export function useKnownItems(): KnownItem[] {
  const recipes = useRecipes();
  const lists = useSupplyLists();
  return useMemo(() => {
    const map = new Map<string, KnownItem>();
    const add = (name: string, unit: Unit) => {
      const k = key(name);
      if (!k) return;
      const cur = map.get(k);
      // The unit last used wins; earlier lists come after recipes, so they override.
      map.set(k, { name: cur?.name ?? name.trim(), unit, uses: (cur?.uses ?? 0) + 1 });
    };
    for (const r of recipes.data ?? []) for (const i of r.ingredients ?? []) add(i.name, i.unit);
    const byDate = [...(lists.data ?? [])].sort((a, b) => a.createdAt - b.createdAt);
    for (const l of byDate) for (const i of l.items) add(i.name, i.unit);
    return [...map.values()];
  }, [recipes.data, lists.data]);
}

/**
 * Up to 6 names that start with what was typed (or have a word that does).
 * Typed in English letters ("Umbalakada", "umb"), names that sound the same
 * are found too (උම්බලකඩ), by comparing the sounds without the vowels.
 */
export function suggest(typed: string, known: KnownItem[]) {
  const q = key(typed);
  if (!q) return [];
  const singlish = /[a-z]/.test(q) && !/[඀-෿]/.test(q) && q.length >= 2;
  const sp = singlish ? spell(q) : "";
  const sq = singlish ? sound(q) : "";
  const starts: KnownItem[] = [];
  const word: KnownItem[] = [];
  const spellStarts: KnownItem[] = [];
  const spellWord: KnownItem[] = [];
  const soundStarts: KnownItem[] = [];
  const soundWord: KnownItem[] = [];
  for (const k of known) {
    const n = key(k.name);
    if (n === q) continue;
    const words = n.split(" ");
    if (n.startsWith(q)) starts.push(k);
    else if (words.some((w) => w.startsWith(q))) word.push(k);
    else if (sp && spell(n).startsWith(sp)) spellStarts.push(k);
    else if (sp && words.some((w) => spell(w).startsWith(sp))) spellWord.push(k);
    else if (sq && sound(n).startsWith(sq)) soundStarts.push(k);
    else if (sq && words.some((w) => sound(w).startsWith(sq))) soundWord.push(k);
  }
  const order = (a: KnownItem, b: KnownItem) => b.uses - a.uses || a.name.localeCompare(b.name);
  const close = [starts, word, spellStarts, spellWord].flatMap((g) => g.sort(order));
  // Only when nothing is spelt the same, fall back to names that roughly sound alike.
  const rough = close.length ? [] : [soundStarts, soundWord].flatMap((g) => g.sort(order));
  return [...close, ...rough].slice(0, 6);
}

/**
 * The item name box. While typing, names the app already knows show under it;
 * tapping one fills the name (and its usual unit). Typing any other name is fine too.
 */
export function ItemNameInput({
  value, onChange, onPick, known, placeholder, invalid,
}: {
  value: string;
  onChange: (name: string) => void;
  onPick: (item: KnownItem) => void;
  known: KnownItem[];
  placeholder: string;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const list = open ? suggest(value, known) : [];

  function pick(k: KnownItem) {
    onPick(k);
    setOpen(false);
  }

  return (
    <div className="relative">
      <Input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        aria-invalid={invalid}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        role="combobox"
        aria-expanded={list.length > 0}
        aria-autocomplete="list"
        onChange={(e) => { onChange(e.target.value); setOpen(true); setActive(0); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (!list.length) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a + 1) % list.length); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a - 1 + list.length) % list.length); }
          else if (e.key === "Enter") { e.preventDefault(); pick(list[active]); }
          else if (e.key === "Escape") setOpen(false);
        }}
      />
      {list.length > 0 && (
        <ul role="listbox" className="absolute top-full right-0 left-0 z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border bg-popover p-1 shadow-lg">
          {list.map((k, i) => (
            <li key={k.name} role="option" aria-selected={i === active}>
              <button
                type="button"
                // Keep the box focused so the tap is not lost when it closes.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(k)}
                className={cn("w-full rounded-lg px-3 py-2.5 text-left text-base", i === active ? "bg-amber/20" : "hover:bg-muted")}
              >
                {k.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
