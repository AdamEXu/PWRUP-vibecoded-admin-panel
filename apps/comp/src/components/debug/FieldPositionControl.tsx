"use client";

import { useCallback, useRef, useState } from "react";
import { FIELD_WIDTH_M, FIELD_HEIGHT_M } from "@/lib/match/constants";

interface FieldPositionControlProps {
  poseX: number;
  poseY: number;
  heading: number;
  isRedAlliance: boolean;
  onPoseChange: (x: number, y: number) => void;
  onHeadingChange: (heading: number) => void;
  onAllianceChange: (isRed: boolean) => void;
  onApplyPreset: (preset: FieldPreset) => void;
}

export interface FieldPreset {
  label: string;
  poseX: number;
  poseY: number;
  heading: number;
  isRedAlliance: boolean;
  phase: number;
  enabled: boolean;
}

const FIELD_PRESETS: FieldPreset[] = [
  {
    label: "Blue Start (Left)",
    poseX: 1.5,
    poseY: 6.5,
    heading: 0,
    isRedAlliance: false,
    phase: 1,
    enabled: true,
  },
  {
    label: "Blue Start (Center)",
    poseX: 1.5,
    poseY: 4.1,
    heading: 0,
    isRedAlliance: false,
    phase: 1,
    enabled: true,
  },
  {
    label: "Blue Start (Right)",
    poseX: 1.5,
    poseY: 1.7,
    heading: 0,
    isRedAlliance: false,
    phase: 1,
    enabled: true,
  },
  {
    label: "Red Start (Left)",
    poseX: 15.0,
    poseY: 1.7,
    heading: Math.PI,
    isRedAlliance: true,
    phase: 1,
    enabled: true,
  },
  {
    label: "Red Start (Center)",
    poseX: 15.0,
    poseY: 4.1,
    heading: Math.PI,
    isRedAlliance: true,
    phase: 1,
    enabled: true,
  },
  {
    label: "Red Start (Right)",
    poseX: 15.0,
    poseY: 6.5,
    heading: Math.PI,
    isRedAlliance: true,
    phase: 1,
    enabled: true,
  },
  {
    label: "Blue Mid-Field",
    poseX: 5.8,
    poseY: 4.1,
    heading: 0.3,
    isRedAlliance: false,
    phase: 3,
    enabled: true,
  },
  {
    label: "Red Mid-Field",
    poseX: 10.7,
    poseY: 4.1,
    heading: Math.PI - 0.3,
    isRedAlliance: true,
    phase: 3,
    enabled: true,
  },
];

// Display dimensions for the 2D field
const FIELD_DISPLAY_W = 560;
const FIELD_DISPLAY_H = Math.round(FIELD_DISPLAY_W * (FIELD_HEIGHT_M / FIELD_WIDTH_M));
const ROBOT_RADIUS = 10;

export function FieldPositionControl({
  poseX,
  poseY,
  heading,
  isRedAlliance,
  onPoseChange,
  onHeadingChange,
  onAllianceChange,
  onApplyPreset,
}: FieldPositionControlProps) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Convert field meters to display px
  const mToPxX = (m: number) => (m / FIELD_WIDTH_M) * FIELD_DISPLAY_W;
  const mToPxY = (m: number) => (1 - m / FIELD_HEIGHT_M) * FIELD_DISPLAY_H; // flip Y

  const pxToM = useCallback((clientX: number, clientY: number): [number, number] => {
    const el = fieldRef.current;
    if (!el) return [poseX, poseY];
    const rect = el.getBoundingClientRect();
    const lx = clientX - rect.left;
    const ly = clientY - rect.top;
    const mx = Math.max(0, Math.min(FIELD_WIDTH_M, (lx / FIELD_DISPLAY_W) * FIELD_WIDTH_M));
    const my = Math.max(0, Math.min(FIELD_HEIGHT_M, (1 - ly / FIELD_DISPLAY_H) * FIELD_HEIGHT_M));
    return [Math.round(mx * 100) / 100, Math.round(my * 100) / 100];
  }, [poseX, poseY]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      setIsDragging(true);
      const [mx, my] = pxToM(e.clientX, e.clientY);
      onPoseChange(mx, my);
    },
    [pxToM, onPoseChange],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      const [mx, my] = pxToM(e.clientX, e.clientY);
      onPoseChange(mx, my);
    },
    [isDragging, pxToM, onPoseChange],
  );

  const onPointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const robotPxX = mToPxX(poseX);
  const robotPxY = mToPxY(poseY);

  // Arrow end for heading indicator
  const arrowLen = 20;
  const arrowEndX = robotPxX + arrowLen * Math.cos(-heading + Math.PI / 2);
  const arrowEndY = robotPxY - arrowLen * Math.sin(-heading + Math.PI / 2);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <p className="text-sm font-semibold">Field Position Control</p>
        <span className="text-[11px] text-zinc-400">
          Drag to move robot · Click to place
        </span>
      </div>

      {/* 2D Field */}
      <div
        ref={fieldRef}
        className="relative rounded border border-zinc-700 cursor-crosshair select-none touch-none"
        style={{
          width: FIELD_DISPLAY_W,
          height: FIELD_DISPLAY_H,
          background: "linear-gradient(90deg, #1a2a3a 0%, #1a2a3a 49.5%, #3a1a1a 50.5%, #3a1a1a 100%)",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* Center line */}
        <div
          className="absolute top-0 bottom-0"
          style={{ left: "50%", width: 1, backgroundColor: "rgba(255,255,255,0.15)" }}
        />
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((frac) => (
          <div
            key={`h-${frac}`}
            className="absolute left-0 right-0"
            style={{ top: `${frac * 100}%`, height: 1, backgroundColor: "rgba(255,255,255,0.06)" }}
          />
        ))}

        {/* Robot dot + heading arrow */}
        <svg
          className="absolute top-0 left-0 pointer-events-none"
          width={FIELD_DISPLAY_W}
          height={FIELD_DISPLAY_H}
        >
          {/* Heading arrow */}
          <line
            x1={robotPxX}
            y1={robotPxY}
            x2={arrowEndX}
            y2={arrowEndY}
            stroke={isRedAlliance ? "#ff4444" : "#4488ff"}
            strokeWidth={2.5}
          />
          {/* Robot circle */}
          <circle
            cx={robotPxX}
            cy={robotPxY}
            r={ROBOT_RADIUS}
            fill={isRedAlliance ? "#ff4444" : "#4488ff"}
            stroke="white"
            strokeWidth={2}
          />
        </svg>

        {/* Coordinates label */}
        <div className="absolute bottom-1 right-2 text-[10px] text-white/60 font-mono pointer-events-none">
          ({poseX.toFixed(2)}, {poseY.toFixed(2)}) @ {(heading * 180 / Math.PI).toFixed(0)}°
        </div>
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-400">Heading °</label>
          <input
            type="range"
            min={-180}
            max={180}
            step={1}
            value={Math.round(heading * 180 / Math.PI)}
            onChange={(e) => onHeadingChange(Number(e.target.value) * Math.PI / 180)}
            className="w-28 accent-[#70cd35]"
          />
          <span className="text-[11px] font-mono text-zinc-300 w-10">
            {(heading * 180 / Math.PI).toFixed(0)}°
          </span>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-400">Alliance</label>
          <button
            type="button"
            onClick={() => onAllianceChange(false)}
            className={`h-7 rounded px-2 text-[11px] border ${!isRedAlliance ? "border-blue-500 bg-blue-500/20 text-blue-400" : "border-zinc-600 text-zinc-400"}`}
          >
            Blue
          </button>
          <button
            type="button"
            onClick={() => onAllianceChange(true)}
            className={`h-7 rounded px-2 text-[11px] border ${isRedAlliance ? "border-red-500 bg-red-500/20 text-red-400" : "border-zinc-600 text-zinc-400"}`}
          >
            Red
          </button>
        </div>
      </div>

      {/* Presets */}
      <div className="flex flex-wrap gap-1.5">
        {FIELD_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => onApplyPreset(preset)}
            className={`h-7 rounded border px-2 text-[11px] ${
              preset.isRedAlliance
                ? "border-red-800 text-red-400 hover:bg-red-500/10"
                : "border-blue-800 text-blue-400 hover:bg-blue-500/10"
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export { FIELD_PRESETS };
