"use client";

import { SettingsProvider } from "@pwrup/shared-core/settings";

export function Providers({ children }: { children: React.ReactNode }) {
  return <SettingsProvider>{children}</SettingsProvider>;
}
