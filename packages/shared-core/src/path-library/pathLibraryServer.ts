import path from "path";
import { promises as fs } from "fs";
import type { PathLibraryEntry } from "./pathLibrary";

const ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif", ".svg"] as const;
const ALLOWED_EXTENSION_SET = new Set<string>(ALLOWED_EXTENSIONS);

const DEFAULT_LIBRARY_DIR = "path-library";
const LEGACY_PUBLIC_LIBRARY_DIR = "public/path-overview";

function extensionPriority(fileName: string): number {
  const extension = path.extname(fileName).toLowerCase();
  const index = ALLOWED_EXTENSIONS.indexOf(extension as (typeof ALLOWED_EXTENSIONS)[number]);
  return index >= 0 ? index : Number.MAX_SAFE_INTEGER;
}

async function directoryExists(targetDir: string): Promise<boolean> {
  try {
    const stat = await fs.stat(targetDir);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

function normalizeConfiguredPath(configuredPath: string): string {
  return path.isAbsolute(configuredPath)
    ? configuredPath
    : path.join(process.cwd(), configuredPath);
}

export async function resolvePathLibraryDirectory(): Promise<string | null> {
  const configuredPath = process.env.BLITZ_PATH_LIBRARY_DIR?.trim();
  if (configuredPath) {
    const normalized = normalizeConfiguredPath(configuredPath);
    if (await directoryExists(normalized)) {
      return normalized;
    }
    return null;
  }

  const defaultDirectory = path.join(process.cwd(), DEFAULT_LIBRARY_DIR);
  if (await directoryExists(defaultDirectory)) {
    return defaultDirectory;
  }

  const legacyDirectory = path.join(process.cwd(), LEGACY_PUBLIC_LIBRARY_DIR);
  if (await directoryExists(legacyDirectory)) {
    return legacyDirectory;
  }

  return null;
}

export async function listPathLibraryEntries(): Promise<{
  paths: PathLibraryEntry[];
  directoryLabel: string;
}> {
  const directory = await resolvePathLibraryDirectory();
  if (!directory) {
    return {
      paths: [],
      directoryLabel: process.env.BLITZ_PATH_LIBRARY_DIR?.trim() || DEFAULT_LIBRARY_DIR,
    };
  }

  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((fileName) => ALLOWED_EXTENSION_SET.has(path.extname(fileName).toLowerCase()));

  const byPathName = new Map<string, { name: string; fileName: string }>();
  for (const fileName of files) {
    const fileStem = path.parse(fileName).name.trim();
    if (!fileStem) continue;

    const normalizedNameKey = fileStem.toLowerCase();
    const existing = byPathName.get(normalizedNameKey);
    if (!existing) {
      byPathName.set(normalizedNameKey, { name: fileStem, fileName });
      continue;
    }

    if (extensionPriority(fileName) < extensionPriority(existing.fileName)) {
      byPathName.set(normalizedNameKey, { name: fileStem, fileName });
    }
  }

  const paths = Array.from(byPathName.values())
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
    .map<PathLibraryEntry>((entry) => ({
      name: entry.name,
      fileName: entry.fileName,
      imageUrl: `/api/paths/library/image/${encodeURIComponent(entry.fileName)}`,
    }));

  return {
    paths,
    directoryLabel: path.relative(process.cwd(), directory) || directory,
  };
}

export async function readPathLibraryImage(fileName: string): Promise<{
  content: Buffer;
  contentType: string;
} | null> {
  if (!fileName || fileName.includes("/") || fileName.includes("\\")) {
    return null;
  }

  const safeFileName = path.basename(fileName);
  const extension = path.extname(safeFileName).toLowerCase();
  if (!ALLOWED_EXTENSION_SET.has(extension)) {
    return null;
  }

  const directory = await resolvePathLibraryDirectory();
  if (!directory) return null;

  const fullPath = path.join(directory, safeFileName);
  try {
    const content = await fs.readFile(fullPath);
    return {
      content,
      contentType: extensionToContentType(extension),
    };
  } catch {
    return null;
  }
}

function extensionToContentType(extension: string): string {
  switch (extension) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".avif":
      return "image/avif";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}
