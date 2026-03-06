// src/components/dashboard/SystemStatus.tsx - Purpose: detailed single-Pi metrics view
import { PiStatus } from "@pwrup/shared-proto/status/PiStatus";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@pwrup/shared-ui/card";
import { Badge } from "@pwrup/shared-ui/badge";
import { ProgressBar } from "@pwrup/shared-ui/ProgressBar";
import { formatPercentage, formatBytes } from "@/lib/utils/formatters";

interface SystemStatusProps {
  piStats: PiStatus | null;
}

export function SystemStatus({ piStats }: SystemStatusProps) {
  if (!piStats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-gray-400 text-center py-8">
            Waiting for Pi status data...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Badge variant="secondary" className="text-blue-400">
            {piStats.piName || "Unknown Pi"}
          </Badge>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-2">CPU Usage</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Total</span>
              <span className="text-sm font-mono">
                {formatPercentage(piStats.cpuUsageTotal)}
              </span>
            </div>
            <ProgressBar value={piStats.cpuUsageTotal} color="blue" />
            {piStats.cpuUsageCores.map((core, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Core {index + 1}</span>
                <span className="text-xs font-mono">
                  {formatPercentage(core)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-2">
            Memory Usage
          </h4>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm">RAM</span>
            <span className="text-sm font-mono">
              {formatPercentage(piStats.memoryUsage)}
            </span>
          </div>
          <ProgressBar value={piStats.memoryUsage} color="green" />
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-2">Disk Usage</h4>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm">Storage</span>
            <span className="text-sm font-mono">
              {formatPercentage(piStats.diskUsage)}
            </span>
          </div>
          <ProgressBar value={piStats.diskUsage} color="yellow" />
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-2">Network</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-gray-400">In</span>
              <div className="text-sm font-mono">
                {formatBytes(piStats.netUsageIn)}/s
              </div>
            </div>
            <div>
              <span className="text-xs text-gray-400">Out</span>
              <div className="text-sm font-mono">
                {formatBytes(piStats.netUsageOut)}/s
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
