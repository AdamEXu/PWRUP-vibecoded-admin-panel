// src/components/dashboard/StatCard.tsx - Purpose: individual stat display card
import { Card, CardContent } from "@pwrup/shared-ui/card";

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  color?: "green" | "blue" | "yellow" | "purple" | "red";
}

export function StatCard({
  label,
  value,
  subtitle,
  icon,
  color = "green",
}: StatCardProps) {
  const colorClasses = {
    green: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    blue: "border-blue-500/30 bg-blue-500/10 text-blue-400",
    yellow: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
    purple: "border-purple-500/30 bg-purple-500/10 text-purple-400",
    red: "border-red-500/30 bg-red-500/10 text-red-400",
  };

  return (
    <Card
      className={`py-4 transition-all hover:scale-105 ${colorClasses[color]}`}
    >
      <CardContent className="p-0 px-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="text-xs text-gray-400 mb-1">{label}</div>
            <div className="text-2xl font-bold">{value}</div>
            {subtitle && (
              <div className="text-xs text-gray-500 mt-1">{subtitle}</div>
            )}
          </div>
          {icon && <div className="ml-2">{icon}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
