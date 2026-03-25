import type { MechanismDefinition, MechanismGroup } from "./types";

function prefixed(candidateKeys: string[]) {
  return candidateKeys;
}

function wheelCandidates(portCandidates: readonly number[], suffixes: string[]) {
  return portCandidates.flatMap((port) =>
    suffixes.flatMap((suffix) => [`Wheels/${port}/${suffix}`, `wheels/${port}/${suffix}`]),
  );
}

const baseMechanisms: MechanismDefinition[] = [
  {
    id: "shooter_velocity",
    groupId: "shooter",
    label: "Shooter Velocity",
    description: "Monitors the main shooter flywheel loop with velocity, setpoint, and applied output traces.",
    loopType: "velocity",
    unit: "rpm",
    parameters: ["P", "I", "D", "FF"],
    supportsFeedforward: true,
    minimumAmplitude: 150,
    recommendedRunDurationSec: 1.5,
    signals: {
      setpoint: { label: "Requested velocity", candidateKeys: prefixed(["Shooter/RequestedVelocityRPM"]) },
      measurement: { label: "Measured velocity", candidateKeys: prefixed(["Shooter/VelocityRPM"]) },
      effort: { label: "Leader output", candidateKeys: prefixed(["Shooter/LeaderAppliedOutput"]) },
    },
  },
  {
    id: "turret_position",
    groupId: "turret",
    label: "Turret Position",
    description: "Tracks wrapped turret position requests against absolute position and motor effort.",
    loopType: "position",
    unit: "rot",
    parameters: ["P", "I", "D"],
    supportsFeedforward: false,
    minimumAmplitude: 0.02,
    recommendedRunDurationSec: 1.4,
    signals: {
      setpoint: { label: "Wrapped target", candidateKeys: prefixed(["Turret/DesiredWrappedOutputRot"]) },
      measurement: { label: "Measured position", candidateKeys: prefixed(["Turret/PositionRot"]) },
      effort: { label: "Applied output", candidateKeys: prefixed(["Turret/AppliedOutput"]) },
      current: { label: "Output current", candidateKeys: prefixed(["Turret/AppliedOutputWant"]) },
      velocity: { label: "Measured velocity", candidateKeys: prefixed(["Turret/Velocity"]) },
    },
  },
  {
    id: "intake_wrist_position",
    groupId: "intake",
    label: "Intake Wrist Position",
    description: "Reads the wrist position loop and highlights whether feedforward and damping look balanced.",
    loopType: "position",
    unit: "rot",
    parameters: ["P", "I", "D", "FF"],
    supportsFeedforward: true,
    minimumAmplitude: 0.015,
    recommendedRunDurationSec: 1.4,
    signals: {
      setpoint: { label: "Wrist setpoint", candidateKeys: prefixed(["IntakeSubsystem/WristSetpoint"]) },
      measurement: { label: "Wrist position", candidateKeys: prefixed(["IntakeSubsystem/WristPosition"]) },
      effort: { label: "Wrist applied output", candidateKeys: prefixed(["IntakeSubsystem/WristAppliedOutput"]) },
      feedforward: { label: "Wrist feedforward", candidateKeys: prefixed(["IntakeSubsystem/FeedForward"]) },
      current: { label: "Wrist current", candidateKeys: prefixed(["IntakeSubsystem/WristOutputCurrent"]) },
      velocity: { label: "Wrist velocity", candidateKeys: prefixed(["IntakeSubsystem/WristVelocityRotPerSec"]) },
    },
  },
  {
    id: "climber_height",
    groupId: "climber",
    label: "Climber Height",
    description: "Analyzes the closed-loop height controller with voltage, current, and ramped setpoint context.",
    loopType: "position",
    unit: "m",
    parameters: ["P", "I", "D", "FF"],
    supportsFeedforward: true,
    minimumAmplitude: 0.05,
    recommendedRunDurationSec: 1.8,
    signals: {
      setpoint: { label: "Ramped setpoint", candidateKeys: prefixed(["Climber/RampedSetpointMeters"]) },
      measurement: { label: "Measured height", candidateKeys: prefixed(["Climber/CurrentHeightMeters"]) },
      effort: { label: "Applied output", candidateKeys: prefixed(["Climber/AppliedOutput"]) },
      current: { label: "Output current", candidateKeys: prefixed(["Climber/OutputCurrentAmps", "Climber/OutputCurrent"]) },
      velocity: { label: "Measured velocity", candidateKeys: prefixed(["Climber/VelocityMetersPerSecond"]) },
      feedforward: { label: "Requested voltage", candidateKeys: prefixed(["Climber/RequestedVoltage"]) },
    },
  },
  {
    id: "climber_velocity",
    groupId: "climber",
    label: "Climber Velocity",
    description: "Looks at the velocity controller directly when climber motion is being commanded in speed mode.",
    loopType: "velocity",
    unit: "m/s",
    parameters: ["P", "I", "D", "FF"],
    supportsFeedforward: true,
    minimumAmplitude: 0.08,
    recommendedRunDurationSec: 1.2,
    signals: {
      setpoint: { label: "Velocity setpoint", candidateKeys: prefixed(["Climber/VelocitySetpointMetersPerSecond"]) },
      measurement: { label: "Measured velocity", candidateKeys: prefixed(["Climber/VelocityMetersPerSecond"]) },
      effort: { label: "Applied output", candidateKeys: prefixed(["Climber/AppliedOutput"]) },
      current: { label: "Output current", candidateKeys: prefixed(["Climber/OutputCurrentAmps", "Climber/OutputCurrent"]) },
      feedforward: { label: "Requested voltage", candidateKeys: prefixed(["Climber/RequestedVoltage"]) },
    },
  },
];

const SWERVE_PORTS = {
  front_left: [12, 7],
  front_right: [25, 13],
  rear_left: [21, 9],
  rear_right: [10, 11],
} as const;

const SWERVE_LABELS: Record<keyof typeof SWERVE_PORTS, string> = {
  front_left: "Front Left",
  front_right: "Front Right",
  rear_left: "Rear Left",
  rear_right: "Rear Right",
};

const swerveMechanisms: MechanismDefinition[] = (Object.keys(SWERVE_PORTS) as Array<
  keyof typeof SWERVE_PORTS
>).flatMap((moduleId) => {
  const portCandidates = SWERVE_PORTS[moduleId];
  const labelPrefix = SWERVE_LABELS[moduleId];

  return [
    {
      id: `swerve_drive_${moduleId}`,
      groupId: "swerve_drive",
      label: `${labelPrefix} Swerve Drive`,
      description: "Compares requested wheel speed against measured module speed for one module.",
      loopType: "velocity",
      unit: "m/s",
      parameters: ["P", "I", "D", "FF"],
      supportsFeedforward: true,
      minimumAmplitude: 0.25,
      recommendedRunDurationSec: 1.0,
      signals: {
        setpoint: {
          label: "Requested speed",
          candidateKeys: wheelCandidates(portCandidates, ["requested/speedMpsValue", "requestedMps"]),
        },
        measurement: {
          label: "Measured speed",
          candidateKeys: wheelCandidates(portCandidates, ["actual/speedMps", "currentSpeed"]),
        },
        effort: {
          label: "Drive effort",
          candidateKeys: wheelCandidates(portCandidates, ["driveOutput", "driveVoltage"]),
        },
        current: {
          label: "Drive current",
          candidateKeys: wheelCandidates(portCandidates, ["driveCurrentAmps"]),
        },
      },
    },
    {
      id: `swerve_turn_${moduleId}`,
      groupId: "swerve_turn",
      label: `${labelPrefix} Swerve Turn`,
      description: "Compares requested module angle against measured angle to expose turn-loop overshoot and bias.",
      loopType: "position",
      unit: "deg",
      parameters: ["P", "I", "D"],
      supportsFeedforward: false,
      minimumAmplitude: 5,
      recommendedRunDurationSec: 0.9,
      signals: {
        setpoint: {
          label: "Requested angle",
          candidateKeys: wheelCandidates(portCandidates, ["requested/angleDegValue", "requestedAngle"]),
        },
        measurement: {
          label: "Measured angle",
          candidateKeys: wheelCandidates(portCandidates, ["actual/angleDeg", "currentAngle"]),
        },
        effort: {
          label: "Turn effort",
          candidateKeys: wheelCandidates(portCandidates, ["turnOutput", "turnVoltage"]),
        },
        current: {
          label: "Turn current",
          candidateKeys: wheelCandidates(portCandidates, ["turnCurrentAmps"]),
        },
        velocity: {
          label: "Turn velocity",
          candidateKeys: wheelCandidates(portCandidates, ["turnEncoder/velocityRotPerSec"]),
        },
      },
    },
  ];
});

export const MECHANISMS: MechanismDefinition[] = [...baseMechanisms, ...swerveMechanisms];

export const MECHANISM_GROUPS: MechanismGroup[] = [
  {
    id: "shooter",
    label: "Shooter",
    description: "Velocity loops for the primary flywheel stage.",
    mechanismIds: ["shooter_velocity"],
  },
  {
    id: "turret",
    label: "Turret",
    description: "Wrapped position control for aiming.",
    mechanismIds: ["turret_position"],
  },
  {
    id: "intake",
    label: "Intake Wrist",
    description: "Position control with gravity compensation.",
    mechanismIds: ["intake_wrist_position"],
  },
  {
    id: "climber",
    label: "Climber",
    description: "Height and velocity loops for the elevator stage.",
    mechanismIds: ["climber_height", "climber_velocity"],
  },
  {
    id: "swerve_drive",
    label: "Swerve Drive",
    description: "Per-module wheel speed loops. Pick the module with the cleanest excitation trace.",
    mechanismIds: swerveMechanisms.filter((entry) => entry.groupId === "swerve_drive").map((entry) => entry.id),
  },
  {
    id: "swerve_turn",
    label: "Swerve Turn",
    description: "Per-module azimuth loops for angle tracking.",
    mechanismIds: swerveMechanisms.filter((entry) => entry.groupId === "swerve_turn").map((entry) => entry.id),
  },
];

export function getMechanismById(id: string): MechanismDefinition {
  const mechanism = MECHANISMS.find((entry) => entry.id === id);
  if (!mechanism) {
    throw new Error(`Unknown mechanism id: ${id}`);
  }
  return mechanism;
}

export function liveTopicPath(baseKey: string): string {
  return `/AdvantageKit/RealOutputs/${baseKey}`;
}
