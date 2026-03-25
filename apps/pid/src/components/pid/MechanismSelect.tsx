"use client";

import { Label } from "@pwrup/shared-ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@pwrup/shared-ui/card";
import { Button } from "@pwrup/shared-ui/button";
import { MECHANISM_GROUPS, MECHANISMS } from "@/lib/analysis/mechanisms";
import type { MechanismDefinition } from "@/lib/analysis/types";

interface MechanismSelectProps {
  mechanism: MechanismDefinition;
  onChange: (mechanismId: string) => void;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function MechanismSelect({
  mechanism,
  onChange,
  description,
  actionLabel,
  onAction,
}: MechanismSelectProps) {
  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle>Mechanism Selection</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-[1fr_auto]">
        <div className="space-y-2">
          <Label htmlFor="mechanism-select">Mechanism</Label>
          <select
            id="mechanism-select"
            value={mechanism.id}
            onChange={(event) => onChange(event.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {MECHANISM_GROUPS.map((group) => (
              <optgroup key={group.id} label={group.label}>
                {group.mechanismIds.map((mechanismId) => {
                  const entry = MECHANISMS.find((item) => item.id === mechanismId);
                  return entry ? (
                    <option key={entry.id} value={entry.id}>
                      {entry.label}
                    </option>
                  ) : null;
                })}
              </optgroup>
            ))}
          </select>
          <p className="text-sm text-muted-foreground">{mechanism.description}</p>
        </div>

        {actionLabel && onAction ? (
          <div className="flex items-end">
            <Button variant="outline" onClick={onAction}>
              {actionLabel}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
