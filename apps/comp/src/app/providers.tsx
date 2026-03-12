"use client";

import { SettingsProvider } from "@/lib/settings";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      {children}
      <Toaster />
    </SettingsProvider>
  );
}
