"use client";

import { useRef, useState } from "react";
import {
  Bot, Crosshair, Eye, ArrowUp, Navigation, Monitor, Users,
} from "lucide-react";
import { TABS } from "@/lib/tabs";
import type { TabId } from "@/lib/tabs";

type LucideIcon = React.ComponentType<{ size?: number; strokeWidth?: number }>;

const ICONS: Record<TabId, LucideIcon> = {
  overview:  Bot,
  intake:    Crosshair,
  vision:    Eye,
  climber:   ArrowUp,
  drive:     Navigation,
  dashboard: Monitor,
  team:      Users,
};

// Short labels that fit in the tab bar
const SHORT_LABELS: Record<TabId, string> = {
  overview:  "Overview",
  intake:    "Intake",
  vision:    "Vision",
  climber:   "Climber",
  drive:     "Drive",
  dashboard: "Dashboard",
  team:      "Team",
};

interface TabNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export function TabNav({ activeTab, onTabChange }: TabNavProps) {
  const [pressed, setPressed] = useState<TabId | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handlePress(id: TabId) {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPressed(id);
    timerRef.current = setTimeout(() => setPressed(null), 200);
    onTabChange(id);
  }

  return (
    <nav
      className="fixed left-0 right-0 z-30"
      style={{
        bottom: 0,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        background: "rgba(10,10,10,0.96)",
        borderTop: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div style={{ display: "flex" }}>
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          const isPressed = pressed === tab.id;
          const Icon = ICONS[tab.id];

          return (
            <button
              key={tab.id}
              onPointerDown={() => handlePress(tab.id)}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                padding: "12px 4px 10px",
                minHeight: 64,
                border: "none",
                background: "none",
                cursor: "pointer",
                transform: isPressed ? "scale(0.9)" : "scale(1)",
                transition: isPressed
                  ? "transform 60ms ease-out"
                  : "transform 220ms cubic-bezier(0.34,1.5,0.64,1)",
              }}
            >
              <Icon
                size={22}
                strokeWidth={isActive ? 2.2 : 1.6}
              />
              <span style={{
                fontFamily: "var(--f-inter)",
                fontSize: "0.6rem",
                fontWeight: isActive ? 600 : 400,
                letterSpacing: "0.01em",
                lineHeight: 1,
                color: isActive ? "var(--green)" : "var(--text-3)",
                transition: "color 180ms ease",
                whiteSpace: "nowrap",
              }}>
                {SHORT_LABELS[tab.id]}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
