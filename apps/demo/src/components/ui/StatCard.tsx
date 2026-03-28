interface StatCardProps {
  value: string;
  label: string;
  delay?: number;
}

export function StatCard({ value, label, delay = 0 }: StatCardProps) {
  return (
    <div
      className="animate-stat-in"
      style={{
        animationDelay: `${delay}ms`,
        flex: 1,
        minWidth: 0,
        padding: "14px 14px 12px",
        background: "var(--card)",
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        gap: 5,
      }}
    >
      <span style={{
        fontFamily: "var(--f-mono)",
        fontSize: "clamp(1.5rem, 4.5vw, 2rem)",
        fontWeight: 500,
        lineHeight: 1,
        color: "var(--text-1)",
        letterSpacing: "-0.025em",
      }}>
        {value}
      </span>
      <span style={{
        fontFamily: "var(--f-inter)",
        fontSize: "0.75rem",
        fontWeight: 400,
        lineHeight: 1.3,
        color: "var(--text-2)",
      }}>
        {label}
      </span>
    </div>
  );
}
