// src/components/dashboard/PiSystemManager.tsx - Purpose: CRUD list for Pi systems
import { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@pwrup/shared-ui/card";
import { Button } from "@pwrup/shared-ui/button";
import { Input } from "@pwrup/shared-ui/input";
import { Badge } from "@pwrup/shared-ui/badge";
import { PiSystemData } from "@/lib/hooks/useMultiPiDashboard";
import { formatPercentage } from "@/lib/utils/formatters";

interface PiSystemManagerProps {
  piSystems: Map<string, PiSystemData>;
  topic: string;
  onAddPi: (name: string) => void;
  onRemovePi: (name: string) => void;
}

export function PiSystemManager({
  piSystems,
  topic,
  onAddPi,
  onRemovePi,
}: PiSystemManagerProps) {
  const [newPiName, setNewPiName] = useState("");
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const handleAddPi = () => {
    if (newPiName.trim()) {
      onAddPi(newPiName.trim());
      setNewPiName("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAddPi();
  };

  const getStatusBadge = (piData: PiSystemData) => {
    if (!piData.lastSeen) {
      return (
        <Badge variant="outline" className="bg-muted text-muted-foreground">
          Never connected
        </Badge>
      );
    }
    const currentTimeMs = nowMs ?? piData.lastSeen.getTime();
    const timeDiff = currentTimeMs - piData.lastSeen.getTime();
    if (timeDiff < 5000) {
      return (
        <Badge className="bg-emerald-900/30 text-emerald-400 border-emerald-700/50">
          Active
        </Badge>
      );
    }
    if (timeDiff < 30000) {
      return (
        <Badge className="bg-yellow-900/30 text-yellow-400 border-yellow-700/50">
          Recent
        </Badge>
      );
    }
    return (
      <Badge className="bg-red-900/30 text-red-400 border-red-700/50">
        Offline
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pi Systems</CardTitle>
        <CardDescription>
          Systems are auto-discovered from topic:{" "}
          <span className="font-mono text-emerald-400">{topic}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            type="text"
            value={newPiName}
            onChange={(e) => setNewPiName(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter Pi name to pre-initialize"
            className="flex-1"
          />
          <Button onClick={handleAddPi} disabled={!newPiName.trim()}>
            Add
          </Button>
        </div>

        {piSystems.size === 0 ? (
          <div className="text-center py-8 border border-dashed border-border rounded-lg">
            <div className="text-muted-foreground mb-2">
              No Pi systems detected
            </div>
            <div className="text-xs text-muted-foreground">
              Systems will appear automatically when messages are received
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from(piSystems.values()).map((piData) => (
              <div
                key={piData.name}
                className="p-4 bg-muted/50 rounded-lg border border-border hover:border-emerald-500/50 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate mb-1">
                      {piData.name}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono truncate">
                      {topic}
                    </div>
                  </div>
                  {getStatusBadge(piData)}
                </div>
                <div className="flex items-center justify-between text-sm">
                  {piData.status ? (
                    <>
                      <div className="text-muted-foreground">CPU</div>
                      <div className="font-mono font-semibold text-emerald-400">
                        {formatPercentage(piData.status.cpuUsageTotal)}
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      No data yet
                    </div>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemovePi(piData.name)}
                    className="w-full text-red-400 hover:text-red-300 hover:bg-red-900/20"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
