// src/components/home/SystemManagementCard.tsx - Purpose: link card to open System Management
import Link from "next/link";

export function SystemManagementCard() {
  return (
    <Link
      href="/system"
      className="cursor-pointer bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            System Management
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Start/stop processes and set config via Watchdog API.
          </p>
          <div className="flex items-center mt-4 text-emerald-600 dark:text-emerald-400">
            <span className="text-sm font-medium">Open</span>
            <span className="w-4 h-4 ml-2">➜</span>
          </div>
        </div>
        <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">⚙️</div>
      </div>
    </Link>
  );
}
