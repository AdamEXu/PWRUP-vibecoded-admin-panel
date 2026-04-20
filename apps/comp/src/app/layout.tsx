import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "PWRUP Comp",
  description: "PWRUP Competition Display App",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased overflow-hidden">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
