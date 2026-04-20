// src/components/dashboard/Terminal.tsx - Purpose: scrollable log viewer
"use client";
import { useRef, useEffect } from "react";
import { LogMessage } from "@pwrup/shared-proto/status/PiStatus";
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
} from "@pwrup/shared-ui/card";
import { Button } from "@pwrup/shared-ui/button";
import { ScrollArea } from "@pwrup/shared-ui/scroll-area";

interface TerminalProps {
  messages: LogMessage[];
  onClear: (e?: unknown) => void;
}

export function Terminal({ messages, onClear }: TerminalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <Card className="bg-black border-border">
      <CardHeader className="pb-0">
        <CardTitle className="text-emerald-400">Terminal Logs</CardTitle>
        <CardAction>
          <Button variant="outline" size="xs" onClick={onClear}>
            Clear
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[320px]">
          <div ref={scrollRef} className="font-mono text-sm space-y-1 pr-4">
            {messages.length === 0 ? (
              <div className="text-muted-foreground text-center py-8">
                Waiting for log messages...
              </div>
            ) : (
              messages.map((log, index) => (
                <div key={index} className="flex">
                  {log.prefix && (
                    <span
                      className="mr-2 flex-shrink-0"
                      style={{ color: log.color || "#60A5FA" }}
                    >
                      [{log.prefix}]
                    </span>
                  )}
                  <span
                    className="flex-1 break-words"
                    style={{ color: log.color || "#FFFFFF" }}
                  >
                    {log.message}
                  </span>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
