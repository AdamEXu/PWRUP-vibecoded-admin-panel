// src/components/dashboard/TopicConfig.tsx - Purpose: topic subscription configuration
"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@pwrup/shared-ui/card";
import { Input } from "@pwrup/shared-ui/input";
import { Label } from "@pwrup/shared-ui/label";
import { Button } from "@pwrup/shared-ui/button";

interface TopicConfigProps {
  topic: string;
  onTopicChange: (topic: string) => void;
}

export function TopicConfig({ topic, onTopicChange }: TopicConfigProps) {
  const [topicInput, setTopicInput] = useState(topic);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setTopicInput(topic);
  }, [topic]);

  const handleSave = () => {
    if (topicInput.trim() && topicInput.trim() !== topic) {
      onTopicChange(topicInput.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTopicInput(topic);
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Subscription Topics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-2">
                <Label htmlFor="topic-input">Topic</Label>
                <Input
                  id="topic-input"
                  type="text"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave();
                    if (e.key === "Escape") handleCancel();
                  }}
                  className="font-mono"
                  autoFocus
                />
              </div>
            ) : (
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="cursor-pointer text-left w-full px-3 py-2 rounded-md border bg-muted/50 hover:bg-muted font-mono text-sm transition-colors"
                >
                  {topic}
                </button>
                <p className="text-xs text-muted-foreground px-1">
                  Logs: <code className="font-mono">{topic}</code> • Stats:{" "}
                  <code className="font-mono">{topic}/stats</code>
                </p>
              </div>
            )}
          </div>
          {isEditing && (
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={!topicInput.trim() || topicInput.trim() === topic}
                size="sm"
              >
                Save
              </Button>
              <Button onClick={handleCancel} variant="outline" size="sm">
                Cancel
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
