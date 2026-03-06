// src/components/home/ActionCard.tsx - Purpose: CTA card link
import Link from "next/link";

interface ActionCardProps {
  href: string;
  title: string;
  description: string;
  rightIcon: React.ReactNode;
}

export function ActionCard({
  href,
  title,
  description,
  rightIcon,
}: ActionCardProps) {
  return (
    <Link
      href={href}
      className="cursor-pointer group bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {title}
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mt-2">{description}</p>
          <div className="flex items-center mt-4 text-blue-600 dark:text-blue-400">
            <span className="text-sm font-medium">Open</span>
            <span className="w-4 h-4 ml-2">➜</span>
          </div>
        </div>
        <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
          {rightIcon}
        </div>
      </div>
    </Link>
  );
}
