// src/components/ui/ProgressBar.tsx - Purpose: compact percentage progress bar (expects 0-100)

interface ProgressBarProps {
  value: number;
  className?: string;
  color?: "blue" | "green" | "yellow" | "red" | "purple";
}

export function ProgressBar({
  value,
  className = "",
  color = "blue",
}: ProgressBarProps) {
  const colorClasses = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    purple: "bg-purple-500",
    red: "bg-red-500",
  } as const;

  const clampedPercentage = Math.min(Math.max(value, 0), 100);

  return (
    <div className={`w-full bg-gray-700 rounded-full h-2 ${className}`}>
      <div
        className={`${colorClasses[color]} h-2 rounded-full transition-all duration-300`}
        style={{ width: `${clampedPercentage}%` }}
      />
    </div>
  );
}
