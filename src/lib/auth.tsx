"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db, firebaseConfigured } from "./firebase";
import type { UserProfile } from "./types";

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(firebaseConfigured);

  useEffect(() => {
    if (!firebaseConfigured) return;
    let unsubProfile: (() => void) | undefined;
    const unsub = onAuthStateChanged(auth, (u) => {
      unsubProfile?.();
      setUser(u);
      if (!u) {
        setProfile(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      unsubProfile = onSnapshot(
        doc(db, "users", u.uid),
        (snap) => {
          setProfile(snap.exists() ? ({ uid: u.uid, ...snap.data() } as UserProfile) : null);
          setLoading(false);
        },
        () => {
          setProfile(null);
          setLoading(false);
        },
      );
    });
    return () => {
      unsub();
      unsubProfile?.();
    };
  }, []);

  return (
    <Ctx.Provider value={{ user, profile, loading, logout: () => signOut(auth) }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
}
