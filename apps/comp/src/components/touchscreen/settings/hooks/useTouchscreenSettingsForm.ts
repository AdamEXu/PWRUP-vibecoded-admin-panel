import { useMemo, useState } from "react";
import { ntSelectedPathTopics, useSettings } from "@/lib/settings";

interface TouchscreenSettingsDraft {
  host: string;
  port: string;
  ntHost: string;
  ntPort: string;
  sharedTable: string;
  selectedPathTopic: string;
}

function createDraft(settings: ReturnType<typeof useSettings>["settings"]): TouchscreenSettingsDraft {
  return {
    host: settings.host,
    port: String(settings.port),
    ntHost: settings.networkTables.host,
    ntPort: String(settings.networkTables.port),
    sharedTable: settings.networkTables.sharedTable,
    selectedPathTopic: settings.networkTables.selectedPathTopic,
  };
}

export function useTouchscreenSettingsForm() {
  const { settings, setSettings, resetDefaults } = useSettings();
  const sourceDraft = createDraft(settings);
  const [draft, setDraft] = useState<TouchscreenSettingsDraft | null>(null);
  const { host, ntHost, ntPort, port, selectedPathTopic, sharedTable } = draft ?? sourceDraft;

  function updateDraft(patch: Partial<TouchscreenSettingsDraft>) {
    setDraft((current) => ({ ...(current ?? sourceDraft), ...patch }));
  }

  const nextHost = host.trim();
  const nextPort = Number(port);
  const nextNtHost = ntHost.trim();
  const nextNtPort = Number(ntPort);
  const nextSharedTable = sharedTable.trim();
  const nextSelectedPathTopic = selectedPathTopic.trim();

  const canSave =
    nextHost.length > 0 &&
    Number.isFinite(nextPort) && nextPort > 0 && nextPort <= 65535 &&
    nextNtHost.length > 0 &&
    Number.isFinite(nextNtPort) && nextNtPort > 0 && nextNtPort <= 65535 &&
    nextSharedTable.length > 0 &&
    nextSelectedPathTopic.length > 0;

  const hasChanges =
    nextHost !== settings.host ||
    Math.round(nextPort) !== settings.port ||
    nextNtHost !== settings.networkTables.host ||
    Math.round(nextNtPort) !== settings.networkTables.port ||
    nextSharedTable !== settings.networkTables.sharedTable ||
    nextSelectedPathTopic !== settings.networkTables.selectedPathTopic;

  const saveEnabled = canSave && hasChanges;

  const previewTopics = useMemo(
    () => ntSelectedPathTopics(nextSharedTable, nextSelectedPathTopic),
    [nextSharedTable, nextSelectedPathTopic],
  );

  function onSave() {
    if (!canSave) {
      return;
    }

    setSettings({
      host: nextHost,
      port: Math.round(nextPort),
      networkTables: {
        host: nextNtHost,
        port: Math.round(nextNtPort),
        sharedTable: nextSharedTable,
        selectedPathTopic: nextSelectedPathTopic,
      },
    });
    setDraft(null);
  }

  function onReset() {
    setDraft(null);
    resetDefaults();
  }

  return {
    host,
    ntHost,
    ntPort,
    onReset,
    onSave,
    port,
    previewTopics,
    saveEnabled,
    selectedPathTopic,
    setHost: (value: string) => updateDraft({ host: value }),
    setNtHost: (value: string) => updateDraft({ ntHost: value }),
    setNtPort: (value: string) => updateDraft({ ntPort: value }),
    setPort: (value: string) => updateDraft({ port: value }),
    setSelectedPathTopic: (value: string) => updateDraft({ selectedPathTopic: value }),
    setSharedTable: (value: string) => updateDraft({ sharedTable: value }),
    sharedTable,
  };
}
