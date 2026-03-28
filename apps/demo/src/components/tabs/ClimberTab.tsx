import { StatCard } from "@/components/ui/StatCard";

export function ClimberTab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <StatCard value="L1"      label="Climb level"     delay={0} />
        <StatCard value="2-stage" label="Elevator design"  delay={50} />
        <StatCard value="Auto"    label="Trigger mode"    delay={100} />
      </div>

      <p style={{
        fontFamily: "var(--f-inter)",
        fontSize: "0.95rem",
        lineHeight: 1.65,
        color: "var(--text-2)",
      }}>
        A two-stage elevator extends and hooks autonomously or on driver command. The hook engages automatically — no manual alignment needed.
      </p>
    </div>
  );
}
