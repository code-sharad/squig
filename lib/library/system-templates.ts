// ---------------------------------------------------------------------------
// Blueprints: a whole architecture as a fragment of ordinary nodes.
//
// A component that draws an architecture is one node, and detaching it hands
// you loose lines with their bindings gone, which is worse than useless on a
// connector. A blueprint instead goes through the builders in lib/doc, so its
// arrows are bound to the boxes they were built against and a person who
// drags a box afterwards pulls its connectors with it.
//
// Coordinates here are local, starting at the blueprint's own top left.
// `placeBlueprint` moves the fragment onto the sheet and mints its ids.
// ---------------------------------------------------------------------------

import { arrowNode, componentNode, docBounds, newId } from "../doc"
import { remapBinds } from "../canvas/arrow-binding"
import { nodeVisualBounds } from "../canvas/line-routing"
import type { ArrowAnchor, ComponentNode, GroupStyles, SquigNode } from "../types"

export interface BlueprintBuild {
  nodes: SquigNode[]
  groups: GroupStyles
}

export interface Blueprint {
  id: string
  title: string
  description: string
  /** nodes in local space, plus the group names they refer to by local id */
  build(): BlueprintBuild
}

// -- the grid ---------------------------------------------------------------
// One column and one row pitch for all four, because the numbers are what make
// a label fit: a connector has to be longer than the pad its word sits on, or
// the label hides itself (see localArrowLabelBox). The shelf's box is 168×72.

const COL = 240
const ROW = 168
/** How far a branch box sits off the line it branches from. */
const FAN = 120

/** The local name of the region every blueprint draws. Remapped per insertion. */
const REGION = "region"

/** One box off the systems shelf, at a local point, saying its own words. */
function box(kind: string, id: string, x: number, y: number, label: string, note?: string): ComponentNode {
  return componentNode(kind, { id, x, y, props: note ? { label, note } : { label } })
}

interface Wire {
  from: string
  to: string
  label: string
  anchors: [ArrowAnchor, ArrowAnchor]
  /** two connectors leaving one source would cross as straight lines */
  elbow?: boolean
}

function wire(from: string, to: string, label: string, anchors: [ArrowAnchor, ArrowAnchor]): Wire {
  return { from, to, label, anchors }
}

function branch(from: string, to: string, label: string, anchors: [ArrowAnchor, ArrowAnchor]): Wire {
  return { from, to, label, anchors, elbow: true }
}

/**
 * One blueprint assembled: the boxes, the connectors bound to them, and the
 * single named region its members sit in.
 *
 * The region is part of every blueprint rather than something the inserter adds
 * afterwards, because a boundary is a thing to notice. Landing beside boxes and
 * a dashed box around them teaches what one is without a word of explanation.
 */
function assemble(
  region: string,
  boxes: readonly ComponentNode[],
  members: readonly string[],
  wires: readonly Wire[]
): BlueprintBuild {
  const map = Object.fromEntries(boxes.map((b) => [b.id, b]))
  return {
    nodes: [
      ...boxes.map((b): SquigNode => (members.includes(b.id) ? { ...b, groupIds: [REGION] } : b)),
      ...wires.map((w) =>
        arrowNode(
          {
            from: w.from,
            to: w.to,
            label: w.label,
            anchors: w.anchors,
            ...(w.elbow ? { lineStyle: "elbow" as const } : {}),
          },
          map
        )
      ),
    ],
    groups: { [REGION]: { label: region } },
  }
}

// -- the four ---------------------------------------------------------------

export const BLUEPRINTS: Blueprint[] = [
  {
    id: "short-link",
    title: "Short link",
    description: "a gateway and a service, with a cache in front of its store",
    build: () =>
      assemble(
        "aws eu-west-1",
        [
          box("client", "browser", 0, 0, "Browser"),
          box("gateway", "gateway", COL, 0, "API gateway", "2 replicas"),
          box("server", "links", COL * 2, 0, "Links"),
          box("cache", "redis", COL * 2, ROW, "Redis", "session"),
          box("database", "postgres", COL * 2, ROW * 2, "Postgres", "primary"),
        ],
        ["gateway", "links", "redis", "postgres"],
        [
          wire("browser", "gateway", "HTTPS", ["right", "left"]),
          wire("gateway", "links", "POST", ["right", "left"]),
          wire("links", "redis", "read", ["bottom", "top"]),
          wire("redis", "postgres", "miss", ["bottom", "top"]),
        ]
      ),
  },
  {
    id: "chat",
    title: "Chat",
    description: "a topic fanning one write out to the sockets holding the connections",
    build: () =>
      assemble(
        "chat cluster",
        [
          box("client", "browser", 0, 0, "Browser"),
          box("server", "service", COL, 0, "Chat service"),
          box("topic", "topic", COL * 2, 0, "Pub/sub", "redis"),
          // the branch boxes sit either side of the topic's middle, so both
          // connectors get a run of their own to carry a word
          box("server", "socket-a", COL * 2 - FAN, ROW, "Socket 1"),
          box("server", "socket-b", COL * 2 + FAN, ROW, "Socket 2", "2 replicas"),
        ],
        ["service", "topic", "socket-a", "socket-b"],
        [
          wire("browser", "service", "send", ["right", "left"]),
          wire("service", "topic", "publish", ["right", "left"]),
          branch("topic", "socket-a", "push", ["bottom", "top"]),
          branch("topic", "socket-b", "push", ["bottom", "top"]),
        ]
      ),
  },
  {
    id: "rate-limiter",
    title: "Rate limiter",
    description: "a counter store in front of a service, checked at the edge",
    build: () =>
      assemble(
        "api tier",
        [
          box("client", "browser", 0, 0, "Browser"),
          box("gateway", "gateway", COL, 0, "API gateway", "100 rps"),
          box("server", "checkout", COL * 2, 0, "Checkout"),
          box("cache", "counter", COL, ROW, "Redis", "ttl 60s"),
        ],
        ["gateway", "checkout", "counter"],
        [
          wire("browser", "gateway", "request", ["right", "left"]),
          wire("gateway", "counter", "incr", ["bottom", "top"]),
          wire("gateway", "checkout", "allow", ["right", "left"]),
        ]
      ),
  },
  {
    id: "upload",
    title: "Upload",
    description: "a service writing to an object store and a queue, with a worker behind it",
    build: () =>
      assemble(
        "ingest",
        [
          box("client", "browser", 0, 0, "Browser"),
          box("server", "uploads", COL, 0, "Upload", "2 replicas"),
          box("object-store", "objects", COL * 2, -FAN, "Object store", "s3"),
          box("queue", "queue", COL, ROW, "Queue", "jobs"),
          box("worker", "worker", COL * 2, ROW, "Worker", "thumbnails"),
        ],
        ["uploads", "objects", "queue", "worker"],
        [
          wire("browser", "uploads", "upload", ["right", "left"]),
          branch("uploads", "objects", "put", ["right", "left"]),
          wire("uploads", "queue", "enqueue", ["bottom", "top"]),
          wire("queue", "worker", "pick up", ["right", "left"]),
        ]
      ),
  },
]

export function findBlueprint(id: string): Blueprint | undefined {
  return BLUEPRINTS.find((bp) => bp.id === id)
}

/**
 * How far a blueprint steps away from an occupied spot before trying again.
 *
 * More than the boundary's own padding on both sides, so two of them land
 * side by side with air between their regions rather than two dashed lines
 * sharing an edge.
 */
const CASCADE = 64

/** Whether two boxes share any area at all, edges touching included. */
function overlaps(
  a: { minX: number; minY: number; maxX: number; maxY: number },
  b: { minX: number; minY: number; maxX: number; maxY: number }
): boolean {
  return a.minX <= b.maxX && b.minX <= a.maxX && a.minY <= b.maxY && b.minY <= a.maxY
}

/**
 * A blueprint as the document will hold it: moved so its box centres on `at`,
 * with a fresh name for every node and for the region.
 *
 * The remap is here and nowhere else. Builders hand out readable local ids, so
 * two insertions would otherwise be one set of names twice, and the second
 * arrow would quietly land on the first blueprint's boxes.
 *
 * `occupied` is what is already on the sheet. A blueprint dropped exactly on
 * top of another is not two drawings, it is one mess, and the point of asking
 * for a second architecture is to hold it beside the first. So an occupied
 * spot cascades down and right until the drawing has a place of its own.
 */
export function placeBlueprint(bp: Blueprint, at: { x: number; y: number }, occupied: readonly SquigNode[] = []): BlueprintBuild {
  const { nodes, groups } = bp.build()
  // the box the drawing covers, its boundary's padding and all, since that is
  // the shape somebody sees and the thing to centre rather than the boxes alone
  const box = docBounds({
    fileName: "",
    nodes: Object.fromEntries(nodes.map((n) => [n.id, n])),
    order: nodes.map((n) => n.id),
    groups,
  })
  const dx = Math.round(box ? at.x - (box.minX + box.maxX) / 2 : at.x)
  const dy = Math.round(box ? at.y - (box.minY + box.maxY) / 2 : at.y)
  // a bounded walk, because a crowded sheet must not turn one insert into a
  // search: forty steps is far past anything a person would do by hand
  let step = 0
  const spot = (n: number) =>
    box
      ? { minX: box.minX + dx + n * CASCADE, minY: box.minY + dy + n * CASCADE, maxX: box.maxX + dx + n * CASCADE, maxY: box.maxY + dy + n * CASCADE }
      : null
  if (occupied.length) {
    const taken = occupied.map((n) => {
      const b = nodeVisualBounds(n)
      return { minX: b.x, minY: b.y, maxX: b.x + b.w, maxY: b.y + b.h }
    })
    while (step < 40 && (!spot(step) || taken.some((b) => overlaps(spot(step)!, b)))) step++
  }
  const shiftX = dx + step * CASCADE
  const shiftY = dy + step * CASCADE

  const idMap = new Map(nodes.map((n) => [n.id, newId()]))
  const groupMap = new Map(Object.keys(groups).map((id) => [id, newId()]))
  const placed = nodes.map(
    (n): SquigNode => ({
      ...n,
      id: idMap.get(n.id)!,
      x: n.x + shiftX,
      y: n.y + shiftY,
      ...(n.groupIds ? { groupIds: n.groupIds.map((id) => groupMap.get(id)!) } : {}),
    })
  )
  // the same pass a paste makes, for the same reason: an arrow rides along with
  // the boxes it names instead of staying tethered to the ones on the sheet
  remapBinds(placed, idMap)
  return {
    nodes: placed,
    groups: Object.fromEntries(Object.entries(groups).map(([id, style]) => [groupMap.get(id)!, style])),
  }
}
