"use client";

import { useSettings } from "@/lib/settings";
import { AppLayout } from "@/components/layout";
import { ConnectionSettingsForm } from "@pwrup/shared-ui/connection-settings-form";

function SettingsContent() {
  const { settings, setSettings, resetDefaults } = useSettings();

  return (
    <ConnectionSettingsForm
      settings={settings}
      setSettings={setSettings}
      resetDefaults={resetDefaults}
    />
  );
}

export default function SettingsPage() {
  return (
    <AppLayout title="Settings">
      <SettingsContent />
    </AppLayout>
  );
}
