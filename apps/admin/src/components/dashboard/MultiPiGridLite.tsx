// src/components/dashboard/MultiPiGridLite.tsx - Purpose: lightweight grid of Pi cards
import { Card, CardHeader } from "@pwrup/shared-ui/card";
import { PiSystemData } from "@/lib/hooks/useMultiPiDashboard";
import { useMemo } from "react";
import { PiCard } from "@/components/dashboard/pi/PiCard";

interface MultiPiGridProps {
  piSystems: Map<string, PiSystemData>;
  onClearLogs: (piName: string) => void;
}

export function MultiPiGrid({ piSystems, onClearLogs }: MultiPiGridProps) {
  const activeSystems = useMemo(
    () => Array.from(piSystems.values()).filter((pi) => pi.status),
    [piSystems]
  );

  if (activeSystems.length === 0) {
    return (
      <Card>
        <CardHeader>Pi Systems</CardHeader>
        <div className="text-gray-400 text-center py-8">
          No active Pi systems. Add some systems above to see their data here.
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {activeSystems.map((pi) => (
        <PiCard key={pi.name} pi={pi} onClearLogs={onClearLogs} />
      ))}
    </div>
  );
}
