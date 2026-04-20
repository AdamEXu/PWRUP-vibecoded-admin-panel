// src/lib/paths.ts - Purpose: known path options for SelectedPath (proto util/other.proto).

export const KNOWN_PATHS = [
  "Ball Shooter Left",
  "Ball Shooter Right",
  "Climber Left",
  "Climber Middle",
  "Climber Right Middle",
] as const;

export type KnownPathName = (typeof KNOWN_PATHS)[number];
