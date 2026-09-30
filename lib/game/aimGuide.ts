import { PHYSICS } from "./constants";
import type { BallisticResult, TrajectoryPoint } from "./types";

/** A readable slice of the real shot. The first contact, including a bounce, ends the guide. */
export function aimGuidePoints(
  result: BallisticResult,
  power: number,
  charging: boolean,
  extended = false,
): TrajectoryPoint[] {
  const firstContact = result.bounces?.[0] ?? result.impact.point;
  const duration = charging
    ? 0.3 + Math.max(0, Math.min(1, power / 100)) * (extended ? 1.55 : 1.3)
    : extended
      ? 0.67
      : 0.52;
  const lastTime = Math.min(duration, firstContact.time - PHYSICS.dt);
  const end = Math.max(
    1,
    Math.min(result.points.length - 1, Math.floor(lastTime / PHYSICS.dt)),
  );
  const stride = Math.max(1, Math.ceil(end / 34));
  const sampled: TrajectoryPoint[] = [result.points[0]];
  for (let i = stride; i < end; i += stride) sampled.push(result.points[i]);
  sampled.push(result.points[end]);
  return sampled;
}
