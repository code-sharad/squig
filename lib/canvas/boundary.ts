// ---------------------------------------------------------------------------
// A boundary is a group with a name, and its box is never stored.
//
// A group is a shared path in `groupIds`, so the only thing a named boundary
// adds to a document is a `GroupStyle`. Where the box is follows from the
// members, the way a bound arrow's route follows from its targets: move a
// member and the boundary redraws around it. That is what keeps a group's
// membership and its region from disagreeing.
//
// Pure geometry plus prims, so the canvas and the exporter draw the same
// boundary from the same numbers.
// ---------------------------------------------------------------------------

import { unionBox, type GroupStyle, type GroupStyles, type SquigNode } from "../types"
import { nodeVisualBounds } from "./line-routing"
import { HAND, textWidth, type Prim } from "../sketch/kit"
import { labelPadBox, labelPadPrims } from "../sketch/labels"

/** Breathing room between the members and the dashed line, in world units. */
export const BOUNDARY_PAD = 24
/** One size for every boundary name, so two regions read as one system. */
export const BOUNDARY_LABEL_SIZE = 11
/** How far the name sits from the box's edge when it prints inside. */
const LABEL_INSET = 14
const LABEL_TOP = 10
const CORNER = 6
/** PEN_SCALE.light in lib/sketch/node-prims: a hairline, under the content. */
const LIGHT_PEN = 0.65
/** Baseline from the top of a line box, as a multiple of the size. */
const BASELINE = 1

export interface Boundary {
  groupId: string
  style: GroupStyle
  /** the padded box, in world units */
  x: number
  y: number
  w: number
  h: number
  /** index of the group within `groupIds`; 0 is outermost */
  depth: number
  seed: number
}

/**
 * The wobble seed for a group's boundary, derived from its id rather than
 * drawn at random. A boundary is redrawn on every frame and in every export,
 * and a fresh seed each time would re-roll the dashes, so the region would
 * look like a different one in each picture of it.
 */
export function boundarySeed(groupId: string): number {
  // FNV-1a, folded to the range the rest of the document's seeds live in
  let hash = 2166136261
  for (let i = 0; i < groupId.length; i++) {
    hash ^= groupId.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) % 2 ** 31 || 1
}

/**
 * The boundaries to draw, outermost first.
 *
 * Members are every node carrying the group id at any depth, so an outer
 * boundary wraps the groups inside it. Depth is where the id sits within
 * `groupIds`; ties keep document order, which is the order the nodes arrived
 * in. A record whose group has no members is skipped, so a name left behind by
 * a group that dissolved draws no ghost.
 */
export function boundaryList(nodes: readonly SquigNode[], groups: GroupStyles | undefined): Boundary[] {
  if (!groups) return []
  const found = new Map<string, Boundary>()
  for (const node of nodes) {
    const path = node.groupIds ?? []
    for (let depth = 0; depth < path.length; depth++) {
      const groupId = path[depth]
      if (found.has(groupId)) continue
      const style = groups[groupId]
      if (!style) continue
      const members = nodes.filter((n) => n.groupIds?.includes(groupId))
      const box = unionBox(members.map(nodeVisualBounds))
      if (!box) continue
      found.set(groupId, {
        groupId,
        style,
        x: box.minX - BOUNDARY_PAD,
        y: box.minY - BOUNDARY_PAD,
        w: box.maxX - box.minX + BOUNDARY_PAD * 2,
        h: box.maxY - box.minY + BOUNDARY_PAD * 2,
        depth,
        seed: boundarySeed(groupId),
      })
    }
  }
  // a stable sort: same-depth regions print in document order
  return [...found.values()].sort((a, b) => a.depth - b.depth)
}

/** The boundary's marks, in its own coordinates: a dashed box and its name. */
export function boundaryPrims(style: GroupStyle, w: number, h: number): Prim[] {
  const size = BOUNDARY_LABEL_SIZE
  const at = style.at ?? "inside-left"
  const out: Prim[] = [
    {
      t: "rect",
      x: 0,
      y: 0,
      w,
      h,
      r: CORNER,
      o: { stroke: "faint", strokeWidth: HAND.strokeWidth * LIGHT_PEN, dashed: true },
    },
  ]

  if (at === "edge-left" || at === "edge-center" || at === "edge-right") {
    // the words are centred on the top edge; the pad breaks the dashed line
    const text = textWidth(style.label, size)
    const cx =
      at === "edge-left" ? LABEL_INSET + text / 2 : at === "edge-right" ? w - LABEL_INSET - text / 2 : w / 2
    out.push(...labelPadPrims(labelPadBox(style.label, size, { cx, cy: 0 }), style.label, size, "muted"))
    return out
  }

  const align = at === "inside-center" ? "center" : at === "inside-right" ? "right" : "left"
  out.push({
    t: "text",
    x: at === "inside-center" ? w / 2 : at === "inside-right" ? w - LABEL_INSET : LABEL_INSET,
    y: LABEL_TOP + size * BASELINE,
    text: style.label,
    size,
    align,
    color: "muted",
  })
  return out
}
