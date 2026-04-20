// src/components/home/QuickStat.tsx - Purpose: small card for a single stat
interface QuickStatProps {
  color: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}

export function QuickStat({ color, title, subtitle, icon }: QuickStatProps) {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center">
        <div className={`p-2 ${color} rounded-lg`}>{icon}</div>
        <div className="ml-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          <p className="text-gray-600 dark:text-gray-300">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}
