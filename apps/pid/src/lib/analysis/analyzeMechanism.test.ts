import test from "node:test";
import assert from "node:assert/strict";
import { analyzeMechanismTrace } from "./analyzeMechanism.ts";
import { getMechanismById } from "./mechanisms.ts";
import type { NormalizedTrace, SignalSample } from "./types.ts";

function buildStepSeries(
  target: number,
  values: number[],
  dtSec: number,
): { setpoint: SignalSample[]; measurement: SignalSample[]; effort: SignalSample[] } {
  return {
    setpoint: values.map((_, index) => ({
      timeSec: index * dtSec,
      value: index < 2 ? 0 : target,
    })),
    measurement: values.map((value, index) => ({
      timeSec: index * dtSec,
      value,
    })),
    effort: values.map((_, index) => ({
      timeSec: index * dtSec,
      value: index < 4 ? 0.92 : 0.34,
    })),
  };
}

test("marks under-excited traces as insufficient", () => {
  const mechanism = getMechanismById("turret_position");
  const trace: NormalizedTrace = {
    setpoint: [
      { timeSec: 0, value: 0.01 },
      { timeSec: 1, value: 0.015 },
      { timeSec: 2, value: 0.018 },
    ],
    measurement: [
      { timeSec: 0, value: 0.01 },
      { timeSec: 1, value: 0.012 },
      { timeSec: 2, value: 0.014 },
    ],
    effort: [],
    feedforward: [],
    current: [],
    velocity: [],
  };

  const analysis = analyzeMechanismTrace(mechanism, trace);
  assert.equal(analysis.latestRun?.dataSufficient, false);
  assert.equal(analysis.overallScore, null);
});

test("suggests reducing P and increasing D on overshoot-heavy traces", () => {
  const mechanism = getMechanismById("shooter_velocity");
  const response = buildStepSeries(3000, [0, 0, 700, 1800, 3200, 3650, 3400, 3150, 3040, 3002, 3000, 3000], 0.1);
  const analysis = analyzeMechanismTrace(mechanism, {
    ...response,
    feedforward: [],
    current: [],
    velocity: [],
  });

  assert.equal(analysis.latestRun?.dataSufficient, true);
  const params = new Set(analysis.latestRun?.recommendations.map((item) => item.parameter));
  assert.ok(params.has("P"));
  assert.ok(params.has("D"));
});

test("calls out steady-state bias for feedforward review", () => {
  const mechanism = getMechanismById("climber_velocity");
  const response = buildStepSeries(1.2, [0, 0, 0.3, 0.5, 0.75, 0.88, 0.94, 0.97, 0.98, 0.99, 1.0, 1.0], 0.12);
  const analysis = analyzeMechanismTrace(mechanism, {
    ...response,
    feedforward: response.setpoint.map((sample) => ({ ...sample, value: 3.5 })),
    current: response.setpoint.map((sample) => ({ ...sample, value: 11 })),
    velocity: response.measurement,
  });

  const ffRecommendation = analysis.latestRun?.recommendations.find((item) => item.parameter === "FF");
  assert.ok(ffRecommendation);
  assert.equal(ffRecommendation?.direction, "review");
});
