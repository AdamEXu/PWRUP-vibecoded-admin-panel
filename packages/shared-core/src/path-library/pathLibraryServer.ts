import path from "path";
import { promises as fs } from "fs";
import type { PathLibraryEntry } from "./pathLibrary";

const ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif", ".svg"] as const;
const ALLOWED_EXTENSION_SET = new Set<string>(ALLOWED_EXTENSIONS);

const DEFAULT_LIBRARY_DIR = "path-library";
const LEGACY_PUBLIC_LIBRARY_DIR = "public/path-overview";
const DEFAULT_AUTO_LIBRARY_DIRS = [
  "apps/comp/public/pathplanner/autos",
  "public/pathplanner/autos",
] as const;

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

export async function resolveAutoLibraryDirectory(): Promise<string | null> {
  for (const relativeDirectory of DEFAULT_AUTO_LIBRARY_DIRS) {
    const candidate = path.join(process.cwd(), relativeDirectory);
    if (await directoryExists(candidate)) {
      return candidate;
    }
  }
  return null;
}

async function listAutosDirectoryEntries(directory: string): Promise<PathLibraryEntry[]> {
  const rootEntries = await fs.readdir(directory, { withFileTypes: true });
  const files = rootEntries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((fileName) => path.extname(fileName).toLowerCase() === ".auto");

  const byAutoName = new Map<string, { name: string; fileName: string }>();
  for (const fileName of files) {
    const fileStem = path.parse(fileName).name.trim();
    if (!fileStem) continue;

    const normalizedNameKey = fileStem.toLowerCase();
    const existing = byAutoName.get(normalizedNameKey);
    if (!existing) {
      byAutoName.set(normalizedNameKey, { name: fileStem, fileName });
      continue;
    }

    if (fileName.localeCompare(existing.fileName, undefined, { sensitivity: "base" }) < 0) {
      byAutoName.set(normalizedNameKey, { name: fileStem, fileName });
    }
  }

  return Array.from(byAutoName.values())
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
    .map<PathLibraryEntry>((entry) => ({
      name: entry.name,
      fileName: entry.fileName,
      imageUrl: `/path-overview/animated/${encodeURIComponent(entry.name)}.gif`,
    }));
}

async function listImageDirectoryEntries(directory: string): Promise<PathLibraryEntry[]> {
  const rootEntries = await fs.readdir(directory, { withFileTypes: true });
  const rootFiles = rootEntries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((fileName) => ALLOWED_EXTENSION_SET.has(path.extname(fileName).toLowerCase()));
  const files = [...rootFiles];

  const animatedDirectory = path.join(directory, "animated");
  if (await directoryExists(animatedDirectory)) {
    const animatedEntries = await fs.readdir(animatedDirectory, { withFileTypes: true });
    const animatedFiles = animatedEntries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((fileName) => ALLOWED_EXTENSION_SET.has(path.extname(fileName).toLowerCase()));
    files.push(...animatedFiles);
  }

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

  return Array.from(byPathName.values())
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
    .map<PathLibraryEntry>((entry) => ({
      name: entry.name,
      fileName: entry.fileName,
      imageUrl: `/api/paths/library/image/${encodeURIComponent(entry.fileName)}`,
    }));
}

export async function listPathLibraryEntries(): Promise<{
  paths: PathLibraryEntry[];
  directoryLabel: string;
}> {
  const autosDirectory = await resolveAutoLibraryDirectory();
  if (autosDirectory) {
    return {
      paths: await listAutosDirectoryEntries(autosDirectory),
      directoryLabel: path.relative(process.cwd(), autosDirectory) || autosDirectory,
    };
  }

  const directory = await resolvePathLibraryDirectory();
  if (!directory) {
    return {
      paths: [],
      directoryLabel: process.env.BLITZ_PATH_LIBRARY_DIR?.trim() || DEFAULT_LIBRARY_DIR,
    };
  }

  return {
    paths: await listImageDirectoryEntries(directory),
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

  try {
    const fullPath = path.join(directory, safeFileName);
    const content = await fs.readFile(fullPath);
    return {
      content,
      contentType: extensionToContentType(extension),
    };
  } catch {
    try {
      const animatedPath = path.join(directory, "animated", safeFileName);
      const content = await fs.readFile(animatedPath);
      return {
        content,
        contentType: extensionToContentType(extension),
      };
    } catch {
      return null;
    }
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
