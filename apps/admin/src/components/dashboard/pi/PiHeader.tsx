// src/components/dashboard/pi/PiHeader.tsx - Purpose: clickable card header for a Pi
import { CardHeader, CardTitle } from "@pwrup/shared-ui/card";
import { Badge } from "@pwrup/shared-ui/badge";
import { Button } from "@pwrup/shared-ui/button";
import { ChevronDown } from "lucide-react";
import { formatPercentage } from "@/lib/utils/formatters";
import { PiSystemData } from "@/lib/hooks/useMultiPiDashboard";
import { forwardRef } from "react";

interface PiHeaderProps {
  pi: PiSystemData;
  isExpanded: boolean;
}

export const PiHeader = forwardRef<HTMLButtonElement, PiHeaderProps>(
  ({ pi, isExpanded, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        variant="ghost"
        className="w-full h-auto p-0 hover:bg-accent/50"
        {...props}
      >
        <CardHeader className="w-full">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <CardTitle className="flex items-center gap-2">
                {pi.name}
                <Badge variant="default" className="bg-green-500 text-white">
                  ●
                </Badge>
              </CardTitle>
              <div className="flex gap-3 text-sm">
                <Badge variant="outline" className="text-blue-400 border-blue-400/50">
                  CPU: {formatPercentage(pi.status?.cpuUsageTotal || 0)}
                </Badge>
                <Badge variant="outline" className="text-green-400 border-green-400/50">
                  RAM: {formatPercentage(pi.status?.memoryUsage || 0)}
                </Badge>
                <Badge variant="outline" className="text-yellow-400 border-yellow-400/50">
                  Disk: {formatPercentage(pi.status?.diskUsage || 0)}
                </Badge>
              </div>
            </div>
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
          </div>
        </CardHeader>
      </Button>
    );
  }
);

PiHeader.displayName = "PiHeader";
