export const compactQuery = '(max-width: 760px), (max-height: 600px) and (pointer: coarse)';
export function initialNoteId(compact, hash, selected) {
  return hash || selected || (compact ? null : '/investor/index.md');
}
export function fittedDistance(radius, aspect, verticalFov) {
  const halfVertical = verticalFov * Math.PI / 360;
  const halfHorizontal = Math.atan(Math.tan(halfVertical) * Math.max(0.1, aspect));
  return Math.max(80, radius * 1.12 / Math.sin(Math.min(halfVertical, halfHorizontal)));
}
export function nearestTap(points, x, y, tolerance = 24) {
  let closest = null, distance = tolerance;
  for (const point of points) {
    if (point.z < -1 || point.z > 1) continue;
    const candidate = Math.hypot(point.x - x, point.y - y);
    if (candidate < distance) { closest = point.id; distance = candidate; }
  }
  return closest;
}
export function isTap(start, end, wasMultitouch) {
  return Boolean(start) && !wasMultitouch && Math.hypot(end.x - start.x, end.y - start.y) < 10;
}
