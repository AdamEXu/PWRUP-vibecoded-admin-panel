"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Address, AutobahnClient } from "autobahn-client";
import { Expand, Minimize, Play, RefreshCw, Square, X } from "lucide-react";

import { useSettings } from "@/lib/settings";
import { ImageData, ImageCompression } from "@/generated/sensor/camera_sensor";
import { GeneralSensorData } from "@/generated/sensor/general_sensor_data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

const VIDEO_TOPIC_HISTORY_KEY = "blitz.video.topicHistory";
const VIDEO_HISTORY_MAX = 10;

function getVideoTopicHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(VIDEO_TOPIC_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function addToVideoTopicHistory(topic: string): string[] {
  const history = getVideoTopicHistory().filter((entry) => entry !== topic);
  const updated = [topic, ...history].slice(0, VIDEO_HISTORY_MAX);
  localStorage.setItem(VIDEO_TOPIC_HISTORY_KEY, JSON.stringify(updated));
  return updated;
}

export function CompetitionVideoViewer() {
  const { settings } = useSettings();
  const client = useMemo(
    () => new AutobahnClient(new Address(settings.host, settings.port)),
    [settings.host, settings.port],
  );

  const [topic, setTopic] = useState<string>("");
  const [topicHistory, setTopicHistory] = useState<string[]>([]);
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [frameWidth, setFrameWidth] = useState<number | null>(null);
  const [frameHeight, setFrameHeight] = useState<number | null>(null);
  const [fps, setFps] = useState<number | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoShellRef = useRef<HTMLDivElement | null>(null);
  const frameQueueRef = useRef<ImageData | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const framesSinceTickRef = useRef(0);

  const onFrame = useCallback(async (payload: Uint8Array) => {
    try {
      const generalSensorData = GeneralSensorData.decode(payload);
      if (!generalSensorData.image) return;

      const imageData = generalSensorData.image;
      setFrameWidth(imageData.width ?? null);
      setFrameHeight(imageData.height ?? null);
      framesSinceTickRef.current += 1;
      frameQueueRef.current = imageData;
    } catch (error) {
      console.error("Failed to decode frame", error);
    }
  }, []);

  useEffect(() => {
    setTopicHistory(getVideoTopicHistory());
  }, []);

  useEffect(() => {
    try {
      client.begin();
    } catch {
      // Ignore begin failures.
    }
  }, [client]);

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

        const mimeType = imageData.compression === ImageCompression.JPEG ? "image/jpeg" : "image/png";
        const imageBytes = new Uint8Array(imageData.image);
        const blob = new Blob([imageBytes], { type: mimeType });
        const url = URL.createObjectURL(blob);

        const img = new Image();
        img.onload = () => {
          if (canvasRef.current) {
            const canvas = canvasRef.current;
            const context = canvas.getContext("2d");
            if (context) {
              canvas.width = imageData.width;
              canvas.height = imageData.height;
              context.drawImage(img, 0, 0);
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

  useEffect(() => {
    if (!isZoomed) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsZoomed(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isZoomed]);

  useEffect(() => {
    let lastTickMs = performance.now();
    const timerId = window.setInterval(() => {
      const nowMs = performance.now();
      const elapsedMs = nowMs - lastTickMs;
      lastTickMs = nowMs;
      const frames = framesSinceTickRef.current;
      framesSinceTickRef.current = 0;
      if (elapsedMs <= 0 || frames === 0) {
        setFps((prev) => (prev === null ? prev : 0));
        return;
      }
      setFps((frames * 1000) / elapsedMs);
    }, 500);

    return () => window.clearInterval(timerId);
  }, []);

  function startSubscription() {
    const trimmedTopic = topic.trim();
    if (!trimmedTopic) return;

    setSubscribed(true);
    setActiveTopic(trimmedTopic);
    setTopic(trimmedTopic);

    const updatedHistory = addToVideoTopicHistory(trimmedTopic);
    setTopicHistory(updatedHistory);
    client.subscribe(trimmedTopic, onFrame);
  }

  function stopSubscription() {
    if (activeTopic) {
      client.unsubscribe(activeTopic);
    }
    setSubscribed(false);
    setActiveTopic(null);
    frameQueueRef.current = null;
    framesSinceTickRef.current = 0;
    setFps(null);
  }

  function updateTopic() {
    const trimmedTopic = topic.trim();
    if (!trimmedTopic || trimmedTopic === activeTopic) return;

    if (activeTopic) {
      client.unsubscribe(activeTopic);
    }

    setActiveTopic(trimmedTopic);
    setTopic(trimmedTopic);

    const updatedHistory = addToVideoTopicHistory(trimmedTopic);
    setTopicHistory(updatedHistory);
    client.subscribe(trimmedTopic, onFrame);
  }

  function toggleZoom() {
    setIsZoomed((prev) => !prev);
  }

  const canStart = topic.trim().length > 0;
  const topicChanged = subscribed && topic.trim() !== activeTopic;

  return (
    <section className="flex h-full min-h-0 flex-col gap-3">
      <Card className="border-white/10 bg-black/60 shadow-none">
        <CardContent className="space-y-3 p-3 sm:p-4">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-medium text-zinc-100">Video Viewer</h2>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[220px] flex-1 space-y-1">
              <Label htmlFor="comp-video-topic" className="text-xs text-zinc-300">
                Topic
              </Label>
              <Input
                id="comp-video-topic"
                type="text"
                placeholder="camera/front/frame"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                className="h-9 border-white/15 bg-black text-zinc-100 placeholder:text-zinc-500"
              />
            </div>

            {!subscribed ? (
              <Button type="button" onClick={startSubscription} disabled={!canStart} className="h-9">
                <Play className="mr-1 h-4 w-4" />
                Start
              </Button>
            ) : (
              <Button type="button" variant="destructive" onClick={stopSubscription} className="h-9">
                <Square className="mr-1 h-4 w-4" />
                Stop
              </Button>
            )}

            {topicChanged && (
              <Button type="button" variant="outline" onClick={updateTopic} className="h-9 border-white/20 bg-black">
                <RefreshCw className="mr-1 h-4 w-4" />
                Update
              </Button>
            )}

            <Button type="button" variant="outline" onClick={toggleZoom} className="h-9 border-white/20 bg-black">
              {isZoomed ? (
                <>
                  <Minimize className="mr-1 h-4 w-4" />
                  Exit Zoom
                </>
              ) : (
                <>
                  <Expand className="mr-1 h-4 w-4" />
                  Zoom
                </>
              )}
            </Button>
          </div>

          {topicHistory.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {topicHistory.slice(0, 6).map((entry) => (
                <Button
                  key={entry}
                  type="button"
                  variant="outline"
                  className="h-7 border-white/15 bg-black px-2 text-xs"
                  onClick={() => setTopic(entry)}
                >
                  {entry}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card
        className={
          isZoomed
            ? "fixed inset-3 z-50 flex min-h-0 flex-col border-white/10 bg-black/95 shadow-none"
            : "flex-1 min-h-0 border-white/10 bg-black shadow-none"
        }
      >
        <CardContent className="h-full min-h-0 p-2 sm:p-3">
          <div
            ref={videoShellRef}
            className="relative flex h-full min-h-[280px] w-full items-center justify-center overflow-hidden rounded-md bg-zinc-950"
          >
            {subscribed ? (
              <canvas
                ref={canvasRef}
                className="h-auto max-h-full w-auto max-w-full object-contain"
                style={{ imageRendering: "auto" }}
              />
            ) : (
              <div className="px-6 text-center text-sm text-zinc-500">Enter a topic and start the feed.</div>
            )}

            <div className="absolute bottom-2 right-2 rounded border border-white/10 bg-black/80 px-2 py-1 text-xs text-zinc-300">
              {frameWidth && frameHeight && <div>{`${frameWidth}x${frameHeight}`}</div>}
              <div className="text-[10px] text-zinc-400">{fps !== null ? `${fps.toFixed(1)} fps` : "-- fps"}</div>
            </div>
            {isZoomed && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={toggleZoom}
                className="absolute right-2 top-2 h-8 border-white/20 bg-black/80"
              >
                <X className="h-3.5 w-3.5" />
                Close
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
