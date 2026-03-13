"use client";

import type {
  ConnectionSettings,
  HudVisibilitySettings,
  SharedSettingsPayload,
} from "@pwrup/shared-core/settings-schema";
import type {
  NetworkTablesTypeInfo,
  NetworkTablesTypes,
} from "ntcore-ts-client";

export interface NtTopicUpdate<T extends NetworkTablesTypes> {
  subscriptionId: number;
  topicPath: string;
  value: T;
  hasValue: boolean;
  isConnected: boolean;
}

export interface NtTopicSubscribeParams<T extends NetworkTablesTypes> {
  topicPath: string;
  typeInfo: NetworkTablesTypeInfo;
  defaultValue: T;
}

export interface NtTopicPublishParams<T extends NetworkTablesTypes> extends NtTopicSubscribeParams<T> {
  value: T;
}

export interface AutobahnTopicUpdate {
  subscriptionId: number;
  topic: string;
  payload: Uint8Array | null;
  isConnected: boolean;
}

export interface MainWindowMockState {
  enabled: boolean;
  scenario: string | null;
  url: string | null;
}

export interface BlitzRendererBridge {
  platform: string;
  electronVersion: string;
  settings: {
    getSnapshot: () => Promise<SharedSettingsPayload>;
    subscribe: (callback: (snapshot: SharedSettingsPayload) => void) => number;
    unsubscribe: (callbackId: number) => void;
    setConnectionSettings: (settings: ConnectionSettings) => Promise<SharedSettingsPayload>;
    setHudVisibility: (hudVisibility: HudVisibilitySettings) => Promise<SharedSettingsPayload>;
    resetConnectionSettings: () => Promise<SharedSettingsPayload>;
    resetHudVisibility: () => Promise<SharedSettingsPayload>;
  };
  nt: {
    subscribe: <T extends NetworkTablesTypes>(
      params: NtTopicSubscribeParams<T>,
      callback: (update: NtTopicUpdate<T>) => void,
    ) => Promise<number>;
    unsubscribe: (subscriptionId: number) => Promise<void>;
    publish: <T extends NetworkTablesTypes>(params: NtTopicPublishParams<T>) => Promise<void>;
  };
  autobahn: {
    getStatus: () => Promise<boolean>;
    subscribeStatus: (callback: (isConnected: boolean) => void) => number;
    unsubscribeStatus: (callbackId: number) => void;
    subscribeTopic: (
      params: { topic: string },
      callback: (update: AutobahnTopicUpdate) => void,
    ) => Promise<number>;
    unsubscribeTopic: (subscriptionId: number) => Promise<void>;
    publish: (params: { topic: string; payload: Uint8Array | ArrayBuffer }) => Promise<void>;
  };
  debug: {
    subscribeLaneToastPreview: (callback: (enabled: boolean) => void) => number;
    unsubscribeLaneToastPreview: (callbackId: number) => void;
    getMainWindowMock: () => Promise<MainWindowMockState>;
    setMainWindowMock: (scenario: string | null) => Promise<MainWindowMockState>;
  };
}

declare global {
  interface Window {
    blitzRenderer?: BlitzRendererBridge;
  }
}

function requireBridge(): BlitzRendererBridge {
  if (typeof window === "undefined" || !window.blitzRenderer) {
    throw new Error("PWRUP Comp requires the Electron bridge runtime.");
  }
  return window.blitzRenderer;
}

export function hasBridge() {
  return typeof window !== "undefined" && !!window.blitzRenderer;
}

export function getBridge() {
  return requireBridge();
}

type MainWindowMockDebugBridge = {
  getMainWindowMock: () => Promise<MainWindowMockState>;
  setMainWindowMock: (scenario: string | null) => Promise<MainWindowMockState>;
};

function requireMainWindowMockDebugBridge(
  bridge: BlitzRendererBridge,
): MainWindowMockDebugBridge {
  const debugBridge = bridge.debug as Partial<MainWindowMockDebugBridge>;
  if (
    typeof debugBridge.getMainWindowMock !== "function"
    || typeof debugBridge.setMainWindowMock !== "function"
  ) {
    throw new Error(
      "Main-window mock controls are unavailable in this runtime bridge. Restart the Electron app to load the latest preload.",
    );
  }

  return debugBridge as MainWindowMockDebugBridge;
}

export function hasMainWindowMockControls() {
  if (typeof window === "undefined" || !window.blitzRenderer) {
    return false;
  }

  const debugBridge = window.blitzRenderer.debug as Partial<MainWindowMockDebugBridge>;
  return (
    typeof debugBridge.getMainWindowMock === "function"
    && typeof debugBridge.setMainWindowMock === "function"
  );
}

export async function subscribeSettings(
  callback: (snapshot: SharedSettingsPayload) => void,
): Promise<() => void> {
  const bridge = requireBridge();
  const callbackId = bridge.settings.subscribe(callback);
  return () => {
    bridge.settings.unsubscribe(callbackId);
  };
}

export async function subscribeNtTopic<T extends NetworkTablesTypes>(
  params: NtTopicSubscribeParams<T>,
  callback: (update: NtTopicUpdate<T>) => void,
): Promise<() => void> {
  const bridge = requireBridge();
  const subscriptionId = await bridge.nt.subscribe(params, callback);
  return () => {
    void bridge.nt.unsubscribe(subscriptionId);
  };
}

export async function subscribeAutobahnTopic(
  topic: string,
  callback: (update: AutobahnTopicUpdate) => void,
): Promise<() => void> {
  const bridge = requireBridge();
  const subscriptionId = await bridge.autobahn.subscribeTopic({ topic }, callback);
  return () => {
    void bridge.autobahn.unsubscribeTopic(subscriptionId);
  };
}

export function subscribeAutobahnStatus(callback: (isConnected: boolean) => void): () => void {
  const bridge = requireBridge();
  const callbackId = bridge.autobahn.subscribeStatus(callback);
  return () => {
    bridge.autobahn.unsubscribeStatus(callbackId);
  };
}

export function subscribeLaneToastPreview(
  callback: (enabled: boolean) => void,
): () => void {
  const bridge = requireBridge();
  const callbackId = bridge.debug.subscribeLaneToastPreview(callback);
  return () => {
    bridge.debug.unsubscribeLaneToastPreview(callbackId);
  };
}

export async function getMainWindowMockState(): Promise<MainWindowMockState> {
  const bridge = requireBridge();
  const debugBridge = requireMainWindowMockDebugBridge(bridge);
  return debugBridge.getMainWindowMock();
}

export async function setMainWindowMockState(
  scenario: string | null,
): Promise<MainWindowMockState> {
  const bridge = requireBridge();
  const debugBridge = requireMainWindowMockDebugBridge(bridge);
  return debugBridge.setMainWindowMock(scenario);
}
