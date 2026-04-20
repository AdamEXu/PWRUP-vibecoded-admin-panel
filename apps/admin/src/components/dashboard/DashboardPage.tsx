// src/components/dashboard/DashboardPage.tsx - Purpose: compose dashboard shell with small sections
"use client";
import {
  GlobalOverview,
  PiSystemManager,
  MultiPiGrid,
  TopicConfig,
  PingStatus,
} from "@/components/dashboard";
import { useMultiPiDashboard } from "@/lib/hooks/useMultiPiDashboard";
import { useMemo } from "react";

export function DashboardPage() {
  const {
    piSystems,
    globalStats,
    topic,
    setTopic,
    addPiSystem,
    removePiSystem,
    clearLogs,
  } = useMultiPiDashboard();

  const piNames = useMemo(
    () => Array.from(piSystems.keys()),
    [piSystems]
  );

  return (
    <div className="space-y-6">
      <TopicConfig topic={topic} onTopicChange={setTopic} />

      <GlobalOverview stats={globalStats} />

      <PingStatus piNames={piNames} />

      <PiSystemManager
        piSystems={piSystems}
        topic={topic}
        onAddPi={addPiSystem}
        onRemovePi={removePiSystem}
      />

      <div>
        <h2 className="text-lg font-semibold mb-4">System Details</h2>
        <MultiPiGrid piSystems={piSystems} onClearLogs={clearLogs} />
      </div>
    </div>
  );
}
