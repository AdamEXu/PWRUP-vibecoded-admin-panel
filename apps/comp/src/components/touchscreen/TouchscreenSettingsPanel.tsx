"use client";

import { useEffect, useState } from "react";
import { getBridge, hasBridge, subscribeAutobahnStatus } from "@/lib/blitzRenderer";
import { NetworkTablesPreview } from "./settings/components/NetworkTablesPreview";
import { SettingsColumn } from "./settings/components/SettingsColumn";
import { SettingsField } from "./settings/components/SettingsField";
import { SettingsHeader } from "./settings/components/SettingsHeader";
import { useTouchscreenSettingsForm } from "./settings/hooks/useTouchscreenSettingsForm";

export function TouchscreenSettingsPanel() {
  const {
    host,
    ntHost,
    ntPort,
    onReset,
    onSave,
    port,
    previewTopics,
    saveEnabled,
    selectedPathTopic,
    setHost,
    setNtHost,
    setNtPort,
    setPort,
    setSelectedPathTopic,
    setSharedTable,
    sharedTable,
  } = useTouchscreenSettingsForm();

  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!hasBridge()) return;

    let disposed = false;
    const unsubscribe = subscribeAutobahnStatus((connected) => {
      if (!disposed) setIsConnected(connected);
    });

    void getBridge()
      .autobahn.getStatus()
      .then((connected) => {
        if (!disposed) setIsConnected(connected);
      })
      .catch(() => {
        if (!disposed) setIsConnected(false);
      });

    return () => {
      disposed = true;
      unsubscribe();
    };
  }, []);

  function onReconnect() {
    if (hasBridge()) {
      void getBridge().autobahn.reconnect().catch(() => {});
    }
  }

  return (
    <div className="flex h-full flex-col bg-[#272727]">
      <SettingsHeader
        onReset={onReset}
        onSave={onSave}
        onReconnect={onReconnect}
        canSave={saveEnabled}
        isConnected={isConnected}
      />

      <div
        className={[
          "min-h-0 flex-1 flex overflow-x-scroll",
          "[&::-webkit-scrollbar]:h-[5px]",
          "[&::-webkit-scrollbar-track]:bg-[#272727]",
          "[&::-webkit-scrollbar-thumb]:bg-[#70cd35]",
          "[&::-webkit-scrollbar-thumb]:rounded-none",
          "[&::-webkit-scrollbar-thumb]:cursor-pointer",
        ].join(" ")}
      >
        <SettingsColumn title="Autobahn" bordered>
          <SettingsField
            label="Host"
            id="ts-host"
            value={host}
            onChange={setHost}
            placeholder="10.47.65.7"
          />
          <SettingsField
            label="Port"
            id="ts-port"
            value={port}
            onChange={setPort}
            placeholder="8080"
            numeric
          />
        </SettingsColumn>

        <SettingsColumn title="NetworkTables" bordered>
          <SettingsField
            label="Robot NT Host / IP"
            id="ts-nt-host"
            value={ntHost}
            onChange={setNtHost}
            placeholder="10.47.65.2"
          />
          <SettingsField
            label="NT Port"
            id="ts-nt-port"
            value={ntPort}
            onChange={setNtPort}
            placeholder="5810"
            numeric
          />
          <SettingsField
            label="Shared Table"
            id="ts-shared-table"
            value={sharedTable}
            onChange={setSharedTable}
            placeholder="Shared/PathPlanner"
          />
          <SettingsField
            label="Request Topic Base"
            id="ts-selected-topic"
            value={selectedPathTopic}
            onChange={setSelectedPathTopic}
            placeholder="SelectedPath"
          />
        </SettingsColumn>

        <SettingsColumn title="Preview">
          <NetworkTablesPreview ntHost={ntHost} previewTopics={previewTopics} />
        </SettingsColumn>
      </div>
    </div>
  );
}
