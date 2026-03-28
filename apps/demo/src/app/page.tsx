"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DemoShell } from "@/components/layout/DemoShell";
import { AttractScreen } from "@/components/booth/AttractScreen";
import { isBooth } from "@/lib/booth";
import { useState } from "react";

function DemoPage() {
  const searchParams = useSearchParams();
  const booth = isBooth(searchParams);
  const [attractDone, setAttractDone] = useState(false);

  if (booth && !attractDone) {
    return <AttractScreen onBegin={() => setAttractDone(true)} />;
  }

  return <DemoShell booth={booth} onIdle={booth ? () => setAttractDone(false) : undefined} />;
}

export default function Page() {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-black" />}>
      <DemoPage />
    </Suspense>
  );
}
