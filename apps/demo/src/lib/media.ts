import type { TabId } from "./tabs";

export type MediaType = "image" | "video";

export interface MediaItem {
  tab: TabId;
  src: string;
  type: MediaType;
  caption: string;
}

/**
 * Media registry — populated by dropping files into
 * public/media/images/<tab>/ or public/media/videos/<tab>/.
 *
 * Add entries here after dropping in real media assets.
 * The paths are relative to /public/ (e.g. "/media/images/overview/robot.jpg").
 */
export const MEDIA_REGISTRY: MediaItem[] = [
  // PLACEHOLDER — add real entries after dropping in media files.
  // Example:
  // { tab: "overview",  src: "/media/images/overview/robot-full.jpg",  type: "image", caption: "Gurt on field" },
  // { tab: "intake",    src: "/media/images/intake/wrist-detail.jpg",  type: "image", caption: "Wrist mechanism" },
  // { tab: "vision",    src: "/media/images/vision/cameras.jpg",       type: "image", caption: "Vision camera array" },
];

export function getMediaForTab(tab: TabId): MediaItem[] {
  return MEDIA_REGISTRY.filter((m) => m.tab === tab);
}
