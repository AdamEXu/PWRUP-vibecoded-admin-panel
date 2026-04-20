// src/app/layout.tsx - Purpose: root layout and metadata
import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "PWRUP Admin",
  description: "Raspberry Pi Fleet Control Panel",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
