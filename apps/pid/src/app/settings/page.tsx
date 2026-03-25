"use client";

import { ConnectionSettingsForm } from "@pwrup/shared-ui/connection-settings-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@pwrup/shared-ui/card";
import { Label } from "@pwrup/shared-ui/label";
import { Input } from "@pwrup/shared-ui/input";
import { Button } from "@pwrup/shared-ui/button";
import { AppLayout } from "@/components/layout";
import { usePidAppSettings } from "@/lib/pid-settings";
import { useSettings } from "@/lib/settings";

function AnalyzerSettingsCard() {
  const { settings, updateSettings, resetSettings } = usePidAppSettings();

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle>Analyzer Preferences</CardTitle>
        <CardDescription>
          These preferences are local to the PID app. They only affect how much data is retained and
          where offline replay discovery starts.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="replay-directory">Replay directory</Label>
          <Input
            id="replay-directory"
            value={settings.replayDirectory}
            onChange={(event) => updateSettings({ replayDirectory: event.target.value })}
          />
          <p className="text-sm text-muted-foreground">
            The offline browser starts here when listing local replay databases.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="live-window">Live window (seconds)</Label>
          <Input
            id="live-window"
            type="number"
            value={String(settings.liveWindowSeconds)}
            onChange={(event) =>
              updateSettings({ liveWindowSeconds: Number(event.target.value) || 0 })
            }
          />
          <p className="text-sm text-muted-foreground">
            Older live samples roll off after this window so charts stay readable.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="max-samples">Max samples per signal</Label>
          <Input
            id="max-samples"
            type="number"
            value={String(settings.maxSamplesPerSignal)}
            onChange={(event) =>
              updateSettings({ maxSamplesPerSignal: Number(event.target.value) || 0 })
            }
          />
          <p className="text-sm text-muted-foreground">
            This caps memory use in live mode while still preserving the last window of samples.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="minimum-confidence">Minimum confidence (%)</Label>
          <Input
            id="minimum-confidence"
            type="number"
            value={String(settings.minimumConfidencePercent)}
            onChange={(event) =>
              updateSettings({ minimumConfidencePercent: Number(event.target.value) || 0 })
            }
          />
          <p className="text-sm text-muted-foreground">
            Recommendations below this confidence are still shown, but clearly marked as low trust.
          </p>
        </div>

        <div className="md:col-span-2">
          <Button variant="outline" onClick={resetSettings}>
            Reset analyzer preferences
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const { settings, setSettings, resetDefaults } = useSettings();

  return (
    <AppLayout
      title="Settings"
      subtitle="Shared NT4 connection settings plus local analyzer preferences."
    >
      <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
        <ConnectionSettingsForm
          settings={settings}
          setSettings={(next) =>
            setSettings({
              ...next,
              reconnectTimeoutSeconds: settings.reconnectTimeoutSeconds,
            })
          }
          resetDefaults={resetDefaults}
        />
        <AnalyzerSettingsCard />
      </div>
    </AppLayout>
  );
}
