// src/components/dashboard/ProgressStatCard.tsx - Purpose: stat card with progress bar
import { Card, CardContent } from "@pwrup/shared-ui/card";
import { ProgressBar } from "@pwrup/shared-ui/ProgressBar";

interface ProgressStatCardProps {
  label: string;
  value: number;
  color?: "green" | "blue" | "yellow" | "purple" | "red";
  format?: (value: number) => string;
}

export function ProgressStatCard({
  label,
  value,
  color = "green",
  format = (v) => `${v.toFixed(1)}%`,
}: ProgressStatCardProps) {
  const colorClasses = {
    green: "border-emerald-500/30 bg-emerald-500/10",
    blue: "border-blue-500/30 bg-blue-500/10",
    yellow: "border-yellow-500/30 bg-yellow-500/10",
    purple: "border-purple-500/30 bg-purple-500/10",
    red: "border-red-500/30 bg-red-500/10",
  };

  const textColors = {
    green: "text-emerald-400",
    blue: "text-blue-400",
    yellow: "text-yellow-400",
    purple: "text-purple-400",
    red: "text-red-400",
  };

  return (
    <Card
      className={`py-4 transition-all hover:scale-105 ${colorClasses[color]}`}
    >
      <CardContent className="p-0 px-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-gray-400">{label}</div>
          <div className={`text-sm font-bold font-mono ${textColors[color]}`}>
            {format(value)}
          </div>
        </div>
        <ProgressBar value={value} color={color} />
      </CardContent>
    </Card>
  );
}
