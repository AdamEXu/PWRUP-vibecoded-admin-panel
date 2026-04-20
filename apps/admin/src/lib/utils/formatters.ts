// src/lib/utils/formatters.ts - Purpose: basic human-readable value helpers
export const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const k = 1024;
  const units = ["B", "KB", "MB", "GB", "TB"] as const;
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(k)),
    units.length - 1
  );
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
};

export const formatPercentage = (value: number): string =>
  `${clamp(value, 0, 100).toFixed(1)}%`;

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);
