import type { GroupStyles, SquigNode } from "@/lib/types"
import type { Look } from "@/lib/theme"

/**
 * The canvas a browser and its companion both edit, and the whole set of
 * fields a round trip carries.
 *
 * A field left out is not "unchanged": the companion's copy then says the
 * document never had it, and the next merge reads the browser's value as an
 * edit that deleted it. That is how a name typed on a boundary used to
 * disappear on the way to the local file, so the list lives on a type that the
 * bridge's snapshot must satisfy.
 */
export interface CanvasSnapshot {
  fileName: string
  nodes: Record<string, SquigNode>
  order: string[]
  /** names on groups, carried like the look — the browser is where they are typed */
  groups: GroupStyles
  look: Look
}

/** The store's document as the companion receives it. */
export function canvasSnapshot(s: {
  fileName: string
  nodes: Record<string, SquigNode>
  order: string[]
  groups: GroupStyles
  theme: Look["theme"]
  font: Look["font"]
  paper: Look["paper"]
  grid: Look["grid"]
}): CanvasSnapshot {
  return {
    fileName: s.fileName,
    nodes: s.nodes,
    order: s.order,
    groups: s.groups,
    look: { theme: s.theme, font: s.font, paper: s.paper, grid: s.grid },
  }
}

/**
 * A stored or companion document as the canvas this browser edits.
 *
 * A reply that leaves `groups` out means "no boundary names", not "none I am
 * telling you about": the browser always holds the record, so a missing one
 * normalized here is what keeps an idle canvas from looking like an edit.
 */
export function editableCanvas(
  doc: Omit<CanvasSnapshot, "groups"> & { groups?: GroupStyles },
): CanvasSnapshot {
  const { fileName, nodes, order, groups, look } = doc
  return { fileName, nodes, order, groups: groups ?? {}, look }
}

export function canvasEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (!a || !b || typeof a !== "object" || typeof b !== "object")
    return false
  if (Array.isArray(a) || Array.isArray(b))
    return (
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((value, i) => canvasEqual(value, b[i]))
    )
  const left = a as Record<string, unknown>,
    right = b as Record<string, unknown>
  // Optional fields in the editor can be explicitly undefined. JSON omits
  // those fields, so treating them as edits causes an idle canvas to keep
  // saving new revisions after every server round trip.
  const keys = Object.keys(left).filter((key) => left[key] !== undefined)
  const rightKeys = Object.keys(right).filter((key) => right[key] !== undefined)
  return (
    keys.length === rightKeys.length &&
    keys.every(
      (key) =>
        Object.hasOwn(right, key) && canvasEqual(left[key], right[key]),
    )
  )
}

/** Three-way merge for the editable canvas. Independent object/field edits commute;
 * competing edits to the same field are surfaced, never silently overwritten. */
export function mergeCanvas<T>(
  base: T,
  local: T,
  remote: T,
): { value: T; conflicts: string[] } {
  const conflicts: string[] = []
  const equal = canvasEqual
  const object = (v: unknown): v is Record<string, unknown> =>
    !!v && typeof v === "object" && !Array.isArray(v)
  function merge(
    b: unknown,
    l: unknown,
    r: unknown,
    path: string,
  ): unknown {
    if (equal(l, b)) return r
    if (equal(r, b) || equal(l, r)) return l
    if (
      path === "order" &&
      Array.isArray(b) &&
      Array.isArray(l) &&
      Array.isArray(r)
    ) {
      const surviving = b.filter((id) => l.includes(id) && r.includes(id))
      const lb = l.filter((id) => surviving.includes(id)),
        rb = r.filter((id) => surviving.includes(id))
      if (
        !equal(lb, surviving) &&
        !equal(rb, surviving) &&
        !equal(lb, rb)
      ) {
        conflicts.push(path)
        return l
      }
      const primary = equal(lb, surviving) ? r : l
      const secondary = primary === r ? l : r
      return [
        ...primary.filter(
          (id) => !b.includes(id) || surviving.includes(id),
        ),
        ...secondary.filter(
          (id) => !b.includes(id) && !primary.includes(id),
        ),
      ]
    }
    if (object(b) && object(l) && object(r)) {
      return Object.fromEntries(
        [
          ...new Set([
            ...Object.keys(b),
            ...Object.keys(l),
            ...Object.keys(r),
          ]),
        ]
          .map((key) => [
            key,
            merge(b[key], l[key], r[key], path ? `${path}.${key}` : key),
          ])
          .filter(([, value]) => value !== undefined),
      )
    }
    conflicts.push(path)
    return l
  }
  return { value: merge(base, local, remote, "") as T, conflicts }
}
