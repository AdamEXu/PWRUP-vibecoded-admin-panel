// src/components/home/HomePage.tsx - Purpose: compose Home page sections into small components
import {
  Header,
  Welcome,
  QuickStat,
  ActionCard,
  SystemManagementCard,
} from "@/components/home";

export function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Welcome />
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <QuickStat
            color="bg-blue-100 dark:bg-blue-900"
            title="Systems"
            subtitle="Connected Pi devices"
            icon={
              <span className="w-6 h-6 text-blue-600 dark:text-blue-300">
                ■
              </span>
            }
          />
          <QuickStat
            color="bg-green-100 dark:bg-green-900"
            title="Status"
            subtitle="All systems healthy"
            icon={
              <span className="w-6 h-6 text-green-600 dark:text-green-300">
                ✓
              </span>
            }
          />
          <QuickStat
            color="bg-purple-100 dark:bg-purple-900"
            title="Performance"
            subtitle="Real-time monitoring"
            icon={
              <span className="w-6 h-6 text-purple-600 dark:text-purple-300">
                ➤
              </span>
            }
          />
        </section>
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ActionCard
            href="/dashboard"
            title="Multi-Pi Dashboard"
            description="Monitor multiple Raspberry Pi systems with real-time data, system metrics, and performance analytics."
            rightIcon={
              <span className="w-8 h-8 text-blue-600 dark:text-blue-300">
                📊
              </span>
            }
          />
          <SystemManagementCard />
          <ActionCard
            href="/settings"
            title="Connection Settings"
            description="Configure Autobahn host and port used by the dashboards."
            rightIcon={
              <span className="w-8 h-8 text-emerald-600 dark:text-emerald-300">
                ⚙️
              </span>
            }
          />
          <ActionCard
            href="/video"
            title="Live Video"
            description="Subscribe to a pub topic and preview the live video feed."
            rightIcon={
              <span className="w-8 h-8 text-purple-600 dark:text-purple-300">
                🎥
              </span>
            }
          />
        </section>
      </main>
    </div>
  );
}
