import type { Metadata } from "next";
import { Inter, DM_Mono, DynaPuff } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
  display: "swap",
});

const dynapuff = DynaPuff({
  subsets: ["latin"],
  variable: "--font-dynapuff",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Yo, Gurt! — Team 4765 Pinewood Robotics",
  description: "FRC 2026 robot showcase for Team 4765 Pinewood Robotics",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${dmMono.variable} ${dynapuff.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
