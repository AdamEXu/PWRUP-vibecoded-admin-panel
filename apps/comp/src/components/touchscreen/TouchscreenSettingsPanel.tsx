"use client";

import { useEffect, useState } from "react";
import { useSettings, ntSelectedPathTopics } from "@/lib/settings";

const colScroll = [
  "overflow-y-auto",
  "[&::-webkit-scrollbar]:w-[5px]",
  "[&::-webkit-scrollbar-track]:bg-transparent",
  "[&::-webkit-scrollbar-thumb]:bg-[#70cd35]",
  "[&::-webkit-scrollbar-thumb]:rounded-none",
].join(" ");

function Field({
  label,
  id,
  value,
  onChange,
  placeholder,
  numeric,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  numeric?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-xs font-semibold tracking-[0.2em] text-white">
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode={numeric ? "numeric" : undefined}
        placeholder={placeholder}
        value={value}
        onChange={(e) =>
          onChange(numeric ? e.target.value.replace(/\D+/g, "") : e.target.value)
        }
        className="h-[72px] w-full border-2 border-white/20 bg-[#272727] px-5 text-2xl font-light text-white outline-none placeholder:text-zinc-600 focus:border-[#70cd35] focus:bg-[#1a2410]"
      />
    </div>
  );
}

function NTPreview({
  ntHost,
  previewTopics,
}: {
  ntHost: string;
  previewTopics: ReturnType<typeof ntSelectedPathTopics>;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold tracking-[0.2em]">NT Preview</p>
      <div className="flex flex-col divide-y-2 divide-white/10 border-2 border-white/10">
        {[
          { label: "Host", value: ntHost || "(not set)" },
          { label: "Request topic", value: previewTopics.requestTopic },
          { label: "State topic", value: previewTopics.stateTopic },
          {
            label: "Robot constants",
            value: `${previewTopics.requestTopicWithoutLeadingSlash} / ${previewTopics.stateTopicWithoutLeadingSlash}`,
          },
        ].map((row) => (
          <div key={row.label} className="flex flex-col gap-1 px-5 py-4">
            <span className="text-xs text-zinc-500">{row.label}</span>
            <span className="break-all font-mono text-base text-zinc-100">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TouchscreenSettingsPanel() {
  const { settings, setSettings, resetDefaults } = useSettings();

  const [host, setHost] = useState(settings.host);
  const [port, setPort] = useState(String(settings.port));
  const [ntHost, setNtHost] = useState(settings.networkTables.host);
  const [ntPort, setNtPort] = useState(String(settings.networkTables.port));
  const [sharedTable, setSharedTable] = useState(settings.networkTables.sharedTable);
  const [selectedPathTopic, setSelectedPathTopic] = useState(settings.networkTables.selectedPathTopic);

  useEffect(() => {
    setHost(settings.host);
    setPort(String(settings.port));
    setNtHost(settings.networkTables.host);
    setNtPort(String(settings.networkTables.port));
    setSharedTable(settings.networkTables.sharedTable);
    setSelectedPathTopic(settings.networkTables.selectedPathTopic);
  }, [
    settings.host,
    settings.port,
    settings.networkTables.host,
    settings.networkTables.port,
    settings.networkTables.sharedTable,
    settings.networkTables.selectedPathTopic,
  ]);

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

  const previewTopics = ntSelectedPathTopics(nextSharedTable, nextSelectedPathTopic);

  function onSave() {
    if (!canSave) { return; }
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
  }

  function onReset() {
    resetDefaults();
  }

  return (
    <div className="flex h-full flex-col bg-[#181818]">

      {/* Header — title + status + actions */}
      <div className="shrink-0 border-b-2 border-white/10 px-8 py-5 flex items-center justify-between gap-6">
        <div className="flex items-baseline gap-4">
          <h1 className="text-[28px] font-semibold text-white leading-none">Connection Settings</h1>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onReset}
            className="h-12 border-2 border-white/20 bg-transparent px-6 text-sm font-semibold text-zinc-400 transition-colors hover:bg-white/5 active:bg-white/10"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!canSave || !hasChanges}
            className="h-12 bg-[#70cd35] px-8 text-sm font-semibold text-black transition-opacity disabled:opacity-30 active:opacity-70"
          >
            Save
          </button>
        </div>
      </div>

      {/* Columns — horizontal scroll wrapper */}
      <div
        className={[
          "min-h-0 flex-1 flex overflow-x-auto",
          "[&::-webkit-scrollbar]:h-[5px]",
          "[&::-webkit-scrollbar-track]:bg-[#272727]",
          "[&::-webkit-scrollbar-thumb]:bg-[#70cd35]",
          "[&::-webkit-scrollbar-thumb]:rounded-none",
        ].join(" ")}
      >

        {/* Autobahn */}
        <div className={`w-[420px] shrink-0 border-r-2 border-white/10 flex flex-col ${colScroll}`}>
          <div className="flex flex-col gap-7 px-8 py-8">
            <p className="text-[24px] font-semibold text-white">Autobahn</p>
            <Field label="Host" id="ts-host" value={host} onChange={setHost} placeholder="10.47.65.7" />
            <Field label="Port" id="ts-port" value={port} onChange={setPort} placeholder="8080" numeric />
          </div>
        </div>

        {/* NetworkTables */}
        <div className={`w-[420px] shrink-0 border-r-2 border-white/10 flex flex-col ${colScroll}`}>
          <div className="flex flex-col gap-7 px-8 py-8">
            <p className="text-[24px] font-semibold text-white">NetworkTables</p>
            <Field label="Robot NT Host / IP" id="ts-nt-host" value={ntHost} onChange={setNtHost} placeholder="10.47.65.2" />
            <Field label="NT Port" id="ts-nt-port" value={ntPort} onChange={setNtPort} placeholder="5810" numeric />
            <Field label="Shared Table" id="ts-shared-table" value={sharedTable} onChange={setSharedTable} placeholder="Shared/PathPlanner" />
            <Field label="Request Topic Base" id="ts-selected-topic" value={selectedPathTopic} onChange={setSelectedPathTopic} placeholder="SelectedPath" />
          </div>
        </div>

        {/* NT Preview */}
        <div className={`w-[420px] shrink-0 flex flex-col ${colScroll}`}>
          <div className="flex flex-col gap-7 px-8 py-8">
            <p className="text-[24px] font-semibold text-white">Preview</p>
            <NTPreview ntHost={ntHost} previewTopics={previewTopics} />
          </div>
        </div>

      </div>
    </div>
  );
}
