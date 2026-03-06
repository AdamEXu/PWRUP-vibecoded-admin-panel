// src/components/dashboard/ConnectionStatus.tsx - Purpose: pill indicator for connection state
import Link from "next/link";
import { Badge } from "@pwrup/shared-ui/badge";

interface ConnectionStatusProps {
  isConnected: boolean;
}

export function ConnectionStatus({ isConnected }: ConnectionStatusProps) {
  return (
    <Link href="/settings">
      <Badge
        variant={isConnected ? "default" : "secondary"}
        className={`cursor-pointer gap-2 ${
          isConnected
            ? "bg-green-600 hover:bg-green-700"
            : "bg-muted text-muted-foreground hover:bg-muted/80"
        }`}
      >
        <span
          className={`size-2 rounded-full ${
            isConnected ? "bg-green-300" : "bg-muted-foreground"
          }`}
        />
        {isConnected ? "Connected" : "Disconnected"}
      </Badge>
    </Link>
  );
}
