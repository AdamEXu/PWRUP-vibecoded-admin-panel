"use client";

import { useState } from "react";
import { DemoScene }      from "@/components/scene/DemoScene";
import { TabNav }         from "./TabNav";
import { ContentPanel }   from "./ContentPanel";
import { ResetCountdown } from "@/components/booth/ResetCountdown";
import { MediaFloat }     from "@/components/media/MediaFloat";
import { TouchHint }      from "@/components/ui/TouchHint";
import { useIdleReset }   from "@/lib/useIdleReset";
import type { TabId }     from "@/lib/tabs";

interface DemoShellProps {
  booth: boolean;
  onIdle?: () => void;
}

export function DemoShell({ booth, onIdle }: DemoShellProps) {
  const [activeTab, setActiveTab]       = useState<TabId>("overview");
  const [showCountdown, setShowCountdown] = useState(false);
  const [showOrbitHint, setShowOrbitHint] = useState(false);
  const [showReplay, setShowReplay]       = useState(false);
  const [resetKey, setResetKey]           = useState(0);

  useIdleReset(booth ? 30_000 : Infinity, () => {
    if (booth) setShowCountdown(true);
  });

  function handleTabChange(tab: TabId) {
    setActiveTab(tab);
    setShowReplay(false);
    setShowOrbitHint(false);
    // Orbit hint after 1.5s — only if not already shown this session
    setTimeout(() => setShowOrbitHint(true), 1500);
  }

  function handleReplay() {
    setShowReplay(false);
    setResetKey((k) => k + 1);
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-black">
      <DemoScene
        tab={activeTab}
        resetKey={resetKey}
        onOrbitStart={() => setShowOrbitHint(false)}
        onAnimationLoop={() => setShowReplay(true)}
      />

      <MediaFloat tab={activeTab} />

      {showOrbitHint && (
        <TouchHint type="orbit" onDismiss={() => setShowOrbitHint(false)} />
      )}

      <ContentPanel
        tab={activeTab}
        showReplayButton={showReplay}
        onReplay={handleReplay}
      />

      <TabNav activeTab={activeTab} onTabChange={handleTabChange} />

      {booth && showCountdown && (
        <ResetCountdown
          onComplete={() => { setShowCountdown(false); onIdle?.(); }}
          onDismiss={() => setShowCountdown(false)}
        />
      )}
    </div>
  );
}
