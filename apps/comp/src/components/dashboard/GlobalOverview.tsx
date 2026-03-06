// src/components/dashboard/GlobalOverview.tsx - Purpose: summarize global stats succinctly
import { GlobalStats } from "@/lib/hooks/useMultiPiDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@pwrup/shared-ui/card";
import { formatPercentage, formatBytes } from "@/lib/utils/formatters";

interface GlobalOverviewProps {
  stats: GlobalStats;
}

export function GlobalOverview({ stats }: GlobalOverviewProps) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">System Overview</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Systems
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.activePis}/{stats.totalPis}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.totalPis > 0
                ? Math.round((stats.activePis / stats.totalPis) * 100)
                : 0}
              % online
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average CPU Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercentage(stats.avgCpuUsage)}
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-secondary">
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{ width: `${Math.min(stats.avgCpuUsage, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Memory Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercentage(stats.avgMemoryUsage)}
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-secondary">
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{ width: `${Math.min(stats.avgMemoryUsage, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Network Traffic
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatBytes(stats.totalNetworkIn + stats.totalNetworkOut)}
            </div>
            <p className="text-xs text-muted-foreground">
              ↓ {formatBytes(stats.totalNetworkIn)} / ↑{" "}
              {formatBytes(stats.totalNetworkOut)}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
