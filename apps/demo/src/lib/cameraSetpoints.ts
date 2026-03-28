export interface CameraSetpoint {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

export const CAMERA_SETPOINTS: Record<string, CameraSetpoint> = {
  overview:  { position: [1.38, 0.45, 1.38], target: [0, 0.25, 0.0],  fov: 50 },
  intake:    { position: [0.23, 0.25, 1.23], target: [0, 0.15, 0.3],  fov: 50 },
  vision:    { position: [3.5,  2.5,  3.5],  target: [0, 0.0,  0.0],  fov: 45 },
  climber:   { position: [0.8,  1.1, -0.6],  target: [0, 0.35, -0.3], fov: 55 },
  // Drive tab: full-field overhead view — robot drives the neutral zone oval
  drive:     { position: [0.0, 10.0, 4.0],   target: [0, 0.0,  0.0],  fov: 55 },
  dashboard: { position: [1.38, 0.45, 1.38], target: [0, 0.25, 0.0],  fov: 50 },
  team:      { position: [1.38, 0.45, 1.38], target: [0, 0.25, 0.0],  fov: 50 },
};
