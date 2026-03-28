"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bot, Crosshair, Eye, ArrowUp, Navigation, Monitor, Users, ChevronUp,
} from "lucide-react";
import type { TabId } from "@/lib/tabs";
import { OverviewTab }      from "@/components/tabs/OverviewTab";
import { IntakeShooterTab } from "@/components/tabs/IntakeShooterTab";
import { VisionTab }        from "@/components/tabs/VisionTab";
import { ClimberTab }       from "@/components/tabs/ClimberTab";
import { DriveTab }         from "@/components/tabs/DriveTab";
import { DashboardTab }     from "@/components/tabs/DashboardTab";
import { TeamTab }          from "@/components/tabs/TeamTab";

type LucideIcon = React.ComponentType<{ size?: number; strokeWidth?: number; color?: string }>;

const TAB_META: Record<TabId, { label: string; Icon: LucideIcon }> = {
  overview:  { label: "Overview",         Icon: Bot },
  intake:    { label: "Intake + Shooter",  Icon: Crosshair },
  vision:    { label: "Vision",            Icon: Eye },
  climber:   { label: "Climber",           Icon: ArrowUp },
  drive:     { label: "Drive",             Icon: Navigation },
  dashboard: { label: "Dashboard",         Icon: Monitor },
  team:      { label: "Team",              Icon: Users },
};

const COLLAPSED = 0.36;
const EXPANDED  = 0.66;
const TAB_NAV_H = 80; // approximate tab nav height + safe area

function TabContent({ tab }: { tab: TabId }) {
  switch (tab) {
    case "overview":  return <OverviewTab />;
    case "intake":    return <IntakeShooterTab />;
    case "vision":    return <VisionTab />;
    case "climber":   return <ClimberTab />;
    case "drive":     return <DriveTab />;
    case "dashboard": return <DashboardTab />;
    case "team":      return <TeamTab />;
  }
}

interface ContentPanelProps {
  tab: TabId;
  showReplayButton?: boolean;
  onReplay?: () => void;
}

export function ContentPanel({ tab, showReplayButton, onReplay }: ContentPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [contentKey, setContentKey] = useState(0);

  const prevTabRef = useRef(tab);
  useEffect(() => {
    if (prevTabRef.current !== tab) {
      prevTabRef.current = tab;
      setExpanded(false);
      setContentKey((k) => k + 1);
    }
  }, [tab]);

  // Drag state
  const dragging      = useRef(false);
  const startY        = useRef(0);
  const startExpanded = useRef(false);
  const [dragDelta, setDragDelta] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  function onDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current      = true;
    startY.current        = e.clientY;
    startExpanded.current = expanded;
    setIsDragging(true);
    setDragDelta(0);
  }
  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    setDragDelta(startY.current - e.clientY); // positive = drag up
  }
  function onUp() {
    if (!dragging.current) return;
    dragging.current = false;
    setIsDragging(false);
    if (dragDelta >  40) setExpanded(true);
    if (dragDelta < -40) setExpanded(false);
    setDragDelta(0);
  }

  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const baseH  = (expanded ? EXPANDED : COLLAPSED) * vh;
  const liveH  = isDragging
    ? Math.max(COLLAPSED * vh, Math.min(EXPANDED * vh, baseH + dragDelta))
    : baseH;

  const { label, Icon } = TAB_META[tab];

  return (
    <div
      className="fixed left-0 right-0 bottom-0 z-20 flex flex-col"
      style={{
        height: liveH,
        transition: isDragging ? "none" : "height 340ms cubic-bezier(0.4,0,0.2,1)",
        background: "var(--bg)",
        borderRadius: "18px 18px 0 0",
        borderTop: "1px solid var(--line)",
      }}
    >
      {/* ── Handle + header ── */}
      <div
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        style={{
          flexShrink: 0,
          padding: "12px 20px 14px",
          cursor: "ns-resize",
          touchAction: "none",
        }}
      >
        {/* Drag pill */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
          <div style={{
            width: 36, height: 4,
            borderRadius: 99,
            background: "rgba(255,255,255,0.18)",
          }} />
        </div>

        {/* Title row */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Icon
            size={17}
            strokeWidth={2}
            color={expanded ? "var(--green)" : "var(--text-2)"}
          />
          <span style={{
            fontFamily: "var(--f-inter)",
            fontSize: "1.05rem",
            fontWeight: 600,
            color: "var(--text-1)",
            lineHeight: 1,
          }}>
            {label}
          </span>
          {!expanded && (
            <span className="animate-chevron" style={{
              marginLeft: "auto",
              color: "var(--text-3)",
              lineHeight: 0,
            }}>
              <ChevronUp size={16} strokeWidth={2} />
            </span>
          )}
        </div>
      </div>

      {/* Thin separator */}
      <div style={{ flexShrink: 0, height: 1, background: "var(--line)", marginInline: 20 }} />

      {/* ── Scrollable content ── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: `16px 20px ${TAB_NAV_H + 16}px`,
        }}
      >
        <div key={contentKey} className="animate-content-in">
          <TabContent tab={tab} />
        </div>
      </div>

      {showReplayButton && (
        <button
          onPointerDown={onReplay}
          style={{
            position: "absolute",
            bottom: TAB_NAV_H + 12,
            right: 16,
            padding: "9px 18px",
            fontFamily: "var(--f-inter)",
            fontSize: "0.8rem",
            fontWeight: 600,
            color: "var(--green)",
            background: "rgba(112,205,53,0.1)",
            border: "1px solid rgba(112,205,53,0.25)",
            borderRadius: 10,
            cursor: "pointer",
          }}
        >
          Replay
        </button>
      )}
    </div>
  );
}
