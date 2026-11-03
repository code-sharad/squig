// ---------------------------------------------------------------------------
// The systems shelf: one family of symbols for drawing an architecture rather
// than a screen. No box, no frame: a system diagram is a symbol with its name
// underneath, and a frame around every item only ever meant "this is a
// component of some kind", which the drawing already says.
//
// The glyphs are prims on purpose. A crisp Phosphor path inside a wobbling
// outline looks like a rendering fault, which is the one thing this shelf
// cannot afford when its whole job is to look hand-drawn at a glance.
// ---------------------------------------------------------------------------

import type { Prim, PrimOpts } from "@/lib/sketch/kit"
import { rect, ellipse, line, poly, text, place, truncate } from "@/lib/sketch/kit"
import type { ComponentDef, Props } from "./registry"

// -- the numbers ------------------------------------------------------------
// One place, because these twenty-two have to keep matching when one changes.

const SIZE = { w: 120, h: 96 }
/**
 * The symbol square, and how far below the item's top it starts.
 *
 * The band from 4 to 56 has to straddle the item's half height, 48, because a
 * connector binds to the bounding box and a horizontal arrow lands at mid
 * height. If the band did not reach that far every arrow in a blueprint would
 * point at the name instead of the symbol.
 */
const SYMBOL = 52
const SYMBOL_TOP = 4
/** The square every glyph below is authored in, so one factor scales them all. */
const GLYPH_BOX = 22
/** Air either side of the words. */
const SIDE = 8
const NAME_SIZE = 14
const NOTE_SIZE = 11
/** Baselines below the symbol's bottom edge: the name, then the note under it. */
const NAME_LIFT = 16
const NOTE_STEP = 14
/** The contour, and the weight one step down for detail the shape doesn't need. */
const LINE = 2.2
const DETAIL = 1.5

const str = (p: Props, k: string, fallback = ""): string => String(p[k] ?? fallback)

// -- drawing aids -----------------------------------------------------------

const dot = (cx: number, cy: number, r = 1.2, o?: PrimOpts): Prim =>
  ellipse(cx - r, cy - r, r * 2, r * 2, { fill: "solid", fillColor: "ink", strokeWidth: 0.9, ...o })

/** The kit has no curve constructor; the stream is the one mark that wants one. */
const wave = (y: number): Prim[] => [
  { t: "curve", x1: 1, y1: y, cx: 6, cy: y - 4.5, x2: 11, y2: y, o: { strokeWidth: LINE } },
  { t: "curve", x1: 11, y1: y, cx: 16, cy: y + 4.5, x2: 21, y2: y, o: { strokeWidth: LINE } },
]

/**
 * A glyph's geometry drawn at the symbol's size.
 *
 * The pen is left alone deliberately. A strokeWidth tuned as a hairline in a
 * 22 unit square would print as a 3.5 unit slab at 52, which is a heavier
 * drawing rather than a bigger one, so only the marks grow and the two weights
 * above stay the shelf's own.
 */
function scaleGlyph(prims: Prim[], k = SYMBOL / GLYPH_BOX): Prim[] {
  return prims.map((p): Prim => {
    switch (p.t) {
      case "rect":
        return { ...p, x: p.x * k, y: p.y * k, w: p.w * k, h: p.h * k, ...(p.r === undefined ? {} : { r: p.r * k }) }
      case "ellipse":
        return { ...p, x: p.x * k, y: p.y * k, w: p.w * k, h: p.h * k }
      case "line":
        return { ...p, x1: p.x1 * k, y1: p.y1 * k, x2: p.x2 * k, y2: p.y2 * k }
      case "curve":
        return { ...p, x1: p.x1 * k, y1: p.y1 * k, cx: p.cx * k, cy: p.cy * k, x2: p.x2 * k, y2: p.y2 * k }
      case "poly":
        return { ...p, pts: p.pts.map(([x, y]) => [x * k, y * k] as [number, number]) }
      case "text":
        return { ...p, x: p.x * k, y: p.y * k, size: p.size * k }
      case "path":
        return { ...p, x: p.x * k, y: p.y * k, size: p.size * k }
    }
  })
}

// -- glyphs -----------------------------------------------------------------
// Each lives in the 22 unit square GLYPH_BOX names, and none of them draws its
// own frame: the item has none to sit in.

const serverGlyph: Prim[] = [
  rect(1, 2, 20, 8, { r: 1.5, strokeWidth: LINE }),
  rect(1, 12, 20, 8, { r: 1.5, strokeWidth: LINE }),
  line(4.5, 6, 9, 6, { strokeWidth: DETAIL }),
  line(4.5, 16, 9, 16, { strokeWidth: DETAIL }),
  dot(17.5, 6, 1.1),
  dot(17.5, 16, 1.1),
]

/**
 * A cylinder: a rim, two sides, and the floor curving away under them.
 *
 * The floor is a single front arc rather than an ellipse. At 52 a full ring
 * meets the two sides in a little spur at each corner, which reads as a slip
 * of the pen rather than a shape.
 */
const databaseGlyph: Prim[] = [
  ellipse(3, 1, 16, 6, { strokeWidth: LINE }),
  line(3, 4, 3, 18, { strokeWidth: LINE }),
  line(19, 4, 19, 18, { strokeWidth: LINE }),
  { t: "curve", x1: 3, y1: 18, cx: 11, cy: 24, x2: 19, y2: 18, o: { strokeWidth: DETAIL } },
]

const cacheGlyph: Prim[] = [
  ellipse(2, 2, 18, 5, { strokeWidth: LINE }),
  ellipse(2, 8.5, 18, 5, { strokeWidth: LINE }),
  ellipse(2, 15, 18, 5, { strokeWidth: LINE }),
]

/**
 * Work waiting its turn: three items in a line, and an arrow arriving at them.
 *
 * The bars alone read as a menu at any size. The arrow is what makes it a
 * queue rather than a list, and it earns its few units at 52.
 */
const queueGlyph: Prim[] = [
  line(1, 11, 4.6, 11, { strokeWidth: DETAIL }),
  poly([[3.4, 9.5], [4.9, 11], [3.4, 12.5]], false, { strokeWidth: DETAIL }),
  rect(6.6, 2.5, 13.4, 4.2, { r: 1.2, strokeWidth: LINE }),
  rect(6.6, 8.9, 13.4, 4.2, { r: 1.2, strokeWidth: LINE }),
  rect(6.6, 15.3, 13.4, 4.2, { r: 1.2, strokeWidth: LINE }),
]

/**
 * Broadcast: one writer, two waves on their way out.
 *
 * Concentric rings read as a target, or as a record, at 52. Waves leaving a
 * single dot say the fan-out the word means.
 */
const topicGlyph: Prim[] = [
  dot(3, 11, 1.5),
  { t: "curve", x1: 6.2, y1: 6.8, cx: 11.8, cy: 11, x2: 6.2, y2: 15.2, o: { strokeWidth: LINE } },
  { t: "curve", x1: 10.4, y1: 3.2, cx: 20.8, cy: 11, x2: 10.4, y2: 18.8, o: { strokeWidth: DETAIL } },
]

/** A cog: a rim, a hub, and eight teeth. */
const workerGlyph: Prim[] = [
  ellipse(3.5, 3.5, 15, 15, { strokeWidth: LINE }),
  ellipse(7.5, 7.5, 7, 7, { strokeWidth: DETAIL }),
  ...Array.from({ length: 8 }, (_, i): Prim => {
    const a = (i * Math.PI) / 4
    return line(
      11 + Math.cos(a) * 7.5,
      11 + Math.sin(a) * 7.5,
      11 + Math.cos(a) * 10,
      11 + Math.sin(a) * 10,
      { strokeWidth: LINE }
    )
  }),
]

/** One way in, three ways out. */
const loadBalancerGlyph: Prim[] = [
  dot(3, 11, 2.1),
  line(5, 11, 20.5, 3, { strokeWidth: LINE }),
  line(5, 11, 20.5, 11, { strokeWidth: LINE }),
  line(5, 11, 20.5, 19, { strokeWidth: LINE }),
]

/** An arch over a threshold: the opening you go through, not a door with a handle. */
const gatewayGlyph: Prim[] = [
  poly(
    [[2.5, 20.5], [2.5, 12], [3.5, 7.5], [6.5, 4], [11, 2.8], [15.5, 4], [18.5, 7.5], [19.5, 12], [19.5, 20.5]],
    false,
    { strokeWidth: LINE }
  ),
  line(1, 20.5, 21, 20.5, { strokeWidth: DETAIL }),
]

const cdnGlyph: Prim[] = [
  ellipse(2, 2, 18, 18, { strokeWidth: LINE }),
  ellipse(7, 2, 8, 18, { strokeWidth: DETAIL }),
  line(2, 11, 20, 11, { strokeWidth: DETAIL }),
]

const objectStoreGlyph: Prim[] = [
  poly([[3, 4], [19, 4], [16.5, 20.5], [5.5, 20.5]], true, { strokeWidth: LINE }),
  ellipse(3, 1.5, 16, 4.5, { strokeWidth: LINE }),
]

const clientGlyph: Prim[] = [
  rect(3, 2.5, 16, 11, { r: 1.5, strokeWidth: LINE }),
  poly([[1, 17], [21, 17], [18.5, 19.5], [3.5, 19.5]], true, { strokeWidth: LINE }),
]

/**
 * An arrow through a wall: the one thing on the shelf that isn't ours. The wall
 * is dashed rather than the item framed, because the glyph carries the meaning
 * and a second dashed box around the words says it twice.
 */
const externalGlyph: Prim[] = [
  rect(2, 10, 9, 9, { r: 1, strokeWidth: LINE, dashed: true }),
  line(6, 16, 19, 3, { strokeWidth: LINE }),
  line(19, 3, 14.2, 4.3, { strokeWidth: LINE }),
  line(19, 3, 17.7, 7.8, { strokeWidth: LINE }),
]

/** Two stages and the hand-off between them; three boxes at this size read as dots. */
const pipelineGlyph: Prim[] = [
  rect(1, 7, 7, 9, { r: 1, strokeWidth: LINE }),
  rect(14, 7, 7, 9, { r: 1, strokeWidth: LINE }),
  line(8, 11.5, 13.5, 11.5, { strokeWidth: LINE }),
  line(13.5, 11.5, 11.2, 9.8, { strokeWidth: DETAIL }),
  line(13.5, 11.5, 11.2, 13.2, { strokeWidth: DETAIL }),
]

const cronGlyph: Prim[] = [
  ellipse(2, 2, 18, 18, { strokeWidth: LINE }),
  line(11, 11, 11, 5.5, { strokeWidth: LINE }),
  line(11, 11, 15, 13, { strokeWidth: DETAIL }),
]

const streamGlyph: Prim[] = [...wave(5), ...wave(11), ...wave(17)]

/** A rack: two posts and the shelves between them. */
/**
 * A building: a pitched roof over a body with a door.
 *
 * The shelves it replaced read as a ladder, which is the one thing a data
 * warehouse is not.
 */
const warehouseGlyph: Prim[] = [
  poly([[1, 9], [11, 2], [21, 9]], false, { strokeWidth: LINE }),
  poly([[2.4, 9], [2.4, 20.5], [19.6, 20.5], [19.6, 9]], false, { strokeWidth: LINE }),
  rect(9, 14, 4, 6.5, { r: 0.8, strokeWidth: DETAIL }),
]

const dashboardGlyph: Prim[] = [
  line(3, 2, 3, 20, { strokeWidth: LINE }),
  line(3, 20, 21, 20, { strokeWidth: LINE }),
  rect(6, 12, 3.5, 8, { fill: "shade", fillColor: "faint", strokeWidth: DETAIL }),
  rect(11, 8, 3.5, 12, { fill: "shade", fillColor: "faint", strokeWidth: DETAIL }),
  rect(16, 4, 3.5, 16, { fill: "shade", fillColor: "faint", strokeWidth: DETAIL }),
]

const podGlyph: Prim[] = [
  poly([[11, 1.5], [19.5, 6.5], [19.5, 15.5], [11, 20.5], [2.5, 15.5], [2.5, 6.5]], true, { strokeWidth: LINE }),
  dot(11, 11, 1.6),
]

/** A cube: the face, then only the three edges the face doesn't already draw. */
const containerGlyph: Prim[] = [
  rect(3, 8, 11, 11, { strokeWidth: LINE }),
  poly([[3, 8], [8, 3], [19, 3]], false, { strokeWidth: LINE }),
  line(14, 8, 19, 3, { strokeWidth: LINE }),
  line(19, 3, 19, 14, { strokeWidth: LINE }),
  line(19, 14, 14, 19, { strokeWidth: LINE }),
]

const machineGlyph: Prim[] = [
  rect(4.5, 1.5, 13, 19, { r: 2, strokeWidth: LINE }),
  line(7.5, 6.5, 14.5, 6.5, { strokeWidth: DETAIL }),
  line(7.5, 9, 14.5, 9, { strokeWidth: DETAIL }),
  line(4.5, 12, 17.5, 12, { strokeWidth: DETAIL }),
  dot(11, 16, 1.6),
]

const ingressGlyph: Prim[] = [
  rect(7.5, 2, 12, 18, { r: 1, strokeWidth: LINE }),
  dot(16.5, 11, 1.1),
  line(1.5, 11, 6.5, 11, { strokeWidth: LINE }),
  line(6.5, 11, 3.5, 8.8, { strokeWidth: LINE }),
  line(6.5, 11, 3.5, 13.2, { strokeWidth: LINE }),
]

const secretGlyph: Prim[] = [
  ellipse(6.5, 2, 9, 9, { strokeWidth: LINE }),
  poly([[9.2, 9.5], [12.8, 9.5], [14.5, 20], [7.5, 20]], true, { strokeWidth: LINE }),
]

// -- the table --------------------------------------------------------------

type ShelfGroup = "Systems" | "Pipelines" | "Infra"

interface ShelfItem {
  kind: string
  name: string
  group: ShelfGroup
  /** the plain word the item arrives saying */
  label: string
  keywords: string[]
  glyph: Prim[]
}

const SHELF: ShelfItem[] = [
  {
    kind: "server",
    name: "Server",
    group: "Systems",
    label: "Service",
    keywords: ["server", "service", "backend", "api", "app", "compute", "ec2", "host"],
    glyph: serverGlyph,
  },
  {
    kind: "database",
    name: "Database",
    group: "Systems",
    label: "Database",
    keywords: ["db", "postgres", "postgresql", "mysql", "sql", "sqlite", "rds", "datastore", "storage"],
    glyph: databaseGlyph,
  },
  {
    kind: "cache",
    name: "Cache",
    group: "Systems",
    label: "Cache",
    keywords: ["redis", "memcached", "memory", "kv", "key value", "session", "fast"],
    glyph: cacheGlyph,
  },
  {
    kind: "queue",
    name: "Queue",
    group: "Systems",
    label: "Queue",
    keywords: ["sqs", "rabbitmq", "buffer", "jobs", "messages", "messaging", "async", "backlog"],
    glyph: queueGlyph,
  },
  {
    kind: "topic",
    name: "Topic",
    group: "Systems",
    label: "Topic",
    keywords: ["kafka", "pubsub", "pub sub", "publish", "subscribe", "event", "fanout", "broadcast"],
    glyph: topicGlyph,
  },
  {
    kind: "worker",
    name: "Worker",
    group: "Systems",
    label: "Worker",
    keywords: ["job", "consumer", "lambda", "function", "processor", "background", "task", "cron"],
    glyph: workerGlyph,
  },
  {
    kind: "load-balancer",
    name: "Load balancer",
    group: "Systems",
    label: "Load balancer",
    keywords: ["lb", "load balancer", "balancer", "proxy", "haproxy", "alb", "traffic", "fan out"],
    glyph: loadBalancerGlyph,
  },
  {
    kind: "gateway",
    name: "Gateway",
    group: "Systems",
    label: "Gateway",
    keywords: ["api gateway", "gateway", "router", "edge", "entry", "front door", "auth", "rate limit"],
    glyph: gatewayGlyph,
  },
  {
    kind: "cdn",
    name: "CDN",
    group: "Systems",
    label: "CDN",
    keywords: ["cdn", "content delivery", "cloudfront", "cloudflare", "edge", "static", "assets"],
    glyph: cdnGlyph,
  },
  {
    kind: "object-store",
    name: "Object store",
    group: "Systems",
    label: "Object store",
    keywords: ["s3", "bucket", "blob", "gcs", "storage", "files", "uploads", "assets"],
    glyph: objectStoreGlyph,
  },
  {
    kind: "client",
    name: "Client",
    group: "Systems",
    label: "Client",
    keywords: ["browser", "web", "app", "frontend", "user", "device", "mobile", "desktop"],
    glyph: clientGlyph,
  },
  {
    kind: "external",
    name: "External",
    group: "Systems",
    label: "External",
    keywords: ["third party", "third-party", "vendor", "saas", "outside", "stripe", "webhook", "api"],
    glyph: externalGlyph,
  },
  {
    kind: "pipeline",
    name: "Pipeline",
    group: "Pipelines",
    label: "Pipeline",
    keywords: ["etl", "dag", "workflow", "airflow", "stages", "job", "transform", "batch"],
    glyph: pipelineGlyph,
  },
  {
    kind: "cron",
    name: "Cron",
    group: "Pipelines",
    label: "Cron",
    keywords: ["cron", "crontab", "schedule", "scheduler", "timer", "nightly", "job", "every hour"],
    glyph: cronGlyph,
  },
  {
    kind: "stream",
    name: "Stream",
    group: "Pipelines",
    label: "Stream",
    keywords: ["kafka", "events", "flow", "realtime", "logs", "firehose", "tail", "subscribe"],
    glyph: streamGlyph,
  },
  {
    kind: "warehouse",
    name: "Warehouse",
    group: "Pipelines",
    label: "Warehouse",
    keywords: ["analytics", "olap", "bigquery", "snowflake", "redshift", "etl", "data warehouse", "reporting"],
    glyph: warehouseGlyph,
  },
  {
    // Not "dashboard": the Screens template has held that slug since before
    // this shelf existed, and a released document naming it has to keep opening
    // as the screen it was. The word still finds this item, by name and keyword.
    kind: "metrics",
    name: "Dashboard",
    group: "Pipelines",
    label: "Dashboard",
    keywords: ["dashboard", "metrics", "analytics", "charts", "reporting", "grafana", "observability", "graph", "viz"],
    glyph: dashboardGlyph,
  },
  {
    kind: "pod",
    name: "Pod",
    group: "Infra",
    label: "Pod",
    keywords: ["k8s", "kubernetes", "container", "replica", "workload", "cluster", "helm"],
    glyph: podGlyph,
  },
  {
    kind: "container",
    name: "Container",
    group: "Infra",
    label: "Container",
    keywords: ["docker", "image", "k8s", "kubernetes", "registry", "runtime"],
    glyph: containerGlyph,
  },
  {
    kind: "machine",
    // Not "node": that word already means a layer on this canvas, and a kind
    // sharing it would make every search and every conversation ambiguous.
    name: "Machine",
    group: "Infra",
    label: "Machine",
    keywords: ["node", "host", "vm", "instance", "cpu", "compute", "box", "server"],
    glyph: machineGlyph,
  },
  {
    kind: "ingress",
    name: "Ingress",
    group: "Infra",
    label: "Ingress",
    keywords: ["reverse proxy", "nginx", "k8s", "traffic", "load balancer", "entry", "edge", "tls"],
    glyph: ingressGlyph,
  },
  {
    kind: "secret",
    name: "Secret",
    group: "Infra",
    label: "Secret",
    keywords: ["key", "token", "vault", "credential", "password", "env", "certificate", "kms"],
    glyph: secretGlyph,
  },
]

// -- the family -------------------------------------------------------------

function shelfDef(item: ShelfItem): ComponentDef {
  return {
    kind: item.kind,
    name: item.name,
    category: "components",
    group: item.group,
    keywords: item.keywords,
    size: SIZE,
    // A note of its own would put words under every symbol before the person
    // has a thought of their own, so the shelf ships the label and nothing else.
    defaults: { label: item.label, note: "" },
    controls: [
      { key: "label", label: "Label", type: "text" },
      { key: "note", label: "Note", type: "text", help: "Free text under the name, such as a version or a count." },
    ],
    render(p, w, h) {
      // Height sets the drawing's size, so the symbol band straddles mid height
      // at every size and a bound connector keeps landing level with the symbol.
      // Width only decides how much of the name survives.
      const k = h / SIZE.h
      const room = Math.max(0, w - SIDE * k * 2)
      const symbol = Math.min(SYMBOL * k, room)
      const top = SYMBOL_TOP * k
      const middle = w / 2
      const nameBase = top + symbol + NAME_LIFT * k
      const name = truncate(str(p, "label", item.label), NAME_SIZE * k, room)
      const note = truncate(str(p, "note", ""), NOTE_SIZE * k, room)
      const prims: Prim[] = place(scaleGlyph(item.glyph, symbol / GLYPH_BOX), middle - symbol / 2, top)
      prims.push(text(middle, nameBase, name, NAME_SIZE * k, { align: "center", bold: true }))
      if (note) prims.push(text(middle, nameBase + NOTE_STEP * k, note, NOTE_SIZE * k, { align: "center", color: "muted" }))
      return prims
    },
  }
}

export const SYSTEMS_DEFS: ComponentDef[] = SHELF.map(shelfDef)
