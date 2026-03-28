export type TabId =
  | "overview"
  | "intake"
  | "vision"
  | "climber"
  | "drive"
  | "dashboard"
  | "team";

export interface TabDef {
  id: TabId;
  label: string;
  /** Lucide icon name */
  icon: string;
  /** Key into CAMERA_SETPOINTS */
  cameraKey: string;
  /** Key into useTabAnimation */
  animationId: string;
  /** Subdirectory under /public/media/images/ and /videos/ */
  mediaDir: string;
}

export const TABS: TabDef[] = [
  {
    id: "overview",
    label: "Overview",
    icon: "Bot",
    cameraKey: "overview",
    animationId: "overview",
    mediaDir: "overview",
  },
  {
    id: "intake",
    label: "Intake + Shooter",
    icon: "Crosshair",
    cameraKey: "intake",
    animationId: "intake",
    mediaDir: "intake",
  },
  {
    id: "vision",
    label: "Vision",
    icon: "Eye",
    cameraKey: "vision",
    animationId: "vision",
    mediaDir: "vision",
  },
  {
    id: "climber",
    label: "Climber",
    icon: "ArrowUp",
    cameraKey: "climber",
    animationId: "climber",
    mediaDir: "climber",
  },
  {
    id: "drive",
    label: "Drive",
    icon: "Navigation",
    cameraKey: "drive",
    animationId: "drive",
    mediaDir: "drive",
  },
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "Monitor",
    cameraKey: "dashboard",
    animationId: "dashboard",
    mediaDir: "dashboard",
  },
  {
    id: "team",
    label: "Team",
    icon: "Users",
    cameraKey: "overview",
    animationId: "team",
    mediaDir: "team",
  },
];
