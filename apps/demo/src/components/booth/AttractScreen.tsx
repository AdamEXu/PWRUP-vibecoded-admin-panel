"use client";

import { useEffect, useRef, useState } from "react";
import { GurtTitle } from "@/components/ui/GurtTitle";
import { QRCodeSVG } from "qrcode.react";

interface AttractScreenProps {
  onBegin: () => void;
}

export function AttractScreen({ onBegin }: AttractScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [qrUrl, setQrUrl]   = useState("");
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    setQrUrl(typeof window !== "undefined" ? window.location.origin : "");
    videoRef.current?.play().catch(() => {});
  }, []);

  function handleTap() {
    if (leaving) return;
    setLeaving(true);
    setTimeout(onBegin, 300);
  }

  return (
    <div
      className="fixed inset-0 z-50"
      style={{
        opacity: leaving ? 0 : 1,
        transition: "opacity 300ms ease",
      }}
      onPointerDown={handleTap}
    >
      {/* Video */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        src="/booth-attract.mp4"
        loop muted playsInline
        style={{ opacity: 0.22, filter: "brightness(0.6) saturate(0.5)" }}
      />

      {/* Gradient overlay — heavier at bottom so text reads */}
      <div className="absolute inset-0" style={{
        background: "linear-gradient(160deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.4) 45%, rgba(0,0,0,0.85) 100%)",
      }} />

      {/* Subtle grain */}
      <div className="absolute inset-0 grain-overlay" style={{ opacity: 0.35 }} />

      {/* Main content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ gap: "clamp(12px, 3vw, 28px)" }}
      >
        <div className="animate-scale-up" style={{ animationDelay: "0ms", textAlign: "center" }}>
          <GurtTitle size="hero" />
        </div>

        <div className="animate-fade-up" style={{ animationDelay: "200ms", textAlign: "center" }}>
          <span style={{
            display: "block",
            fontFamily: "var(--f-brand)",
            fontSize: "clamp(0.8rem, 2.2vw, 1.1rem)",
            letterSpacing: "0.28em",
            color: "rgba(112,205,53,0.8)",
            marginBottom: 4,
          }}>
            TEAM 4765
          </span>
          <span style={{
            display: "block",
            fontFamily: "var(--f-inter)",
            fontSize: "clamp(0.85rem, 2vw, 1rem)",
            color: "rgba(255,255,255,0.4)",
            letterSpacing: "0.03em",
          }}>
            Pinewood Robotics · FRC 2026
          </span>
        </div>

        <div className="animate-fade-up animate-blink" style={{ animationDelay: "500ms" }}>
          <span style={{
            fontFamily: "var(--f-inter)",
            fontSize: "0.85rem",
            letterSpacing: "0.15em",
            color: "rgba(112,205,53,0.7)",
            textTransform: "uppercase",
          }}>
            Tap anywhere to begin
          </span>
        </div>
      </div>

      {/* QR — bottom right, unobtrusive */}
      {qrUrl && (
        <div style={{
          position: "absolute",
          bottom: 28,
          right: 28,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 8,
          opacity: 0.6,
          pointerEvents: "none",
        }}>
          <span style={{
            fontFamily: "var(--f-inter)",
            fontSize: "0.65rem",
            color: "var(--text-3)",
          }}>
            Take this home
          </span>
          <div style={{
            padding: 8,
            background: "#0d0d0d",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.08)",
          }}>
            <QRCodeSVG
              value={qrUrl}
              size={68}
              bgColor="transparent"
              fgColor="rgba(255,255,255,0.7)"
              level="M"
            />
          </div>
        </div>
      )}
    </div>
  );
}
