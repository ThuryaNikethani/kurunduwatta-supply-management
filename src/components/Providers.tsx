"use client";

import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth";
import { I18nProvider, translate } from "@/lib/i18n";

// Kept outside the component so the toaster gets the same objects every
// render. No keyboard shortcut, so its label stays fully Sinhala.
const NO_HOTKEY: string[] = [];
const TOAST_OPTIONS = { closeButtonAriaLabel: translate("notif.close") };
const TOASTER_LABEL = translate("nav.notifications");

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <AuthProvider>
        {children}
        <Toaster
          position="top-right"
          richColors
          closeButton
          hotkey={NO_HOTKEY}
          containerAriaLabel={TOASTER_LABEL}
          toastOptions={TOAST_OPTIONS}
        />
      </AuthProvider>
    </I18nProvider>
  );
}
