"use client";

import { useMemo, useState } from "react";
import { Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@pwrup/shared-ui/alert";
import { Badge } from "@pwrup/shared-ui/badge";
import { getMechanismById } from "@/lib/analysis/mechanisms";
import { analyzeMechanismTrace } from "@/lib/analysis/analyzeMechanism";
import { useLiveMechanismData } from "@/lib/live/useLiveMechanismData";
import { MechanismSelect } from "./MechanismSelect";
import { AnalysisDashboard } from "./AnalysisDashboard";

export function LiveAnalyzerPage() {
  const [mechanismId, setMechanismId] = useState("shooter_velocity");
  const mechanism = useMemo(() => getMechanismById(mechanismId), [mechanismId]);
  const live = useLiveMechanismData(mechanism);
  const analysis = useMemo(
    () => analyzeMechanismTrace(mechanism, live.trace),
    [mechanism, live.trace],
  );

  const sourceList = Object.entries(live.sourceMap)
    .map(([signal, topic]) => `${signal}: ${topic}`)
    .join(" | ");

  return (
    <div className="grid gap-4">
      <Alert className="border-border/70 bg-card/80">
        <Info className="size-4" />
        <AlertTitle>Passive live analysis</AlertTitle>
        <AlertDescription>
          Live mode only subscribes to existing NT4 topics published by AdvantageKit. It does not
          request tests or change robot state.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_auto]">
        <MechanismSelect
          mechanism={mechanism}
          onChange={setMechanismId}
          description="Choose the loop you want to observe. The analyzer will subscribe to the relevant telemetry topics and segment new runs automatically."
          actionLabel="Clear live buffer"
          onAction={live.clear}
        />
        <div className="flex items-center justify-end gap-2">
          <Badge variant={live.isConnected ? "secondary" : "outline"}>
            {live.isConnected ? "Receiving telemetry" : "Waiting for robot"}
          </Badge>
        </div>
      </div>

      <AnalysisDashboard
        analysis={analysis}
        trace={live.trace}
        sourceLabel={
          sourceList.length > 0
            ? `Live NT topics: ${sourceList}`
            : "Live NT topics will populate as soon as samples arrive."
        }
        emptyStateTitle="Waiting for live telemetry"
        emptyStateDescription="Once setpoint and measurement samples arrive for the selected mechanism, the analyzer will begin scoring runs."
        helperText="Treat live recommendations as a guide for what to verify in repeated runs. This view intentionally has no apply or command controls."
      />
    </div>
  );
}
