"use client";

import { useCallback, useEffect, useState } from "react";
import type { PathLibraryEntry, PathLibraryResponse } from "../path-library/pathLibrary";

interface UsePathLibraryState {
  paths: PathLibraryEntry[];
  isLoading: boolean;
  error: string | null;
  directoryLabel: string;
  reload: () => Promise<void>;
}

export function usePathLibrary(): UsePathLibraryState {
  const [paths, setPaths] = useState<PathLibraryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [directoryLabel, setDirectoryLabel] = useState("path-library");

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/paths/library", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to load path library (${response.status})`);
      }
      const payload = (await response.json()) as PathLibraryResponse & { error?: string };
      setPaths(Array.isArray(payload.paths) ? payload.paths : []);
      setDirectoryLabel(typeof payload.directoryLabel === "string" ? payload.directoryLabel : "path-library");
      if (!payload.ok && payload.error) {
        setError(payload.error);
      }
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : "Failed to load path library.";
      setPaths([]);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    paths,
    isLoading,
    error,
    directoryLabel,
    reload: load,
  };
}
