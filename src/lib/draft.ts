"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "./auth";

/**
 * Keeps unsent form input in this browser so a refresh or closed tab
 * doesn't lose it. Drafts are per user and per form, and expire after a week.
 * (Browser storage is fine here: it's a convenience for this one person.)
 */

const PREFIX = "kw-draft:";
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function storageKey(uid: string, key: string) {
  return `${PREFIX}${uid}:${key}`;
}

/** True if this user has a saved draft for the form. */
export function hasDraft(uid: string | undefined, key: string) {
  if (!uid) return false;
  try {
    const raw = localStorage.getItem(storageKey(uid, key));
    return !!raw && Date.now() - JSON.parse(raw).savedAt < MAX_AGE;
  } catch {
    return false;
  }
}

export function useDraft<T>(key: string, value: T, apply: (v: T) => void, initial: T) {
  const { profile } = useAuth();
  const full = profile ? storageKey(profile.uid, key) : null;
  const [restoredAt, setRestoredAt] = useState<number | null>(null);
  const checked = useRef<string | null>(null);
  const stopped = useRef(false);
  const initialJson = useRef(JSON.stringify(initial));
  const applyRef = useRef(apply);
  applyRef.current = apply;

  // Restore once, as soon as we know who is signed in.
  useEffect(() => {
    if (!full || checked.current === full) return;
    checked.current = full;
    try {
      const raw = localStorage.getItem(full);
      if (!raw) return;
      const d = JSON.parse(raw) as { savedAt: number; value: T };
      if (Date.now() - d.savedAt > MAX_AGE) return localStorage.removeItem(full);
      applyRef.current(d.value);
      setRestoredAt(d.savedAt);
    } catch {}
  }, [full]);

  // Save shortly after each change; an untouched form leaves no draft.
  const json = JSON.stringify(value);
  useEffect(() => {
    if (!full || checked.current !== full || stopped.current) return;
    const timer = setTimeout(() => {
      try {
        if (json === initialJson.current) localStorage.removeItem(full);
        else localStorage.setItem(full, JSON.stringify({ savedAt: Date.now(), value: JSON.parse(json) }));
      } catch {}
    }, 400);
    return () => clearTimeout(timer);
  }, [full, json]);

  /** Call after the form was sent: removes the draft and stops saving. */
  const clear = useCallback(() => {
    stopped.current = true;
    setRestoredAt(null);
    if (full)
      try {
        localStorage.removeItem(full);
      } catch {}
  }, [full]);

  /** Throw the draft away and go back to the starting values. */
  const discard = useCallback(() => {
    if (full)
      try {
        localStorage.removeItem(full);
      } catch {}
    setRestoredAt(null);
    applyRef.current(JSON.parse(initialJson.current) as T);
  }, [full]);

  return { restoredAt, clear, discard };
}
