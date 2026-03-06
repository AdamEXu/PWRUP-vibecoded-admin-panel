// src/app/dashboard/page.tsx - Purpose: combined dashboard with Pi monitoring and System Management
import { CombinedDashboard } from "@/components/dashboard/CombinedDashboard";
import { AppLayout } from "@/components/layout";

export default function Dashboard() {
  return (
    <AppLayout title="Dashboard">
      <CombinedDashboard />
    </AppLayout>
  );
}
