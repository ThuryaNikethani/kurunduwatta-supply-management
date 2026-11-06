"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useState } from "react";

interface Toast {
  id: number;
  text: string;
  sub?: string;
  href?: string;
  tone?: "info" | "success" | "error";
}

const Ctx = createContext<(t: Omit<Toast, "id">) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((cur) => [...cur.slice(-3), { ...t, id }]);
    setTimeout(() => setToasts((cur) => cur.filter((x) => x.id !== id)), 7000);
  }, []);

  return (
    <Ctx.Provider value={show}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:left-auto sm:w-96">
        {toasts.map((t) => {
          const tone =
            t.tone === "error"
              ? "border-danger/40"
              : t.tone === "success"
                ? "border-leaf"
                : "border-amber";
          const body = (
            <>
              <p className="text-sm font-medium">{t.text}</p>
              {t.sub && <p className="mt-1 line-clamp-2 text-xs text-cream/70">{t.sub}</p>}
            </>
          );
          return (
            <div
              key={t.id}
              className={`pointer-events-auto w-full rounded-xl border-l-4 ${tone} bg-forest p-3 text-cream shadow-lg`}
              role="status"
            >
              {t.href ? <Link href={t.href}>{body}</Link> : body}
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  return useContext(Ctx);
}
