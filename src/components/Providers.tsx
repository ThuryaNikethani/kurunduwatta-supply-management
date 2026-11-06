"use client";

import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth";
import { I18nProvider } from "@/lib/i18n";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <AuthProvider>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </AuthProvider>
    </I18nProvider>
  );
}
