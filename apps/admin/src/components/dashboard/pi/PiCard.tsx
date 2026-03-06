// src/components/dashboard/pi/PiCard.tsx - Purpose: expandable Pi card shell
import {
  Card,
  CardContent,
  CardFooter,
} from "@pwrup/shared-ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@pwrup/shared-ui/collapsible";
import { PiSystemData } from "@/lib/hooks/useMultiPiDashboard";
import { useState } from "react";
import { PiHeader } from "./PiHeader";
import { PiCharts } from "./PiCharts";
import { PiDetails } from "./PiDetails";

interface PiCardProps {
  pi: PiSystemData;
  onClearLogs: (piName: string) => void;
}

export function PiCard({ pi, onClearLogs }: PiCardProps) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Card>
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CollapsibleTrigger asChild>
          <PiHeader pi={pi} isExpanded={expanded} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <PiCharts pi={pi} />
              <PiDetails pi={pi} onClearLogs={onClearLogs} />
            </div>
          </CardContent>
          <CardFooter className="border-t pt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm w-full">
              <div>
                <span className="text-muted-foreground">System:</span>
                <span className="ml-2 font-mono">{pi.name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <span className="ml-2 text-green-400">Online</span>
              </div>
              <div>
                <span className="text-muted-foreground">Last Update:</span>
                <span className="ml-2 font-mono text-xs">
                  {pi.lastSeen?.toLocaleString() || "Never"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Logs:</span>
                <span className="ml-2 font-mono">{pi.logs.length}/100</span>
              </div>
            </div>
          </CardFooter>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
