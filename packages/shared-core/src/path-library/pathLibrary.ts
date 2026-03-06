export interface PathLibraryEntry {
  name: string;
  fileName: string;
  imageUrl: string;
}

export interface PathLibraryResponse {
  ok: boolean;
  directoryLabel: string;
  paths: PathLibraryEntry[];
}

export function findMatchingPathName(
  candidate: string | null,
  paths: PathLibraryEntry[],
): string | null {
  if (!candidate) return null;
  const trimmed = candidate.trim();
  if (!trimmed) return null;

  const direct = paths.find((entry) => entry.name === trimmed);
  if (direct) return direct.name;

  const lowered = trimmed.toLowerCase();
  return paths.find((entry) => entry.name.toLowerCase() === lowered)?.name ?? null;
}
