// src/components/dashboard/pi/PiCharts.tsx - Purpose: charts column for a Pi
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@pwrup/shared-ui/card";
import { CpuCoresChart, SystemUsagePie, NetworkChart } from "@pwrup/shared-ui";
import { formatBytes } from "@/lib/utils/formatters";
import { PiSystemData } from "@/lib/hooks/useMultiPiDashboard";

export function PiCharts({ pi }: { pi: PiSystemData }) {
  const status = pi.status;
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-blue-400">System Usage Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <SystemUsagePie
            cpu={status?.cpuUsageTotal || 0}
            memory={status?.memoryUsage || 0}
            disk={status?.diskUsage || 0}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-purple-400">CPU Cores Usage</CardTitle>
        </CardHeader>
        <CardContent>
          {status?.cpuUsageCores && status.cpuUsageCores.length > 0 ? (
            <CpuCoresChart cores={status.cpuUsageCores} />
          ) : (
            <div className="h-48 flex items-center justify-center bg-muted/50 rounded-lg">
              <span className="text-muted-foreground">No CPU core data available</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-green-400">Network Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <NetworkChart
            networkIn={status?.netUsageIn || 0}
            networkOut={status?.netUsageOut || 0}
          />
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="bg-muted/50 p-3 rounded-lg text-center">
              <div className="text-xs text-muted-foreground">Current Download</div>
              <div className="text-sm font-mono text-green-400">
                ↓ {formatBytes(status?.netUsageIn || 0)}/s
              </div>
            </div>
            <div className="bg-muted/50 p-3 rounded-lg text-center">
              <div className="text-xs text-muted-foreground">Current Upload</div>
              <div className="text-sm font-mono text-blue-400">
                ↑ {formatBytes(status?.netUsageOut || 0)}/s
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
