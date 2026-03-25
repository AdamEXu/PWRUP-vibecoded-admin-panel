"use client";

import { SettingsProvider } from "@/lib/settings";
import { PidAppSettingsProvider } from "@/lib/pid-settings";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      <PidAppSettingsProvider>{children}</PidAppSettingsProvider>
    </SettingsProvider>
  );
}
