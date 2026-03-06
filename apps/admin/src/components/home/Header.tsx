// src/components/home/Header.tsx - Purpose: site header with branding and status
import Image from "next/image";
import Link from "next/link";
import { ConnectionBadge } from "@/components/ConnectionBadge";

export function Header() {
  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Image
                className="h-8 w-auto dark:invert"
                src="/next.svg"
                alt="Blitz Renderer"
                width={120}
                height={24}
                priority
              />
            </div>
            <h1 className="ml-4 text-xl font-semibold text-gray-900 dark:text-white">
              Blitz Renderer Admin
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <ConnectionBadge />
            <Link
              href="/settings"
              className="cursor-pointer text-sm text-gray-900 dark:text-white hover:underline"
            >
              Settings
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
