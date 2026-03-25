import type {
  AnalyzedRun,
  MechanismAnalysis,
  MechanismDefinition,
  NormalizedTrace,
  Recommendation,
  RunMetrics,
  SignalCheck,
  SignalSample,
} from "./types";

interface MergedPoint {
  timeSec: number;
  setpoint: number;
  measurement: number;
  effort: number | null;
  feedforward: number | null;
  current: number | null;
  velocity: number | null;
}

function lastKnownValue(series: SignalSample[], timeSec: number): number | null {
  let value: number | null = null;
  for (const sample of series) {
    if (sample.timeSec > timeSec) {
      break;
    }
    value = sample.value;
  }
  return value;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1]! + sorted[middle]!) / 2
    : sorted[middle]!;
}

function standardDeviation(values: number[]): number {
  if (values.length <= 1) {
    return 0;
  }

  const mean = average(values);
  const variance = average(values.map((value) => (value - mean) ** 2));
  return Math.sqrt(variance);
}

export function mergeTrace(trace: NormalizedTrace): MergedPoint[] {
  const timeSet = new Set<number>();
  for (const series of [
    trace.setpoint,
    trace.measurement,
    trace.effort ?? [],
    trace.feedforward ?? [],
    trace.current ?? [],
    trace.velocity ?? [],
  ]) {
    for (const sample of series) {
      timeSet.add(sample.timeSec);
    }
  }

  const times = [...timeSet].sort((a, b) => a - b);
  return times
    .map((timeSec) => ({
      timeSec,
      setpoint: lastKnownValue(trace.setpoint, timeSec),
      measurement: lastKnownValue(trace.measurement, timeSec),
      effort: trace.effort ? lastKnownValue(trace.effort, timeSec) : null,
      feedforward: trace.feedforward ? lastKnownValue(trace.feedforward, timeSec) : null,
      current: trace.current ? lastKnownValue(trace.current, timeSec) : null,
      velocity: trace.velocity ? lastKnownValue(trace.velocity, timeSec) : null,
    }))
    .filter(
      (
        point,
      ): point is {
        timeSec: number;
        setpoint: number;
        measurement: number;
        effort: number | null;
        feedforward: number | null;
        current: number | null;
        velocity: number | null;
      } => point.setpoint !== null && point.measurement !== null,
    );
}

function detectRuns(mechanism: MechanismDefinition, points: MergedPoint[]): Array<{ start: number; end: number }> {
  if (points.length < 8) {
    return points.length > 0 ? [{ start: 0, end: points.length - 1 }] : [];
  }

  const setpoints = points.map((point) => point.setpoint);
  const span = Math.max(...setpoints) - Math.min(...setpoints);
  const threshold = Math.max(mechanism.minimumAmplitude, Math.abs(span) * 0.08);

  const runs: Array<{ start: number; end: number }> = [];
  let startIndex = 0;
  let previousSetpoint = points[0]!.setpoint;

  for (let index = 1; index < points.length; index += 1) {
    const current = points[index]!;
    const delta = current.setpoint - previousSetpoint;
    if (Math.abs(delta) >= threshold && index - startIndex >= 10) {
      runs.push({ start: startIndex, end: index - 1 });
      startIndex = Math.max(0, index - 1);
    }
    previousSetpoint = current.setpoint;
  }

  runs.push({ start: startIndex, end: points.length - 1 });
  return runs.filter((run) => run.end - run.start >= 8);
}

function settlingBand(mechanism: MechanismDefinition, amplitudeAbs: number): number {
  return Math.max(amplitudeAbs * 0.05, mechanism.minimumAmplitude * 0.25);
}

function measureRiseTime(points: MergedPoint[], initialMeasurement: number, target: number): number | null {
  const delta = target - initialMeasurement;
  const amplitudeAbs = Math.abs(delta);
  if (amplitudeAbs < 1e-9) {
    return null;
  }

  const lowerTarget = initialMeasurement + delta * 0.1;
  const upperTarget = initialMeasurement + delta * 0.9;

  let lowerTime: number | null = null;
  let upperTime: number | null = null;

  for (const point of points) {
    const value = point.measurement;
    if (lowerTime === null) {
      const reachedLower = delta >= 0 ? value >= lowerTarget : value <= lowerTarget;
      if (reachedLower) {
        lowerTime = point.timeSec;
      }
    }

    if (lowerTime !== null && upperTime === null) {
      const reachedUpper = delta >= 0 ? value >= upperTarget : value <= upperTarget;
      if (reachedUpper) {
        upperTime = point.timeSec;
        break;
      }
    }
  }

  return lowerTime !== null && upperTime !== null ? upperTime - lowerTime : null;
}

function measureSettlingTime(
  mechanism: MechanismDefinition,
  points: MergedPoint[],
  target: number,
  amplitudeAbs: number,
): number | null {
  const band = settlingBand(mechanism, amplitudeAbs);

  for (let index = 0; index < points.length; index += 1) {
    const remaining = points.slice(index);
    const settled = remaining.every((point) => Math.abs(point.measurement - target) <= band);
    if (settled) {
      return points[index]!.timeSec - points[0]!.timeSec;
    }
  }

  return null;
}

function measureOvershoot(points: MergedPoint[], initialMeasurement: number, target: number): number | null {
  const delta = target - initialMeasurement;
  const amplitudeAbs = Math.abs(delta);
  if (amplitudeAbs < 1e-9) {
    return null;
  }

  const extreme = delta >= 0
    ? Math.max(...points.map((point) => point.measurement))
    : Math.min(...points.map((point) => point.measurement));

  const excess = delta >= 0 ? extreme - target : target - extreme;
  return Math.max(0, (excess / amplitudeAbs) * 100);
}

function measureSaturation(points: MergedPoint[]): number | null {
  const effortValues = points
    .map((point) => point.effort)
    .filter((value): value is number => typeof value === "number");

  if (effortValues.length === 0) {
    return null;
  }

  const maxAbs = Math.max(...effortValues.map((value) => Math.abs(value)));
  const threshold = maxAbs > 2 ? 10.8 : 0.95;
  const saturated = effortValues.filter((value) => Math.abs(value) >= threshold).length;
  return (saturated / effortValues.length) * 100;
}

function buildChecks(
  mechanism: MechanismDefinition,
  metrics: RunMetrics,
  target: number,
  tracePoints: MergedPoint[],
): SignalCheck[] {
  const checks: SignalCheck[] = [];

  checks.push({
    label: "Excitation",
    status: Math.abs(metrics.stepAmplitude) >= mechanism.minimumAmplitude ? "good" : "bad",
    detail:
      Math.abs(metrics.stepAmplitude) >= mechanism.minimumAmplitude
        ? `Step size ${Math.abs(metrics.stepAmplitude).toFixed(2)} ${mechanism.unit} is large enough to score.`
        : `Step size ${Math.abs(metrics.stepAmplitude).toFixed(2)} ${mechanism.unit} is too small to trust.`,
  });

  checks.push({
    label: "Sample density",
    status: metrics.sampleCount >= 20 ? "good" : metrics.sampleCount >= 12 ? "warn" : "bad",
    detail: `${metrics.sampleCount} aligned samples were available in the selected run.`,
  });

  checks.push({
    label: "Settling",
    status:
      metrics.settlingTimeSec === null
        ? "bad"
        : metrics.settlingTimeSec <= mechanism.recommendedRunDurationSec
          ? "good"
          : "warn",
    detail:
      metrics.settlingTimeSec === null
        ? "The loop never stayed inside the settling band for the remainder of the run."
        : `The loop settled in ${metrics.settlingTimeSec.toFixed(2)} s.`,
  });

  const endBias = Math.abs(metrics.steadyStateError);
  checks.push({
    label: "Steady-state bias",
    status:
      endBias <= settlingBand(mechanism, Math.abs(metrics.stepAmplitude))
        ? "good"
        : endBias <= settlingBand(mechanism, Math.abs(metrics.stepAmplitude)) * 2
          ? "warn"
          : "bad",
    detail: `Final bias was ${metrics.steadyStateError.toFixed(3)} ${mechanism.unit} around a ${target.toFixed(3)} ${mechanism.unit} target.`,
  });

  const staleCount = tracePoints.filter((point, index) => index > 0 && point.timeSec === tracePoints[index - 1]!.timeSec).length;
  if (staleCount > 0) {
    checks.push({
      label: "Timestamp health",
      status: "warn",
      detail: `${staleCount} duplicate timestamps were detected. Dense logging is still preferred for cleaner comparisons.`,
    });
  }

  return checks;
}

function buildRecommendations(
  mechanism: MechanismDefinition,
  metrics: RunMetrics,
  runPoints: MergedPoint[],
): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const amplitudeAbs = Math.abs(metrics.stepAmplitude);
  const band = settlingBand(mechanism, amplitudeAbs);

  if (metrics.overshootPct !== null && metrics.overshootPct > 15) {
    recommendations.push({
      parameter: "P",
      direction: "decrease",
      strength: metrics.overshootPct > 30 ? "large" : "medium",
      reason: `Overshoot reached ${metrics.overshootPct.toFixed(1)}%, which usually means proportional gain is too aggressive for this mechanism.`,
    });
    recommendations.push({
      parameter: "D",
      direction: "increase",
      strength: metrics.overshootPct > 30 ? "medium" : "small",
      reason: "The peak carries past target before the response damps out, so more derivative damping is worth checking.",
    });
  }

  if (metrics.oscillationScore > 0.55) {
    recommendations.push({
      parameter: "D",
      direction: "increase",
      strength: metrics.oscillationScore > 0.8 ? "medium" : "small",
      reason: "The tail of the response keeps alternating instead of damping out cleanly.",
    });
  }

  if (
    metrics.riseTimeSec !== null &&
    metrics.riseTimeSec > mechanism.recommendedRunDurationSec * 0.6 &&
    (metrics.overshootPct ?? 0) < 10
  ) {
    recommendations.push({
      parameter: "P",
      direction: "increase",
      strength: "small",
      reason: `Rise time of ${metrics.riseTimeSec.toFixed(2)} s is slower than expected while overshoot stays controlled.`,
    });
  }

  if (Math.abs(metrics.steadyStateError) > band * 1.25) {
    if (mechanism.supportsFeedforward) {
      const ffValues = runPoints
        .map((point) => point.feedforward)
        .filter((value): value is number => typeof value === "number");
      const averageFeedforward = average(ffValues);
      const parameter = averageFeedforward !== 0 || mechanism.loopType === "velocity" ? "FF" : "I";
      recommendations.push({
        parameter,
        direction: parameter === "FF" ? "review" : "increase",
        strength: "small",
        reason:
          parameter === "FF"
            ? "A persistent bias remained after the transient. Review feedforward before adding more integral."
            : "A persistent bias remained after the transient and there is no visible feedforward term to carry the load.",
      });
    } else {
      recommendations.push({
        parameter: "I",
        direction: "increase",
        strength: "small",
        reason: "The loop lands close to target but leaves a measurable steady-state bias.",
      });
    }
  }

  if ((metrics.saturationPct ?? 0) > 35) {
    recommendations.push({
      parameter: "FF",
      direction: "review",
      strength: "medium",
      reason: `Output saturation was present for ${metrics.saturationPct?.toFixed(0)}% of samples. More proportional gain alone is unlikely to help.`,
    });
  }

  return recommendations.slice(0, 4);
}

function scoreRun(metrics: RunMetrics, sufficient: boolean): number | null {
  if (!sufficient) {
    return null;
  }

  let score = 100;
  if (metrics.riseTimeSec !== null) {
    score -= Math.min(20, metrics.riseTimeSec * 12);
  }
  if (metrics.settlingTimeSec !== null) {
    score -= Math.min(18, metrics.settlingTimeSec * 10);
  } else {
    score -= 24;
  }
  score -= Math.min(26, (metrics.overshootPct ?? 0) * 0.8);
  score -= Math.min(18, Math.abs(metrics.steadyStateError) * 14);
  score -= Math.min(22, metrics.oscillationScore * 26);
  score -= Math.min(16, (metrics.saturationPct ?? 0) * 0.25);
  return Math.max(0, Math.round(score));
}

function confidenceForRun(mechanism: MechanismDefinition, metrics: RunMetrics, trace: NormalizedTrace): number {
  let confidence = 0.35;
  confidence += Math.min(0.2, metrics.sampleCount / 120);
  confidence += Math.min(0.2, metrics.durationSec / (mechanism.recommendedRunDurationSec * 2));
  confidence += Math.min(0.15, Math.abs(metrics.stepAmplitude) / (mechanism.minimumAmplitude * 4));
  if (trace.effort && trace.effort.length > 0) confidence += 0.05;
  if (trace.current && trace.current.length > 0) confidence += 0.025;
  if (trace.feedforward && trace.feedforward.length > 0) confidence += 0.025;
  return Math.max(0, Math.min(1, confidence));
}

function analyzeRun(
  mechanism: MechanismDefinition,
  points: MergedPoint[],
  runIndex: number,
  trace: NormalizedTrace,
): AnalyzedRun {
  const firstChunk = points.slice(0, Math.max(3, Math.floor(points.length * 0.15)));
  const lastChunk = points.slice(Math.max(0, Math.floor(points.length * 0.75)));
  const initialMeasurement = average(firstChunk.map((point) => point.measurement));
  const target = median(lastChunk.map((point) => point.setpoint));
  const finalMeasurement = average(lastChunk.map((point) => point.measurement));
  const amplitude = target - initialMeasurement;
  const amplitudeAbs = Math.abs(amplitude);
  const durationSec = Math.max(0, points.at(-1)!.timeSec - points[0]!.timeSec);
  const errorTail = lastChunk.map((point) => point.measurement - target);
  const band = settlingBand(mechanism, amplitudeAbs);
  const signChanges = errorTail.reduce((count, value, index) => {
    if (index === 0) return 0;
    const previous = errorTail[index - 1]!;
    return count + (Math.sign(previous) !== Math.sign(value) && Math.abs(value) > band ? 1 : 0);
  }, 0);

  const metrics: RunMetrics = {
    durationSec,
    sampleCount: points.length,
    stepAmplitude: amplitude,
    riseTimeSec: measureRiseTime(points, initialMeasurement, target),
    settlingTimeSec: measureSettlingTime(mechanism, points, target, amplitudeAbs),
    overshootPct: measureOvershoot(points, initialMeasurement, target),
    steadyStateError: finalMeasurement - target,
    oscillationScore: Math.min(1, standardDeviation(errorTail) / Math.max(band, 1e-6) + signChanges * 0.1),
    saturationPct: measureSaturation(points),
  };

  const dataSufficient =
    points.length >= 12 &&
    durationSec >= 0.75 &&
    amplitudeAbs >= mechanism.minimumAmplitude;
  const checks = buildChecks(mechanism, metrics, target, points);
  const recommendations = dataSufficient ? buildRecommendations(mechanism, metrics, points) : [];
  const score = scoreRun(metrics, dataSufficient);
  const confidence = confidenceForRun(mechanism, metrics, trace);

  const summary = !dataSufficient
    ? "Insufficient excitation. Capture a larger setpoint change or a longer run before trusting recommendations."
    : recommendations.length === 0
      ? "This run looks well-controlled. Any tuning changes should be small and justified by repeated traces."
      : recommendations.map((item) => `${item.direction} ${item.parameter}`).join(", ");

  return {
    id: `${mechanism.id}-run-${runIndex + 1}`,
    label: `Run ${runIndex + 1}`,
    startTimeSec: points[0]!.timeSec,
    endTimeSec: points.at(-1)!.timeSec,
    metrics,
    checks,
    recommendations,
    score,
    confidence,
    summary,
    dataSufficient,
  };
}

export function analyzeMechanismTrace(
  mechanism: MechanismDefinition,
  trace: NormalizedTrace,
): MechanismAnalysis {
  const merged = mergeTrace(trace);
  const traceWindowSec =
    merged.length === 0 ? 0 : Math.max(0, merged.at(-1)!.timeSec - merged[0]!.timeSec);

  if (merged.length === 0) {
    return {
      mechanism,
      runs: [],
      latestRun: null,
      overallScore: null,
      overallConfidence: 0,
      summary: "No overlapping setpoint and measurement samples are available yet.",
      traceWindowSec,
    };
  }

  const runs = detectRuns(mechanism, merged).map((run, index) =>
    analyzeRun(mechanism, merged.slice(run.start, run.end + 1), index, trace),
  );

  const latestRun = runs.at(-1) ?? null;
  const scoredRuns = runs.filter((run) => typeof run.score === "number");
  const overallScore =
    scoredRuns.length > 0
      ? Math.round(average(scoredRuns.map((run) => run.score as number)))
      : null;
  const overallConfidence =
    runs.length > 0 ? average(runs.map((run) => run.confidence)) : 0;

  const summary = latestRun
    ? latestRun.summary
    : "Samples are present, but no meaningful setpoint transition was detected yet.";

  return {
    mechanism,
    runs,
    latestRun,
    overallScore,
    overallConfidence,
    summary,
    traceWindowSec,
  };
}
