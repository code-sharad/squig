import { rotatedBounds } from "./rotation"
// ---------------------------------------------------------------------------
// Connector routing — pure geometry shared by drawing, hit testing and the
// on-canvas adjustment handles.
//
// Endpoints remain the document's source of truth. Elbows and curves are a
// view over those points plus small, relative adjustments, so bindings can
// keep moving endpoints without having to own a second path model.
// ---------------------------------------------------------------------------

import type { ArrowAnchor, ArrowNode, LineStyle, SquigNode } from "../types"
import { normalizeLineStyle } from "../types"
import { labelPadBox } from "../sketch/labels"
import { mirrorPoint } from "./transform"

export type LinePoint = [number, number]
type RouteAxis = "x" | "y"

interface ElbowHandle {
  kind: "elbow"
  /** coordinate the drag changes; x means a vertical segment */
  axis: RouteAxis
  /** route orientation to lock in once the automatic route is reshaped */
  routeAxis: RouteAxis
  point: LinePoint
  segment: [LinePoint, LinePoint]
  offset: LinePoint
}

interface CurveHandle {
  kind: "curved"
  point: LinePoint
  offset: LinePoint
}

export type RouteHandle = ElbowHandle | CurveHandle

export type LocalArrowRoute =
  | { kind: "polyline"; style: "straight" | "elbow"; points: LinePoint[]; handle?: ElbowHandle }
  | { kind: "curve"; style: "curved"; start: LinePoint; control: LinePoint; end: LinePoint; handle: CurveHandle }

const EPS = 1e-6
const OUTSIDE_LEAD = 28

/**
 * A connector's word is set at one size so labels agree on every arrow, and
 * the pad is measured from an em-ratio guess. Erring wide is deliberate: too
 * wide only hides a little more line, too narrow reads as a broken render.
 */
export const ARROW_LABEL_SIZE = 11

const midpoint = (a: LinePoint, b: LinePoint): LinePoint => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]

export function lineStyleOf(n: ArrowNode): LineStyle {
  return normalizeLineStyle(n.lineStyle)
}

const anchorAxis = (a: ArrowAnchor | null | undefined): RouteAxis | null => {
  if (a === "left" || a === "right") return "x"
  if (a === "top" || a === "bottom") return "y"
  return null
}

/** The automatic H-V-H / V-H-V choice before a person takes hold of it. */
function automaticElbowAxis(n: ArrowNode): RouteAxis {
  if (n.elbowAxis === "x" || n.elbowAxis === "y") return n.elbowAxis
  const a = anchorAxis(n.anchors?.[0])
  const b = anchorAxis(n.anchors?.[1])
  if (a && a === b) return a
  if (a) return a
  if (b) return b
  const [p0, p1] = n.points
  return Math.abs(p1[0] - p0[0]) >= Math.abs(p1[1] - p0[1]) ? "x" : "y"
}

/**
 * Put parallel anchors that face the same way outside both endpoints. This is
 * the small piece of obstacle-aware routing that stops right-to-right and
 * top-to-top connectors from immediately folding back through their boxes.
 */
function automaticElbowCoordinate(n: ArrowNode, axis: RouteAxis, a: number, b: number): number {
  const aa = n.anchors?.[0]
  const bb = n.anchors?.[1]
  if (axis === "x" && aa === bb) {
    if (aa === "right") return Math.max(a, b) + OUTSIDE_LEAD
    if (aa === "left") return Math.min(a, b) - OUTSIDE_LEAD
  }
  if (axis === "y" && aa === bb) {
    if (aa === "bottom") return Math.max(a, b) + OUTSIDE_LEAD
    if (aa === "top") return Math.min(a, b) - OUTSIDE_LEAD
  }
  return (a + b) / 2
}

function samePoint(a: LinePoint, b: LinePoint): boolean {
  return Math.abs(a[0] - b[0]) < EPS && Math.abs(a[1] - b[1]) < EPS
}

function withoutDuplicatePoints(points: LinePoint[]): LinePoint[] {
  return points.filter((p, i) => i === 0 || !samePoint(p, points[i - 1]))
}

function elbowRoute(n: ArrowNode): Extract<LocalArrowRoute, { kind: "polyline" }> {
  const [p0, p1] = n.points
  const chosen = automaticElbowAxis(n)
  const offset = n.elbowOffset ?? [0, 0]

  if (chosen === "x") {
    const x = automaticElbowCoordinate(n, "x", p0[0], p1[0]) + offset[0]
    const a: LinePoint = [x, p0[1]]
    const b: LinePoint = [x, p1[1]]

    // A perfectly horizontal automatic route has no vertical segment to pull.
    // Offer the line itself instead; dragging it vertically switches to a
    // V-H-V dogleg and gives the gesture somewhere honest to go.
    if (Math.abs(p0[1] - p1[1]) < EPS) {
      const point = midpoint(p0, p1)
      return {
        kind: "polyline",
        style: "elbow",
        points: withoutDuplicatePoints([p0, a, b, p1]),
        handle: { kind: "elbow", axis: "y", routeAxis: "y", point, segment: [p0, p1], offset },
      }
    }

    return {
      kind: "polyline",
      style: "elbow",
      points: withoutDuplicatePoints([p0, a, b, p1]),
      handle: { kind: "elbow", axis: "x", routeAxis: "x", point: midpoint(a, b), segment: [a, b], offset },
    }
  }

  const y = automaticElbowCoordinate(n, "y", p0[1], p1[1]) + offset[1]
  const a: LinePoint = [p0[0], y]
  const b: LinePoint = [p1[0], y]
  if (Math.abs(p0[0] - p1[0]) < EPS) {
    const point = midpoint(p0, p1)
    return {
      kind: "polyline",
      style: "elbow",
      points: withoutDuplicatePoints([p0, a, b, p1]),
      handle: { kind: "elbow", axis: "x", routeAxis: "x", point, segment: [p0, p1], offset },
    }
  }
  return {
    kind: "polyline",
    style: "elbow",
    points: withoutDuplicatePoints([p0, a, b, p1]),
    handle: { kind: "elbow", axis: "y", routeAxis: "y", point: midpoint(a, b), segment: [a, b], offset },
  }
}

/** A stable, visible automatic bow. Reversing the endpoints keeps its side. */
function automaticCurveBend(a: LinePoint, b: LinePoint): LinePoint {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const d = Math.hypot(dx, dy)
  if (d < EPS) return [0, -12]
  let nx = -dy / d
  let ny = dx / d
  // Canonicalise the normal toward the top (or right for a vertical tie), so
  // drawing the same connector in the opposite direction doesn't flip its bow.
  if (ny > 0 || (Math.abs(ny) < EPS && nx < 0)) {
    nx = -nx
    ny = -ny
  }
  const amount = Math.min(56, Math.max(12, d * 0.16))
  return [nx * amount, ny * amount]
}

function curveRoute(n: ArrowNode): Extract<LocalArrowRoute, { kind: "curve" }> {
  const [start, end] = n.points
  const mid = midpoint(start, end)
  const offset = n.curveBend ?? automaticCurveBend(start, end)
  const handle: LinePoint = [mid[0] + offset[0], mid[1] + offset[1]]
  // A quadratic reaches (start + 2*control + end) / 4 at t=.5. Solving for
  // control makes the draggable dot sit on the curve instead of beside it.
  const control: LinePoint = [mid[0] + offset[0] * 2, mid[1] + offset[1] * 2]
  return { kind: "curve", style: "curved", start, control, end, handle: { kind: "curved", point: handle, offset } }
}

export function localArrowRoute(n: ArrowNode): LocalArrowRoute {
  const style = lineStyleOf(n)
  if (style === "elbow") return elbowRoute(n)
  if (style === "curved") return curveRoute(n)
  return { kind: "polyline", style: "straight", points: [...n.points] }
}

/** End direction used to rotate the arrowhead along the final routed run. */
export function localRouteEndTangent(route: LocalArrowRoute): LinePoint {
  if (route.kind === "curve") {
    const tangent: LinePoint = [route.end[0] - route.control[0], route.end[1] - route.control[1]]
    if (Math.hypot(...tangent) > EPS) return tangent
    return [route.end[0] - route.start[0], route.end[1] - route.start[1]]
  }
  const end = route.points[route.points.length - 1]
  for (let i = route.points.length - 2; i >= 0; i--) {
    const tangent: LinePoint = [end[0] - route.points[i][0], end[1] - route.points[i][1]]
    if (Math.hypot(...tangent) > EPS) return tangent
  }
  return [1, 0]
}

function polylineLength(points: readonly LinePoint[]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1])
  }
  return total
}

/** Sampled, because a quadratic's exact arc length buys nothing a word needs. */
function curveLength(start: LinePoint, control: LinePoint, end: LinePoint): number {
  const steps = 16
  let total = 0
  let previous = start
  for (let i = 1; i <= steps; i++) {
    const point = quadraticPoint(start, control, end, i / steps)
    total += Math.hypot(point[0] - previous[0], point[1] - previous[1])
    previous = point
  }
  return total
}

function routeLength(route: LocalArrowRoute): number {
  return route.kind === "curve"
    ? curveLength(route.start, route.control, route.end)
    : polylineLength(route.points)
}

/**
 * The point halfway along the drawn route, in local node space.
 *
 * Half the drawn length rather than the middle vertex: a symmetric dogleg puts
 * its centre on the middle run, while a straight line with a bend near one end
 * would otherwise carry its label near that bend.
 */
export function localRouteMidpoint(route: LocalArrowRoute): LinePoint {
  if (route.kind === "curve") return quadraticPoint(route.start, route.control, route.end, 0.5)
  const total = polylineLength(route.points)
  let walked = 0
  for (let i = 1; i < route.points.length; i++) {
    const a = route.points[i - 1]
    const b = route.points[i]
    const run = Math.hypot(b[0] - a[0], b[1] - a[1])
    if (run > EPS && walked + run >= total / 2) {
      const t = (total / 2 - walked) / run
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
    }
    walked += run
  }
  return route.points[route.points.length - 1]
}

/**
 * The paper pad behind a connector's word, in local node space, or null when
 * there is no word or the run is too short to carry one.
 *
 * A word hanging off a stub is worse than no word, so the pad's width is also
 * what decides whether there is room at all.
 */
export function localArrowLabelBox(
  route: LocalArrowRoute,
  label: string | undefined
): { x: number; y: number; w: number; h: number } | null {
  if (!label) return null
  const [mx, my] = localRouteMidpoint(route)
  // the pad is the same one a boundary's edge label sits on, so a line and a
  // region break for their words in the same way
  const pad = labelPadBox(label, ARROW_LABEL_SIZE, { cx: mx, cy: my })
  // a word longer than the line it belongs to is not a label, it's a caption
  // the route has no room for
  if (routeLength(route) < pad.w) return null
  return pad
}

function localToWorld(n: ArrowNode, p: LinePoint): LinePoint {
  return mirrorPoint(n, n.x + p[0], n.y + p[1])
}

/** A polyline approximation in world space, for hit tests and visual bounds. */
function quadraticPoint(
  start: LinePoint,
  control: LinePoint,
  end: LinePoint,
  t: number
): LinePoint {
  const mt = 1 - t
  return [
    mt * mt * start[0] + 2 * mt * t * control[0] + t * t * end[0],
    mt * mt * start[1] + 2 * mt * t * control[1] + t * t * end[1],
  ]
}

export function sampleArrowRoute(n: ArrowNode, curveSteps?: number): LinePoint[] {
  const route = localArrowRoute(n)
  if (route.kind === "polyline") return route.points.map((p) => localToWorld(n, p))
  // Twenty-four runs are plenty for the automatic bow. A hand can pull the
  // midpoint arbitrarily far away, though, and a fixed count then leaves wide
  // chords that miss both pointer hit tests and marquee intersections. Scale
  // by the square root of the bend (quadratic chord error falls with n²), with
  // a guardrail so one wild connector cannot monopolise a pointer frame.
  const steps = curveSteps === undefined
    ? Math.min(256, Math.max(24, Math.ceil(Math.sqrt(Math.hypot(...route.handle.offset) / 0.5))))
    : Math.max(1, Math.floor(curveSteps))
  const out: LinePoint[] = []
  for (let i = 0; i <= steps; i++) {
    out.push(localToWorld(n, quadraticPoint(route.start, route.control, route.end, i / steps)))
  }
  return out
}

export interface RouteBounds { x: number; y: number; w: number; h: number }

export function arrowRouteBounds(n: ArrowNode): RouteBounds {
  const route = localArrowRoute(n)
  let local: LinePoint[]
  if (route.kind === "polyline") {
    local = route.points
  } else {
    // A quadratic can reach an axis extreme between any two samples. Solve
    // those extrema exactly so viewport fitting and culling never shave off a
    // bend just because its t value happened to fall between sample steps.
    const ts = new Set([0, 1])
    for (const axis of [0, 1] as const) {
      const denominator = route.start[axis] - 2 * route.control[axis] + route.end[axis]
      if (Math.abs(denominator) < EPS) continue
      const t = (route.start[axis] - route.control[axis]) / denominator
      if (t > 0 && t < 1) ts.add(t)
    }
    local = [...ts].map((t) => quadraticPoint(route.start, route.control, route.end, t))
  }
  const points = local.map((p) => localToWorld(n, p))
  // a long word on a short connector reaches wider than the route itself, so
  // the pad belongs in the box an export is cropped to
  const pad = localArrowLabelBox(route, n.label)
  if (pad) {
    const corners: LinePoint[] = [
      [pad.x, pad.y],
      [pad.x + pad.w, pad.y],
      [pad.x, pad.y + pad.h],
      [pad.x + pad.w, pad.y + pad.h],
    ]
    for (const corner of corners) points.push(localToWorld(n, corner))
  }
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const [x, y] of points) {
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}

/** The box occupied by what a node actually draws, including routed bends. */
export function nodeVisualBounds(n: SquigNode): RouteBounds {
  return n.type === "arrow" ? arrowRouteBounds(n) : rotatedBounds(n)
}

/** Route handle and segment in world coordinates for the selection overlay. */
export function worldRouteHandle(n: ArrowNode): RouteHandle | null {
  const route = localArrowRoute(n)
  if (!route.handle) return null
  if (route.handle.kind === "curved") {
    return { ...route.handle, point: localToWorld(n, route.handle.point) }
  }
  return {
    ...route.handle,
    point: localToWorld(n, route.handle.point),
    segment: [localToWorld(n, route.handle.segment[0]), localToWorld(n, route.handle.segment[1])],
  }
}
