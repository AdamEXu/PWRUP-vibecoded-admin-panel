import { StatCard } from "@/components/ui/StatCard";

export function IntakeShooterTab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <StatCard value="Ground" label="Intake height"  delay={0} />
        <StatCard value="360°"   label="Turret travel"  delay={50} />
        <StatCard value="Moving" label="Shoot mode"     delay={100} />
      </div>

      <p style={{
        fontFamily: "var(--f-inter)",
        fontSize: "0.95rem",
        lineHeight: 1.65,
        color: "var(--text-2)",
      }}>
        The wrist lowers to pick up game pieces off the ground. An indexer feeds them directly to the shooter.
      </p>
      <p style={{
        fontFamily: "var(--f-inter)",
        fontSize: "0.95rem",
        lineHeight: 1.65,
        color: "var(--text-2)",
      }}>
        The turret uses our global position estimate to aim — it rotates independently while we drive, so we can score at full speed from anywhere on the field.
      </p>
    </div>
  );
}
