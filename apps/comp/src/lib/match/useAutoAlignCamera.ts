"use client";

import { useEffect, useRef } from "react";
import { ImageCompression, type ImageData } from "@pwrup/shared-proto/sensor/camera_sensor";
import { GeneralSensorData } from "@pwrup/shared-proto/sensor/general_sensor_data";
import { hasBridge, subscribeAutobahnTopic } from "@/lib/blitzRenderer";
import { CAMERA_ALIGN_TOPIC } from "./constants";

/**
 * Receives auto-align camera payloads through the Electron bridge and renders
 * the latest decoded image to the provided canvas.
 */
export function useAutoAlignCamera(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  enabled: boolean,
  topic: string,
) {
  const frameQueueRef = useRef<ImageData | null>(null);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || !hasBridge()) {
      frameQueueRef.current = null;
      return;
    }

    let disposed = false;
    let unsubscribe = () => {};
    const subscriptionTopic = topic || CAMERA_ALIGN_TOPIC;

    void subscribeAutobahnTopic(subscriptionTopic, async (update) => {
      if (disposed || !update.payload) {
        return;
      }

      try {
        const msg = GeneralSensorData.decode(update.payload);
        if (!msg.image) {
          return;
        }
        frameQueueRef.current = msg.image;
      } catch {
        // Ignore decode errors from malformed camera payloads.
      }
    }).then((cleanup) => {
      if (disposed) {
        cleanup();
        return;
      }
      unsubscribe = cleanup;
    });

    return () => {
      disposed = true;
      unsubscribe();
      frameQueueRef.current = null;
    };
  }, [enabled, topic]);

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
