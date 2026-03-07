"use client";

import type { MatchState } from "./types";
import { useLiveMatchHudState } from "./useLiveMatchHudState";

export function useMatchState(): MatchState {
  return useLiveMatchHudState();
}
