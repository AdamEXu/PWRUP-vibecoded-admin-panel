import { AppLayout } from "@/components/layout";
import { LiveAnalyzerPage } from "@/components/pid/LiveAnalyzerPage";

export default function LivePage() {
  return (
    <AppLayout
      title="Live Monitor"
      subtitle="Passive NT4 subscriptions only. Nothing in this screen publishes commands."
    >
      <LiveAnalyzerPage />
    </AppLayout>
  );
}
