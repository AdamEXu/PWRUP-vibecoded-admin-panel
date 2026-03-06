import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { CompShell } from "./comp-shell";

export const metadata: Metadata = {
  title: "PWRUP Comp",
  description: "PWRUP Competition Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <Providers>
          <CompShell>{children}</CompShell>
        </Providers>
      </body>
    </html>
  );
}
