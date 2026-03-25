export type LoopType = "velocity" | "position";

export type SignalName =
  | "setpoint"
  | "measurement"
  | "effort"
  | "feedforward"
  | "current"
  | "velocity";

export interface SignalSample {
  timeSec: number;
  value: number;
}

export type SignalTrace = SignalSample[];

export interface NormalizedTrace {
  setpoint: SignalTrace;
  measurement: SignalTrace;
  effort?: SignalTrace;
  feedforward?: SignalTrace;
  current?: SignalTrace;
  velocity?: SignalTrace;
}

export interface SignalTopicConfig {
  label: string;
  candidateKeys: string[];
}

export interface MechanismDefinition {
  id: string;
  groupId: string;
  label: string;
  description: string;
  loopType: LoopType;
  unit: string;
  parameters: Array<"P" | "I" | "D" | "FF">;
  supportsFeedforward: boolean;
  minimumAmplitude: number;
  recommendedRunDurationSec: number;
  signals: {
    setpoint: SignalTopicConfig;
    measurement: SignalTopicConfig;
    effort?: SignalTopicConfig;
    feedforward?: SignalTopicConfig;
    current?: SignalTopicConfig;
    velocity?: SignalTopicConfig;
  };
}

export interface SignalCheck {
  label: string;
  status: "good" | "warn" | "bad";
  detail: string;
}

export interface RunMetrics {
  durationSec: number;
  sampleCount: number;
  stepAmplitude: number;
  riseTimeSec: number | null;
  settlingTimeSec: number | null;
  overshootPct: number | null;
  steadyStateError: number;
  oscillationScore: number;
  saturationPct: number | null;
}

export interface Recommendation {
  parameter: "P" | "I" | "D" | "FF";
  direction: "increase" | "decrease" | "review";
  strength: "small" | "medium" | "large";
  reason: string;
}

export interface AnalyzedRun {
  id: string;
  label: string;
  startTimeSec: number;
  endTimeSec: number;
  metrics: RunMetrics;
  checks: SignalCheck[];
  recommendations: Recommendation[];
  score: number | null;
  confidence: number;
  summary: string;
  dataSufficient: boolean;
}

export interface MechanismAnalysis {
  mechanism: MechanismDefinition;
  runs: AnalyzedRun[];
  latestRun: AnalyzedRun | null;
  overallScore: number | null;
  overallConfidence: number;
  summary: string;
  traceWindowSec: number;
}

export interface MechanismGroup {
  id: string;
  label: string;
  description: string;
  mechanismIds: string[];
}
