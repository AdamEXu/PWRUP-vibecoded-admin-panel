// src/components/dashboard/ProcessList.tsx - Purpose: compact list of top processes by CPU
import { PiProcess } from "@pwrup/shared-proto/status/PiStatus";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@pwrup/shared-ui/card";
import { Badge } from "@pwrup/shared-ui/badge";
import { ScrollArea } from "@pwrup/shared-ui/scroll-area";
import { formatPercentage } from "@/lib/utils/formatters";

interface ProcessListProps {
  processes: PiProcess[];
}

export function ProcessList({ processes }: ProcessListProps) {
  if (!processes || processes.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Processes</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[200px]">
          <div className="space-y-2 pr-4">
            {processes.map((process, index) => (
              <div
                key={`${process.pid}-${index}`}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 w-6 text-right">
                    {index + 1}
                  </span>
                  <span className="font-mono">{process.name}</span>
                  <Badge variant="outline" className="text-xs text-gray-400">
                    PID: {process.pid}
                  </Badge>
                </div>
                <span className="font-mono text-blue-400">
                  {formatPercentage(process.cpuUsage)}
                </span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
