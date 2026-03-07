"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { Address, AutobahnClient } from "autobahn-client";
import { ImageCompression, type ImageData } from "@pwrup/shared-proto/sensor/camera_sensor";
import { GeneralSensorData } from "@pwrup/shared-proto/sensor/general_sensor_data";
import { useSettings } from "@/lib/settings";
import { CAMERA_ALIGN_TOPIC } from "./constants";

/**
 * Subscribes to the auto-align camera topic via Autobahn and renders each
 * JPEG/PNG frame to the provided canvas ref via requestAnimationFrame.
 *
 * Only subscribes when `enabled` is true (i.e. auto-align is active).
 */
export function useAutoAlignCamera(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  enabled: boolean,
  topic: string,
) {
  const { settings } = useSettings();

  const client = useMemo(
    () => new AutobahnClient(new Address(settings.host, settings.port)),
    [settings.host, settings.port],
  );

  const frameQueueRef = useRef<ImageData | null>(null);
  const rafIdRef = useRef<number | null>(null);

  const onFrame = useCallback(async (payload: Uint8Array) => {
    try {
      const msg = GeneralSensorData.decode(payload);
      if (!msg.image) return;
      frameQueueRef.current = msg.image;
    } catch {
      // Ignore decode errors
    }
  }, []);

  // Start/stop Autobahn client
  useEffect(() => {
    try { client.begin(); } catch { /* ignore */ }
  }, [client]);

  // Subscribe / unsubscribe based on enabled flag
  useEffect(() => {
    const subscriptionTopic = topic || CAMERA_ALIGN_TOPIC;

    if (!enabled) {
      client.unsubscribe(subscriptionTopic);
      frameQueueRef.current = null;
      return;
    }
    frameQueueRef.current = null;
    client.subscribe(subscriptionTopic, onFrame);
    return () => {
      client.unsubscribe(subscriptionTopic);
      frameQueueRef.current = null;
    };
  }, [client, enabled, onFrame, topic]);

  // RAF render loop
  useEffect(() => {
    if (!enabled) {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      return;
    }

    const render = () => {
      const frame = frameQueueRef.current;
      if (frame && canvasRef.current) {
        frameQueueRef.current = null;

        if (
          frame.compression !== ImageCompression.JPEG &&
          frame.compression !== ImageCompression.PNG
        ) {
          rafIdRef.current = requestAnimationFrame(render);
          return;
        }

        const mime = frame.compression === ImageCompression.JPEG ? "image/jpeg" : "image/png";
        const blob = new Blob([new Uint8Array(frame.image)], { type: mime });
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            canvas.width = frame.width;
            canvas.height = frame.height;
            ctx.drawImage(img, 0, 0);
          }
          URL.revokeObjectURL(url);
        };
        img.onerror = () => URL.revokeObjectURL(url);
        img.src = url;
      }
      rafIdRef.current = requestAnimationFrame(render);
    };

    rafIdRef.current = requestAnimationFrame(render);
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [canvasRef, enabled]);
}
