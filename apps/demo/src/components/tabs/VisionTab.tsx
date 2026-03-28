import { StatCard } from "@/components/ui/StatCard";

export function VisionTab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <StatCard value="4"      label="Cameras"           delay={0} />
        <StatCard value="Kalman" label="Fusion filter"     delay={50} />
        <StatCard value="<1 cm"  label="Position accuracy" delay={100} />
      </div>

      <p style={{
        fontFamily: "var(--f-inter)",
        fontSize: "0.95rem",
        lineHeight: 1.65,
        color: "var(--text-2)",
      }}>
        Four cameras feed a custom vision pipeline on a Raspberry Pi. A Rust + Python system fuses their output using a Kalman filter for continuous global position.
      </p>
      <p style={{
        fontFamily: "var(--f-inter)",
        fontSize: "0.95rem",
        lineHeight: 1.65,
        color: "var(--text-2)",
      }}>
        The whole stack runs in Docker — we deploy by flashing an image, not by hand-configuring.
      </p>
    </div>
  );
}
