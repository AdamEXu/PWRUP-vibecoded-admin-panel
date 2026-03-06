// src/app/robot-controls/page.tsx - Purpose: route entry for Robot Controls UI
import { RobotControlsPage } from "@/components/robot-controls/RobotControlsPage";
import { AppLayout } from "@/components/layout";

export default function RobotControls() {
  return (
    <AppLayout title="Robot Controls">
      <RobotControlsPage />
    </AppLayout>
  );
}
