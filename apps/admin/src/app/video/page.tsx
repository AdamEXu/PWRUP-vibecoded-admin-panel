"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Address, AutobahnClient } from "autobahn-client";
import { useSettings } from "@/lib/settings";
import { ImageData, ImageCompression } from "@pwrup/shared-proto/sensor/camera_sensor";
import { GeneralSensorData } from "@pwrup/shared-proto/sensor/general_sensor_data";
import { Card, CardContent, CardHeader, CardTitle } from "@pwrup/shared-ui/card";
import { Input } from "@pwrup/shared-ui/input";
import { Label } from "@pwrup/shared-ui/label";
import { Button } from "@pwrup/shared-ui/button";
import { Badge } from "@pwrup/shared-ui/badge";
import { AppLayout } from "@/components/layout";
import { Plus, X, RefreshCw } from "lucide-react";

const TOPIC_HISTORY_KEY = "blitz.video.topicHistory";
const MAX_HISTORY = 10;
const MAX_FEEDS = 4;

function getTopicHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(TOPIC_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function addToTopicHistory(topic: string): string[] {
  const history = getTopicHistory().filter((t) => t !== topic);
  const updated = [topic, ...history].slice(0, MAX_HISTORY);
  localStorage.setItem(TOPIC_HISTORY_KEY, JSON.stringify(updated));
  return updated;
}

interface VideoFeedProps {
  id: string;
  client: AutobahnClient;
  topicHistory: string[];
  onTopicUsed: (topic: string) => void;
  onClose?: () => void;
  canClose: boolean;
}

function VideoFeed({
  id,
  client,
  topicHistory,
  onTopicUsed,
  onClose,
  canClose,
}: VideoFeedProps) {
  const [topic, setTopic] = useState<string>("");
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [frameWidth, setFrameWidth] = useState<number | null>(null);
  const [frameHeight, setFrameHeight] = useState<number | null>(null);
  const [subscribed, setSubscribed] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameQueueRef = useRef<ImageData | null>(null);
  const rafIdRef = useRef<number | null>(null);

  const onFrame = useCallback(async (payload: Uint8Array) => {
    try {
      const generalSensorData = GeneralSensorData.decode(payload);
      if (!generalSensorData.image) {
        return;
      }

      const imageData = generalSensorData.image;
      setFrameWidth(imageData.width ?? null);
      setFrameHeight(imageData.height ?? null);
      frameQueueRef.current = imageData;
    } catch (e) {
      console.error("Failed to decode frame:", e);
    }
  }, []);

  useEffect(() => {
    if (!subscribed) {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      return;
    }

    const renderFrame = () => {
      if (!canvasRef.current) {
        rafIdRef.current = requestAnimationFrame(renderFrame);
        return;
      }

      if (frameQueueRef.current) {
        const imageData = frameQueueRef.current;
        frameQueueRef.current = null;

        if (
          imageData.compression !== ImageCompression.JPEG &&
          imageData.compression !== ImageCompression.PNG
        ) {
          rafIdRef.current = requestAnimationFrame(renderFrame);
          return;
        }

        const mimeType =
          imageData.compression === ImageCompression.JPEG
            ? "image/jpeg"
            : "image/png";

        const imageBytes = new Uint8Array(imageData.image);
        const blob = new Blob([imageBytes], { type: mimeType });
        const url = URL.createObjectURL(blob);

        const img = new Image();
        img.onload = () => {
          if (canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              canvas.width = imageData.width;
              canvas.height = imageData.height;
              ctx.drawImage(img, 0, 0);
            }
          }
          URL.revokeObjectURL(url);
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
        };
        img.src = url;
      }

      rafIdRef.current = requestAnimationFrame(renderFrame);
    };

    rafIdRef.current = requestAnimationFrame(renderFrame);
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [subscribed]);

  useEffect(() => {
    return () => {
      if (activeTopic) {
        client.unsubscribe(activeTopic);
      }
    };
  }, [client, activeTopic]);

  function startSubscription() {
    if (!topic.trim()) return;
    setSubscribed(true);
    setActiveTopic(topic);
    onTopicUsed(topic);
    client.subscribe(topic, onFrame);
  }

  function stopSubscription() {
    if (activeTopic) {
      client.unsubscribe(activeTopic);
    }
    setSubscribed(false);
    setActiveTopic(null);
    frameQueueRef.current = null;
  }

  function updateTopic() {
    if (!topic.trim() || topic === activeTopic) return;
    if (activeTopic) {
      client.unsubscribe(activeTopic);
    }
    setActiveTopic(topic);
    onTopicUsed(topic);
    client.subscribe(topic, onFrame);
  }

  const topicChanged = subscribed && topic !== activeTopic;

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {activeTopic ? (
              <>
                <span className="truncate max-w-[200px]">{activeTopic}</span>
                <Badge variant="default" className="shrink-0">
                  Live
                </Badge>
              </>
            ) : (
              <>
                Feed {id}
                <Badge variant="secondary">Idle</Badge>
              </>
            )}
          </CardTitle>
          {canClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 flex-1 flex flex-col">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!subscribed && topic.trim().length > 0) {
              startSubscription();
            } else if (topicChanged) {
              updateTopic();
            }
          }}
          className="space-y-2"
        >
          <div className="space-y-1">
            <Label htmlFor={`topic-${id}`} className="text-xs">
              Topic
            </Label>
            <Input
              id={`topic-${id}`}
              type="text"
              placeholder="e.g. camera/front/frame"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {!subscribed ? (
              <Button
                type="button"
                size="sm"
                onClick={startSubscription}
                disabled={topic.trim().length === 0}
              >
                Start
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={stopSubscription}
                >
                  Stop
                </Button>
                {topicChanged && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={updateTopic}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Update
                  </Button>
                )}
              </>
            )}
          </div>
        </form>

        {!subscribed && topicHistory.length > 0 && (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Recent</Label>
            <div className="flex flex-wrap gap-1">
              {topicHistory.slice(0, 5).map((t) => (
                <Badge
                  key={t}
                  variant="outline"
                  className="cursor-pointer hover:bg-accent text-xs"
                  onClick={() => setTopic(t)}
                >
                  {t}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="bg-black rounded-lg overflow-hidden flex items-center justify-center flex-1 min-h-[200px]">
          {subscribed ? (
            <canvas
              ref={canvasRef}
              className="max-h-[50vh] max-w-full w-auto h-auto object-contain select-none"
              style={{ imageRendering: "auto" }}
            />
          ) : (
            <div className="text-muted-foreground p-4 text-center text-sm">
              Enter a topic to start viewing
            </div>
          )}
        </div>

        {frameWidth && frameHeight && (
          <div className="text-xs text-muted-foreground text-center">
            {frameWidth}×{frameHeight}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function VideoFeedContent() {
  const { settings } = useSettings();
  const client = useMemo(
    () => new AutobahnClient(new Address(settings.host, settings.port)),
    [settings.host, settings.port]
  );

  useEffect(() => {
    client.begin();
  }, [client]);

  const [feedIds, setFeedIds] = useState<string[]>(["1"]);
  const [topicHistory, setTopicHistory] = useState<string[]>(() => getTopicHistory());
  const nextIdRef = useRef(2);

  function addFeed() {
    if (feedIds.length >= MAX_FEEDS) return;
    setFeedIds((prev) => [...prev, String(nextIdRef.current++)]);
  }

  function removeFeed(id: string) {
    setFeedIds((prev) => prev.filter((fid) => fid !== id));
  }

  function handleTopicUsed(topic: string) {
    const updated = addToTopicHistory(topic);
    setTopicHistory(updated);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Connected to {settings.host}:{settings.port}
        </div>
        <Button
          onClick={addFeed}
          disabled={feedIds.length >= MAX_FEEDS}
          size="sm"
          variant="outline"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Feed
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {feedIds.map((id, index) => (
          <VideoFeed
            key={id}
            id={id}
            client={client}
            topicHistory={topicHistory}
            onTopicUsed={handleTopicUsed}
            onClose={() => removeFeed(id)}
            canClose={index > 0}
          />
        ))}
      </div>
    </div>
  );
}

export default function VideoFeedPage() {
  return (
    <AppLayout title="Video Feed">
      <VideoFeedContent />
    </AppLayout>
  );
}
