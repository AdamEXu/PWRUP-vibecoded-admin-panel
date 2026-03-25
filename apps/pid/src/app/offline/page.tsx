import { AppLayout } from "@/components/layout";
import { OfflineAnalyzerPage } from "@/components/pid/OfflineAnalyzerPage";

export default function OfflinePage() {
  return (
    <AppLayout
      title="Offline Review"
      subtitle="Load replay databases, extract PID-relevant traces, and compare prior runs."
    >
      <OfflineAnalyzerPage />
    </AppLayout>
  );
}
