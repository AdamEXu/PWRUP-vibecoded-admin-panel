// src/components/dashboard/pi/PiDetails.tsx - Purpose: details & processes & terminal for a Pi
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@pwrup/shared-ui/card";
import { Badge } from "@pwrup/shared-ui/badge";
import { ProgressBar, ProcessChart } from "@pwrup/shared-ui";
import { formatPercentage } from "@/lib/utils/formatters";
import { PiSystemData } from "@/lib/hooks/useMultiPiDashboard";
import { Terminal } from "@/components/dashboard/Terminal";

interface PiDetailsProps {
  pi: PiSystemData;
  onClearLogs: (piName: string) => void;
}

export function PiDetails({ pi, onClearLogs }: PiDetailsProps) {
  const status = pi.status;
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-orange-400">Detailed Statistics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-blue-400 mb-3">
              CPU Information
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total Usage:</span>
                <span className="ml-2 font-mono font-bold text-blue-400">
                  {formatPercentage(status?.cpuUsageTotal || 0)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Cores:</span>
                <span className="ml-2 font-mono">
                  {status?.cpuUsageCores?.length || 0}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Max Core:</span>
                <span className="ml-2 font-mono text-red-400">
                  {status?.cpuUsageCores
                    ? formatPercentage(Math.max(...status.cpuUsageCores))
                    : "0.0%"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Min Core:</span>
                <span className="ml-2 font-mono text-green-400">
                  {status?.cpuUsageCores
                    ? formatPercentage(Math.min(...status.cpuUsageCores))
                    : "0.0%"}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <h4 className="text-sm font-medium text-green-400 mb-1">
              Storage Information
            </h4>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Memory Usage:</span>
              <span className="font-mono font-bold text-green-400">
                {formatPercentage(status?.memoryUsage || 0)}
              </span>
            </div>
            <ProgressBar value={status?.memoryUsage || 0} color="green" />
            <div className="flex justify-between mt-3">
              <span className="text-muted-foreground">Disk Usage:</span>
              <span className="font-mono font-bold text-yellow-400">
                {formatPercentage(status?.diskUsage || 0)}
              </span>
            </div>
            <ProgressBar value={status?.diskUsage || 0} color="yellow" />
          </div>

          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <h4 className="text-sm font-medium text-purple-400 mb-1">
              Ports in Use
            </h4>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Open Ports:</span>
              <span className="font-mono font-bold text-purple-300">
                {status?.portsInUse?.length || 0}
              </span>
            </div>
            {status?.portsInUse?.length ? (
              <div className="flex flex-wrap gap-2">
                {status.portsInUse.slice(0, 24).map((port, idx) => (
                  <Badge
                    key={`${port}-${idx}`}
                    variant="outline"
                    className="font-mono text-xs"
                  >
                    {port}
                  </Badge>
                ))}
                {status.portsInUse.length > 24 ? (
                  <Badge variant="secondary" className="font-mono text-xs">
                    +{status.portsInUse.length - 24} more
                  </Badge>
                ) : null}
              </div>
            ) : (
              <div className="text-muted-foreground text-sm">None reported</div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-red-400">Top Processes</CardTitle>
        </CardHeader>
        <CardContent>
          {status?.top10Processes && status.top10Processes.length > 0 ? (
            <ProcessChart processes={status.top10Processes} />
          ) : (
            <div className="h-48 flex items-center justify-center bg-muted/50 rounded-lg">
              <span className="text-muted-foreground">No process data available</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Terminal
        messages={pi.logs.slice(-100)}
        onClear={() => onClearLogs(pi.name)}
      />
    </div>
  );
}
