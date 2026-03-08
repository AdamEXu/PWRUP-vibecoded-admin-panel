"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@pwrup/shared-ui/badge";
import { getBridge, hasBridge, subscribeAutobahnStatus } from "@/lib/blitzRenderer";

export function ConnectionBadge() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!hasBridge()) {
      setConnected(false);
      return;
    }

    let disposed = false;
    const unsubscribe = subscribeAutobahnStatus((isConnected) => {
      if (!disposed) {
        setConnected(isConnected);
      }
    });

    void getBridge()
      .autobahn
      .getStatus()
      .then((isConnected) => {
        if (!disposed) {
          setConnected(isConnected);
        }
      })
      .catch(() => {
        if (!disposed) {
          setConnected(false);
        }
      });

    return () => {
      disposed = true;
      unsubscribe();
    };
  }, []);

  return (
    <Link href="/touchscreen">
      <Badge
        variant={connected ? "default" : "secondary"}
        className={[
          "cursor-pointer gap-2",
          connected
            ? "bg-green-600 hover:bg-green-700"
            : "bg-muted text-muted-foreground hover:bg-muted/80",
        ].join(" ")}
      >
        <span
          className={[
            "size-2 rounded-full",
            connected ? "bg-green-300" : "bg-muted-foreground",
          ].join(" ")}
        />
        {connected ? "Connected" : "Disconnected"}
      </Badge>
    </Link>
  );
}
