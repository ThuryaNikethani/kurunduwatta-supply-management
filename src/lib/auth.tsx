"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { backend, type AuthSnapshot } from "./backend";
import type { UserProfile } from "./types";

interface AuthState extends AuthSnapshot {
  profile: UserProfile | null;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [snap, setSnap] = useState<AuthSnapshot>({ status: "loading", profile: null });

  useEffect(() => backend.onAuth(setSnap), []);

  // Mark signed out straight away: the login page would otherwise still see the
  // old session for a moment and send the person back to the home page.
  const logout = async () => {
    try {
      await backend.signOut();
    } finally {
      setSnap({ status: "signedOut", profile: null });
    }
  };
  return <Ctx.Provider value={{ ...snap, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
}
