import { StatCard } from "@/components/ui/StatCard";
import { GurtTitle } from "@/components/ui/GurtTitle";

export function OverviewTab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <GurtTitle size="large" />
        <span style={{
          display: "block",
          marginTop: 6,
          fontFamily: "var(--f-brand)",
          fontSize: "0.72rem",
          letterSpacing: "0.25em",
          color: "rgba(112,205,53,0.7)",
        }}>
          TEAM 4765 · FRC 2026
        </span>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <StatCard value="360°" label="Turret range"   delay={0} />
        <StatCard value="4"    label="Vision cameras" delay={50} />
        <StatCard value="L1"   label="Climb level"    delay={100} />
      </div>

      <p style={{
        fontFamily: "var(--f-inter)",
        fontSize: "0.95rem",
        lineHeight: 1.65,
        color: "var(--text-2)",
      }}>
        Built to shoot while moving. The turret auto-aims independently of the drivetrain — we never have to stop to score.
      </p>
    </div>
  );
}
