// ---------------------------------------------------------------------------
// The systems shelf: one family of boxes for drawing an architecture rather
// than a screen. Every item is the same box, the same glyph well, the same two
// lines of type, so a diagram built from six of them reads as one drawing.
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

const SIZE = { w: 168, h: 72 }
/** The glyph well: a square at the left of the box, whatever height the box is. */
const GLYPH = 22
const GLYPH_X = 14
/** Where the words start, clear of the well and its air. */
const TEXT_X = 48
const TEXT_RIGHT = 12
const LABEL_SIZE = 14
const NOTE_SIZE = 11
/** The label rides a hair above dead centre; the note answers just below it. */
const LABEL_LIFT = 2
const NOTE_DROP = 13
/** Where a lone label's baseline sits to look centred: half the cap height. */
const BASELINE_MIDDLE = 4
const BOX_R = 6
/** The contour, and the weight one step down for detail the shape doesn't need. */
const LINE = 1.5
const DETAIL = 1.1

const str = (p: Props, k: string, fallback = ""): string => String(p[k] ?? fallback)

// -- drawing aids -----------------------------------------------------------

const dot = (cx: number, cy: number, r = 1.2, o?: PrimOpts): Prim =>
  ellipse(cx - r, cy - r, r * 2, r * 2, { fill: "solid", fillColor: "ink", strokeWidth: 0.9, ...o })

/** The kit has no curve constructor; the stream is the one mark that wants one. */
const wave = (y: number): Prim[] => [
  { t: "curve", x1: 1, y1: y, cx: 6, cy: y - 4.5, x2: 11, y2: y, o: { strokeWidth: LINE } },
  { t: "curve", x1: 11, y1: y, cx: 16, cy: y + 4.5, x2: 21, y2: y, o: { strokeWidth: LINE } },
]

// -- glyphs -----------------------------------------------------------------
// Each lives in the 22 unit square the well provides.

const serverGlyph: Prim[] = [
  rect(1, 2, 20, 8, { r: 1.5, strokeWidth: LINE }),
  rect(1, 12, 20, 8, { r: 1.5, strokeWidth: LINE }),
  line(4.5, 6, 9, 6, { strokeWidth: DETAIL }),
  line(4.5, 16, 9, 16, { strokeWidth: DETAIL }),
  dot(17.5, 6, 1.1),
  dot(17.5, 16, 1.1),
]

/** A cylinder: a rim, two sides, and a second rim where the floor curves away. */
const databaseGlyph: Prim[] = [
  ellipse(3, 1, 16, 6, { strokeWidth: LINE }),
  line(3, 4, 3, 18, { strokeWidth: LINE }),
  line(19, 4, 19, 18, { strokeWidth: LINE }),
  ellipse(3, 15, 16, 6, { strokeWidth: DETAIL }),
]

const cacheGlyph: Prim[] = [
  ellipse(2, 2, 18, 5, { strokeWidth: LINE }),
  ellipse(2, 8.5, 18, 5, { strokeWidth: LINE }),
  ellipse(2, 15, 18, 5, { strokeWidth: LINE }),
]

const queueGlyph: Prim[] = [
  rect(2.5, 2.5, 17, 4, { r: 1.2, strokeWidth: LINE }),
  rect(2.5, 9, 17, 4, { r: 1.2, strokeWidth: LINE }),
  rect(2.5, 15.5, 17, 4, { r: 1.2, strokeWidth: LINE }),
]

/** Broadcast: one writer, two rings of listeners. */
const topicGlyph: Prim[] = [
  ellipse(1.5, 1.5, 19, 19, { strokeWidth: DETAIL }),
  ellipse(6.5, 6.5, 9, 9, { strokeWidth: LINE }),
  dot(11, 11, 1.5),
]

/** A cog: a rim, a hub, and eight teeth, drawn as spokes so it reads at 22px. */
const workerGlyph: Prim[] = [
  ellipse(3.5, 3.5, 15, 15, { strokeWidth: LINE }),
  ellipse(7.5, 7.5, 7, 7, { strokeWidth: DETAIL }),
  ...Array.from({ length: 8 }, (_, i): Prim => {
    const a = (i * Math.PI) / 4
    return line(
      11 + Math.cos(a) * 7.5,
      11 + Math.sin(a) * 7.5,
      11 + Math.cos(a) * 9.8,
      11 + Math.sin(a) * 9.8,
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

/** An arrow through the wall: the one thing on the shelf that isn't ours. */
const externalGlyph: Prim[] = [
  rect(2, 10, 9, 9, { r: 1, strokeWidth: LINE }),
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
const warehouseGlyph: Prim[] = [
  line(3, 2, 3, 20.5, { strokeWidth: LINE }),
  line(19, 2, 19, 20.5, { strokeWidth: LINE }),
  line(3, 7, 19, 7, { strokeWidth: DETAIL }),
  line(3, 12.5, 19, 12.5, { strokeWidth: DETAIL }),
  line(3, 18, 19, 18, { strokeWidth: DETAIL }),
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
  /** the plain word the box arrives saying */
  label: string
  keywords: string[]
  glyph: Prim[]
  /** the one third-party box, so "not ours" shows before the label is read */
  dashed?: boolean
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
    dashed: true,
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
    // as the screen it was. The word still finds this box, by name and keyword.
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
    // A note of its own would put words in every box before the person has a
    // thought of their own, so the shelf ships the label and nothing else.
    defaults: { label: item.label, note: "" },
    controls: [
      { key: "label", label: "Label", type: "text" },
      { key: "note", label: "Note", type: "text", help: "Free text under the name, such as a version or a count." },
    ],
    render(p, w, h) {
      const prims: Prim[] = [rect(0, 0, w, h, { r: BOX_R, dashed: item.dashed })]
      prims.push(...place(item.glyph, GLYPH_X, (h - GLYPH) / 2))
      // The type stays fixed while the box resizes: a shrunken label is what
      // "reserve room for the words" means here, so truncation does the work.
      const room = Math.max(0, w - TEXT_X - TEXT_RIGHT)
      const note = truncate(str(p, "note", ""), NOTE_SIZE, room)
      // A lone label centres on the box's optical middle; one with a note above
      // it steps up, or the pair would hang below centre.
      prims.push(
        text(
          TEXT_X,
          note ? h / 2 - LABEL_LIFT : h / 2 + BASELINE_MIDDLE,
          truncate(str(p, "label", item.label), LABEL_SIZE, room),
          LABEL_SIZE,
          { bold: true }
        )
      )
      if (note) prims.push(text(TEXT_X, h / 2 + NOTE_DROP, note, NOTE_SIZE, { color: "muted" }))
      return prims
    },
  }
}

export const SYSTEMS_DEFS: ComponentDef[] = SHELF.map(shelfDef)
