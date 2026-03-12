"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="top-left"
      theme="dark"
      duration={1800}
      closeButton={false}
      richColors
      toastOptions={{
        classNames: {
          success: "!bg-[#0a0a0a] !text-[#70cd35] !border-[#2a2a2a]",
          error: "!bg-[#0a0a0a] !text-[#ef4444] !border-[#2a2a2a]",
        },
      }}
    />
  );
}
