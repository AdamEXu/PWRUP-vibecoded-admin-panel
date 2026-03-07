"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Address, AutobahnClient } from "autobahn-client";
import {
  HeaderColor as ProtoHeaderColor,
  HubStatus as ProtoHubStatus,
  MatchHudState as ProtoMatchHudState,
  MatchPhase as ProtoMatchPhase,
} from "@pwrup/shared-proto/status/MatchHud";
import { useSettings } from "@/lib/settings";
import { CAMERA_ALIGN_TOPIC, MATCH_HUD_TOPIC } from "./constants";
import type { HeaderColor, HubStatus, MatchPhase, MatchState } from "./types";

const LIVE_MESSAGE_TIMEOUT_MS = 1000;
const CONNECTION_POLL_MS = 250;

const DEFAULT_MATCH_STATE: MatchState = {
  isRedAlliance: true,
  gameSpecificMessage: "",
  fmsControlData: 0,
  fmsMatchTime: -1,
  robotPoseX: 0,
  robotPoseY: 0,
  robotHeading: 0,
  autoAlignActive: false,
  autoAlignDistance: 0,
  autoAlignReady: false,
  driverOverride: false,
  matchPhase: "pre_match",
  totalTimeRemaining: 0,
  shiftTimeRemaining: 0,
  shiftTimeWithBuffer: 0,
  bufferRemaining: 0,
  showShiftIndicator: false,
  showBuffer: false,
  hubStatus: "none",
  headerColor: "hidden",
  cameraTopic: CAMERA_ALIGN_TOPIC,
  isConnected: false,
};

function mapMatchPhase(phase: ProtoMatchPhase): MatchPhase {
  switch (phase) {
    case ProtoMatchPhase.AUTONOMOUS:
      return "autonomous";
    case ProtoMatchPhase.TRANSITION:
      return "transition";
    case ProtoMatchPhase.SHIFT1:
      return "shift1";
    case ProtoMatchPhase.SHIFT2:
      return "shift2";
    case ProtoMatchPhase.SHIFT3:
      return "shift3";
    case ProtoMatchPhase.SHIFT4:
      return "shift4";
    case ProtoMatchPhase.ENDGAME:
      return "endgame";
    case ProtoMatchPhase.POST_MATCH:
      return "post_match";
    case ProtoMatchPhase.PRE_MATCH:
    case ProtoMatchPhase.UNRECOGNIZED:
    default:
      return "pre_match";
  }
}

function mapHubStatus(status: ProtoHubStatus): HubStatus {
  switch (status) {
    case ProtoHubStatus.HUB_BOTH:
      return "both";
    case ProtoHubStatus.HUB_ACTIVE:
      return "active";
    case ProtoHubStatus.HUB_WARNING:
      return "warning";
    case ProtoHubStatus.HUB_INACTIVE:
      return "inactive";
    case ProtoHubStatus.HUB_NONE:
    case ProtoHubStatus.UNRECOGNIZED:
    default:
      return "none";
  }
}

function mapHeaderColor(color: ProtoHeaderColor): HeaderColor {
  switch (color) {
    case ProtoHeaderColor.HEADER_GREEN:
      return "green";
    case ProtoHeaderColor.HEADER_YELLOW:
      return "yellow";
    case ProtoHeaderColor.HEADER_PURPLE:
      return "purple";
    case ProtoHeaderColor.HEADER_HIDDEN:
    case ProtoHeaderColor.UNRECOGNIZED:
    default:
      return "hidden";
  }
}

function toMatchState(message: ProtoMatchHudState): MatchState {
  const fmsControlData = (message.enabled ? 0x01 : 0) | (message.autonomous ? 0x02 : 0);

  return {
    isRedAlliance: message.isRedAlliance,
    gameSpecificMessage: message.gameSpecificMessage,
    fmsControlData,
    fmsMatchTime: message.periodTimeRemainingS,
    robotPoseX: message.robotPoseXM,
    robotPoseY: message.robotPoseYM,
    robotHeading: message.robotHeadingRad,
    autoAlignActive: message.autoAlignActive,
    autoAlignDistance: message.autoAlignDistanceM,
    autoAlignReady: message.autoAlignReady,
    driverOverride: message.driverOverride,
    matchPhase: mapMatchPhase(message.matchPhase),
    totalTimeRemaining: message.totalTimeRemainingS,
    shiftTimeRemaining: message.shiftTimeRemainingS,
    shiftTimeWithBuffer: message.shiftTimeWithBufferS,
    bufferRemaining: message.bufferRemainingS,
    showShiftIndicator: message.showShiftIndicator,
    showBuffer: message.showBuffer,
    hubStatus: mapHubStatus(message.hubStatus),
    headerColor: mapHeaderColor(message.headerColor),
    cameraTopic: message.cameraTopic || CAMERA_ALIGN_TOPIC,
    isConnected: message.connected,
  };
}

export function useLiveMatchHudState(): MatchState {
  const { settings } = useSettings();
  const client = useMemo(
    () => new AutobahnClient(new Address(settings.host, settings.port)),
    [settings.host, settings.port],
  );
  const [payloadState, setPayloadState] = useState<MatchState>(DEFAULT_MATCH_STATE);
  const [transportConnected, setTransportConnected] = useState(false);
  const lastMessageMsRef = useRef(0);

  useEffect(() => {
    try {
      client.begin();
    } catch {
      // Ignore connection bootstrap errors; the poller below will reflect false.
    }

    const pollId = window.setInterval(() => {
      const hasRecentMessage = lastMessageMsRef.current > 0
        && (Date.now() - lastMessageMsRef.current) <= LIVE_MESSAGE_TIMEOUT_MS;
      setTransportConnected(client.isConnected() && hasRecentMessage);
    }, CONNECTION_POLL_MS);

    return () => {
      window.clearInterval(pollId);
      setTransportConnected(false);
    };
  }, [client]);

  useEffect(() => {
    const onMessage = async (payload: Uint8Array) => {
      try {
        const decoded = ProtoMatchHudState.decode(payload);
        lastMessageMsRef.current = Date.now();
        setPayloadState(toMatchState(decoded));
      } catch {
        // Ignore malformed payloads and keep the last known value visible.
      }
    };

    client.subscribe(MATCH_HUD_TOPIC, onMessage);
    return () => {
      client.unsubscribe(MATCH_HUD_TOPIC);
    };
  }, [client]);

  return {
    ...payloadState,
    isConnected: payloadState.isConnected && transportConnected,
  };
}
