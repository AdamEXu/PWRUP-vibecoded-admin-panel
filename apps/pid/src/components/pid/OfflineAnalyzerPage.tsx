"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FolderSearch, Info, RefreshCcw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@pwrup/shared-ui/alert";
import { Button } from "@pwrup/shared-ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@pwrup/shared-ui/card";
import { Input } from "@pwrup/shared-ui/input";
import { Label } from "@pwrup/shared-ui/label";
import { Badge } from "@pwrup/shared-ui/badge";
import { usePidAppSettings } from "@/lib/pid-settings";
import { getMechanismById } from "@/lib/analysis/mechanisms";
import type { MechanismAnalysis, NormalizedTrace } from "@/lib/analysis/types";
import { MechanismSelect } from "./MechanismSelect";
import { AnalysisDashboard } from "./AnalysisDashboard";

interface ReplayFileInfo {
  name: string;
  path: string;
  sizeBytes: number;
  modifiedIso: string;
}

interface OfflineAnalysisResponse {
  ok: true;
  analysis: MechanismAnalysis;
  trace: NormalizedTrace;
  resolvedKeys: Record<string, string>;
  ignoredCounts: Record<string, number>;
}

export function OfflineAnalyzerPage() {
  const { settings: appSettings, updateSettings } = usePidAppSettings();
  const [directory, setDirectory] = useState(appSettings.replayDirectory);
  const [files, setFiles] = useState<ReplayFileInfo[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [mechanismId, setMechanismId] = useState("shooter_velocity");
  const [analysis, setAnalysis] = useState<MechanismAnalysis | null>(null);
  const [trace, setTrace] = useState<NormalizedTrace>({
    setpoint: [],
    measurement: [],
    effort: [],
    feedforward: [],
    current: [],
    velocity: [],
  });
  const [resolvedKeys, setResolvedKeys] = useState<Record<string, string>>({});
  const [ignoredCounts, setIgnoredCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState("");
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [history, setHistory] = useState<Array<{ fileName: string; summary: string; score: number | null }>>([]);

  const mechanism = useMemo(() => getMechanismById(mechanismId), [mechanismId]);

  const loadFiles = useCallback(async (nextDirectory: string) => {
    setIsLoadingFiles(true);
    setError("");
    try {
      const response = await fetch("/api/offline/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ directory: nextDirectory }),
      });
      const payload = (await response.json()) as
        | { ok: true; files: ReplayFileInfo[] }
        | { ok: false; message: string };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.ok ? "Failed to load replay files." : payload.message);
      }

      setFiles(payload.files);
      if (payload.files.length > 0 && !selectedFile) {
        setSelectedFile(payload.files[0]!.path);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to load replay files.");
    } finally {
      setIsLoadingFiles(false);
    }
  }, [selectedFile]);

  useEffect(() => {
    void loadFiles(directory);
  }, [directory, loadFiles]);

  async function analyzeSelectedReplay() {
    if (!selectedFile) {
      setError("Select a replay file first.");
      return;
    }

    setIsAnalyzing(true);
    setError("");
    updateSettings({ replayDirectory: directory });
    try {
      const response = await fetch("/api/offline/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dbPath: selectedFile, mechanismId }),
      });
      const payload = (await response.json()) as
        | OfflineAnalysisResponse
        | { ok: false; message: string };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.ok ? "Failed to analyze replay." : payload.message);
      }

      setAnalysis(payload.analysis);
      setTrace(payload.trace);
      setResolvedKeys(payload.resolvedKeys);
      setIgnoredCounts(payload.ignoredCounts);
      const fileName = files.find((file) => file.path === selectedFile)?.name ?? selectedFile;
      setHistory((current) => [
        { fileName, summary: payload.analysis.summary, score: payload.analysis.overallScore },
        ...current.filter((entry) => entry.fileName !== fileName).slice(0, 4),
      ]);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to analyze replay.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <div className="grid gap-4">
      <Alert className="border-border/70 bg-card/80">
        <Info className="size-4" />
        <AlertTitle>Offline replay analysis</AlertTitle>
        <AlertDescription>
          The PID app reads local replay databases, extracts only the selected mechanism&apos;s
          telemetry, and analyzes it without modifying the file.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Replay Browser</CardTitle>
            <CardDescription>
              Point the analyzer at a folder of replay databases. The file list below updates from the
              local filesystem only.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-[1fr_auto]">
              <div className="space-y-2">
                <Label htmlFor="replay-directory-input">Replay directory</Label>
                <Input
                  id="replay-directory-input"
                  value={directory}
                  onChange={(event) => setDirectory(event.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  The analyzer searches this directory for local `.db` replay files.
                </p>
              </div>
              <div className="flex items-end gap-2">
                <Button variant="outline" onClick={() => void loadFiles(directory)} disabled={isLoadingFiles}>
                  <RefreshCcw className="size-4" />
                  Refresh
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-border/60 bg-background/50">
              <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-3 border-b border-border/60 px-4 py-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <div>Replay file</div>
                <div>Size</div>
                <div>Modified</div>
              </div>
              <div className="max-h-72 overflow-auto">
                {files.length > 0 ? (
                  files.map((file) => {
                    const isSelected = file.path === selectedFile;
                    return (
                      <button
                        key={file.path}
                        type="button"
                        onClick={() => setSelectedFile(file.path)}
                        className={`grid w-full grid-cols-[minmax(0,1fr)_auto_auto] gap-3 px-4 py-3 text-left text-sm transition-colors ${
                          isSelected ? "bg-accent/60" : "hover:bg-accent/30"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FolderSearch className="size-4 shrink-0 text-muted-foreground" />
                          <span className="truncate">{file.name}</span>
                        </div>
                        <span className="text-muted-foreground">
                          {(file.sizeBytes / 1024).toFixed(1)} KB
                        </span>
                        <span className="text-muted-foreground">
                          {new Date(file.modifiedIso).toLocaleString()}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div className="px-4 py-6 text-sm text-muted-foreground">
                    {isLoadingFiles ? "Loading replay files..." : "No `.db` replay files were found in this directory."}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <MechanismSelect
            mechanism={mechanism}
            onChange={setMechanismId}
            description="Pick the loop you want extracted from the selected replay. Only the relevant signals are decoded."
            actionLabel={isAnalyzing ? "Analyzing..." : "Analyze replay"}
            onAction={() => void analyzeSelectedReplay()}
          />

          <Card className="border-border/70">
            <CardHeader>
              <CardTitle>Session History</CardTitle>
              <CardDescription>
                Recently analyzed files are kept here so you can quickly compare summaries within the same session.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {history.length > 0 ? (
                history.map((entry) => (
                  <div key={entry.fileName} className="rounded-lg border border-border/60 bg-background/50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium">{entry.fileName}</div>
                      <Badge variant={entry.score === null ? "outline" : "secondary"}>
                        {entry.score === null ? "insufficient" : `${entry.score}/100`}
                      </Badge>
                    </div>
                    <p className="pt-2 text-sm text-muted-foreground">{entry.summary}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No offline analyses have been run in this session yet.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <Info className="size-4" />
          <AlertTitle>Replay analysis failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <AnalysisDashboard
        analysis={analysis}
        trace={trace}
        sourceLabel={
          Object.keys(resolvedKeys).length > 0
            ? `Resolved replay keys: ${Object.entries(resolvedKeys)
                .map(([signal, key]) => `${signal}: ${key}`)
                .join(" | ")}`
            : "Resolved replay keys will appear after analysis."
        }
        emptyStateTitle="Select a replay and run analysis"
        emptyStateDescription="Once a replay file and mechanism are selected, the analyzer will extract the relevant signals and build a scorecard."
        helperText={
          Object.values(ignoredCounts).some((count) => count > 0)
            ? `Some rows were ignored because they were not scalar numeric values: ${Object.entries(ignoredCounts)
                .filter(([, count]) => count > 0)
                .map(([signal, count]) => `${signal}=${count}`)
                .join(", ")}.`
            : "Only scalar numeric rows from the selected mechanism are used in the scorecard."
        }
      />
    </div>
  );
}
