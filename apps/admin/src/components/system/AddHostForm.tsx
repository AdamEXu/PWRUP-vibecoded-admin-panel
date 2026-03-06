"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@pwrup/shared-ui/card";
import { Input } from "@pwrup/shared-ui/input";
import { Label } from "@pwrup/shared-ui/label";
import { Button } from "@pwrup/shared-ui/button";

interface AddHostFormProps {
  onAdd: (url: string) => void;
  defaultPort?: number;
}

export function AddHostForm({ onAdd, defaultPort = 5000 }: AddHostFormProps) {
  const [hostInput, setHostInput] = React.useState("");
  const [portInput, setPortInput] = React.useState(defaultPort.toString());

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const host = hostInput.trim();
    const port = parseInt(portInput.trim(), 10);
    if (host && !isNaN(port) && port > 0 && port < 65536) {
      const url = `http://${host}:${port}`;
      onAdd(url);
      setHostInput("");
      setPortInput(defaultPort.toString());
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Host</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex items-end gap-3">
          <div className="flex-1 space-y-2">
            <Label htmlFor="host">Host</Label>
            <Input
              id="host"
              type="text"
              placeholder="10.47.65.7"
              value={hostInput}
              onChange={(e) => setHostInput(e.target.value)}
            />
          </div>
          <div className="w-24 space-y-2">
            <Label htmlFor="port">Port</Label>
            <Input
              id="port"
              type="number"
              placeholder="5000"
              value={portInput}
              onChange={(e) => setPortInput(e.target.value)}
              min="1"
              max="65535"
            />
          </div>
          <Button type="submit" disabled={!hostInput.trim()}>
            Add
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
