"use client";

import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardAction,
} from "@pwrup/shared-ui/card";
import { Button } from "@pwrup/shared-ui/button";
import { Badge } from "@pwrup/shared-ui/badge";
import { Textarea } from "@pwrup/shared-ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
} from "@pwrup/shared-ui/collapsible";
import { PingChartModal } from "./PingChartModal";

export interface PingDataPoint {
  time: string;
  ping: number;
  timestamp: number;
}

export interface HostStatus {
  systemInfo: string;
  activeProcesses: string[];
  possibleProcesses: string[];
  configSet: boolean;
  ping?: number | null;
  loading?: boolean;
  error?: string | null;
}

interface HostCardProps {
  hostUrl: string;
  status: HostStatus;
  pingHistory: PingDataPoint[];
  onRefresh: () => void;
  onStartProcess: (processes: string[]) => void;
  onStopProcess: (processes: string[]) => void;
  onSetConfig: (config: string) => void;
  onSetProcesses: (processes: string[]) => void;
  onRollbackConfig: () => void;
  canRollbackConfig: boolean;
  onRemove: () => void;
}

export function HostCard({
  hostUrl,
  status,
  pingHistory,
  onRefresh,
  onStartProcess,
  onStopProcess,
  onSetConfig,
  onSetProcesses,
  onRollbackConfig,
  canRollbackConfig,
  onRemove,
}: HostCardProps) {
  const activeSet = new Set(status.activeProcesses || []);
  const allProcesses = status.possibleProcesses || [];
  const [showConfig, setShowConfig] = React.useState(false);
  const [configInput, setConfigInput] = React.useState("");
  const [showPingChart, setShowPingChart] = React.useState(false);
  const [showSetProcesses, setShowSetProcesses] = React.useState(false);
  const [selectedProcesses, setSelectedProcesses] = React.useState<Set<string>>(
    new Set()
  );

  React.useEffect(() => {
    if (!showPingChart) return;

    const interval = setInterval(() => {
      onRefresh();
    }, 1000);

    return () => clearInterval(interval);
  }, [showPingChart, onRefresh]);

  async function handleSetConfig() {
    if (!configInput.trim()) return;
    const configValue = configInput.trim();
    setConfigInput("");
    await onSetConfig(configValue);
  }

  async function handleSetProcesses() {
    if (selectedProcesses.size === 0) return;
    const processesArray = Array.from(selectedProcesses);
    setSelectedProcesses(new Set());
    await onSetProcesses(processesArray);
  }

  function toggleProcessSelection(process: string) {
    setSelectedProcesses((prev) => {
      const next = new Set(prev);
      if (next.has(process)) {
        next.delete(process);
      } else {
        next.add(process);
      }
      return next;
    });
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 flex-wrap">
          <span className="font-mono text-sm">{hostUrl}</span>
          <span className="text-muted-foreground">•</span>
          <span className="text-sm text-muted-foreground font-normal">
            {status.systemInfo || "—"}
          </span>
          {status.ping !== null && status.ping !== undefined && (
            <>
              <span className="text-muted-foreground">•</span>
              <Button
                variant="link"
                size="xs"
                className="p-0 h-auto"
                onClick={() => setShowPingChart(true)}
              >
                {status.ping}ms
              </Button>
            </>
          )}
          {status.configSet ? (
            <Badge className="bg-emerald-900/30 text-emerald-400 border-emerald-700/50">
              Config Set
            </Badge>
          ) : (
            <Badge variant="destructive" className="bg-red-900/30 text-red-400 border-red-700/50">
              Config Not Updated
            </Badge>
          )}
          {status.loading && (
            <span className="text-sm text-muted-foreground animate-pulse">
              Loading...
            </span>
          )}
        </CardTitle>
        <CardAction className="flex items-center gap-2">
          <Button variant="ghost" size="xs" onClick={onRefresh}>
            Refresh
          </Button>
          <Button variant="ghost" size="xs" className="text-destructive hover:text-destructive" onClick={onRemove}>
            Remove
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-4">
        {status.error && (
          <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 p-3 rounded-lg">
            {status.error}
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setShowConfig(!showConfig)}
          >
            {showConfig ? "Hide" : "Set"} Config
          </Button>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => {
              setShowSetProcesses(!showSetProcesses);
              if (!showSetProcesses) {
                setSelectedProcesses(new Set());
              }
            }}
          >
            {showSetProcesses ? "Hide" : "Set"} Processes
          </Button>
        </div>

        <Collapsible open={showConfig} onOpenChange={setShowConfig}>
          <CollapsibleContent className="space-y-3 p-4 bg-muted/50 rounded-lg border">
            <div className="text-xs text-muted-foreground">
              Base64 Config String
            </div>
            <Textarea
              value={configInput}
              onChange={(e) => setConfigInput(e.target.value)}
              placeholder="Paste base64 config string here..."
              className="font-mono"
              rows={3}
            />
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleSetConfig}
                disabled={!configInput.trim() || status.loading}
              >
                Set Config
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onRollbackConfig}
                disabled={!canRollbackConfig || status.loading}
              >
                Use Previous Config
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Collapsible open={showSetProcesses} onOpenChange={setShowSetProcesses}>
          <CollapsibleContent className="space-y-3 p-4 bg-muted/50 rounded-lg border">
            <div className="text-xs text-muted-foreground">
              Select processes to set (multiple selection)
            </div>
            {allProcesses.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                No processes available
              </div>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {allProcesses.map((process) => {
                  const isSelected = selectedProcesses.has(process);
                  return (
                    <button
                      key={process}
                      type="button"
                      onClick={() => toggleProcessSelection(process)}
                      className={`cursor-pointer w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                        isSelected
                          ? "bg-emerald-900/30 border-emerald-700/50 text-emerald-400"
                          : "bg-background border-border hover:border-muted-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-4 h-4 rounded border flex items-center justify-center ${
                            isSelected
                              ? "bg-emerald-600 border-emerald-500"
                              : "border-muted-foreground"
                          }`}
                        >
                          {isSelected && (
                            <span className="text-xs text-white">✓</span>
                          )}
                        </span>
                        <span className="font-mono text-sm">{process}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            <Button
              size="sm"
              onClick={handleSetProcesses}
              disabled={selectedProcesses.size === 0 || status.loading}
            >
              Set{" "}
              {selectedProcesses.size > 0 ? `${selectedProcesses.size} ` : ""}
              Process{selectedProcesses.size !== 1 ? "es" : ""}
            </Button>
          </CollapsibleContent>
        </Collapsible>

        {allProcesses.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-6">
            No processes available
          </div>
        ) : (
          <div className="space-y-1">
            {allProcesses.map((process) => {
              const isActive = activeSet.has(process);
              return (
                <div
                  key={process}
                  className="flex items-center justify-between px-3 py-2 bg-muted/50 rounded-lg border hover:border-muted-foreground transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="font-mono text-sm truncate">{process}</span>
                    {isActive && (
                      <Badge className="bg-emerald-900/30 text-emerald-400 border-emerald-700/50">
                        Running
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant={isActive ? "destructive" : "default"}
                    size="xs"
                    onClick={() =>
                      isActive
                        ? onStopProcess([process])
                        : onStartProcess([process])
                    }
                    disabled={status.loading}
                  >
                    {isActive ? "Stop" : "Start"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <PingChartModal
        isOpen={showPingChart}
        onClose={() => setShowPingChart(false)}
        hostUrl={hostUrl}
        pingHistory={pingHistory}
      />
    </Card>
  );
}
