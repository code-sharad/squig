# System design on squig

Boxes, arrows and boundaries are a system diagram already. What squig lacked
was a name for a set of boxes, a word on a connector, and a shelf of things that
are not UI. This file records what was decided and what shipped, so the next
person changing any of it knows why it looks the way it does.

## What shipped

Four units, each landed on the gate in `AGENTS.md` (`pnpm typecheck`,
`pnpm test`, `pnpm lint`) and looked at as a picture. The order mattered: every
unit was checked against the real renderer before the next one started.

1. A word on a connector.
2. A boundary for a group that has a name.
3. The systems shelf.
4. Blueprints.

Still open: double-clicking a connector to type its label on the canvas. Today
the label is an inspector field.

## A word on a connector

`ArrowNode.label?: string`, one line, capped at 120 characters by
`normalizeLabel` in `lib/types.ts`. It passes the four doors a new field always
has to pass.

| door | what it does with `label` |
|---|---|
| `lib/types.ts` | declares it, and normalizes whitespace so a pasted newline becomes a space |
| `lib/clipboard-payload.ts` (`validNode`) | the same door a `bind` comes through |
| `lib/agent/schema.ts` | the zod allowlist, plus the `unset` list so an agent can clear one |
| `components/canvas/sketch.tsx` (`shapeKey`) | includes it, or the line redraws without its word |

The label draws at the route's midpoint on a paper pad that breaks the stroke.
`lib/canvas/line-routing.ts` owns the geometry, `localRouteMidpoint` and
`localArrowLabelBox`, because the renderer and the export bounds have to agree
on where the pad is. The midpoint is half the drawn length for a polyline and
t=0.5 for a curve, so an elbow carries its word on a run rather than at the
corner. A label wider than its run hides itself: a word hanging off a stub is
worse than no word.

The pad is one identity for two subjects. `lib/sketch/labels.ts` is the shared
pad, used by a connector's label and by a boundary name placed on an edge.

`ArrowOpts.label` lets the builders and the CLI set one at creation.

## A boundary is a group with a name

`SquigDoc.groups` maps a group id to `{ label, at? }`. A record exists only when
there is a name, so grouping for tidy selection stays invisible.

| field | meaning |
|---|---|
| `label` | the boundary's name, one line, 80 characters |
| `at` | `inside-left` (absent), `inside-center`, `inside-right`, `edge-left`, `edge-center`, `edge-right` |

`lib/canvas/boundary.ts` holds the geometry, which is never stored.

- Members are every node carrying the group id at any depth, so an outer
  boundary wraps the groups inside it.
- The box is the members' union, measured through `nodeVisualBounds` so a bent
  connector's bulge stays inside, plus 24 units of padding.
- Boundaries print outermost first, behind every node.
- A record with no members draws nothing, and `pruneGroupStyles` in
  `lib/canvas/groups.ts` drops it wherever `pruneDegenerateGroups` already
  prunes. A name cannot outlive its group.

The canvas and the exporter both call `boundaryList` and `boundaryPrims`, which
is what keeps one dashed region from being two slightly different drawings.
`drawNodes` takes the names through `opts.groups`, `renderSvg` takes a trailing
`groups`, and `docBounds` includes the boundary boxes so an export is not
cropped.

The name travels with the document: `parseDoc` and `serializeDoc`, `StoredDoc`,
the store's state and `DocSnapshot` (so a rename undoes), the agent's document
schema, the companion's snapshot and merge, `window.squig.doc()`, and undo.

Two traps worth remembering.

- **The ink is `tone`, not `stroke`.** `PrimOpts.stroke` is how hard the pen
  presses; the line's colour comes from `tone`. `stroke: "faint"` gave a
  boundary the full ink at a hairline weight, which the PNG sample caught and
  no test would have. The boundary is `tone: "faint"`.
- **The select's value is an id.** A `SelectValue` with no children prints the
  raw value, so the placement trigger said `inside-left` at a person until it
  was given the option's label.

## The systems shelf

Twenty-two kinds in `lib/library/defs-systems.ts`, in three panel sections.
`category` stays `"components"`, which is what makes the panel, the palette,
`squig components` and `/kitchen-sink` pick them up with no other change.

| section | kinds |
|---|---|
| Systems | `server`, `database`, `cache`, `queue`, `topic`, `worker`, `load-balancer`, `gateway`, `cdn`, `object-store`, `client`, `external` |
| Pipelines | `pipeline`, `cron`, `stream`, `warehouse`, `metrics` |
| Infra | `pod`, `container`, `machine`, `ingress`, `secret` |

One family, not twenty-two drawings: no box and no frame, a symbol 52 units
square and centred, its name 14 bold underneath and the note 11 muted under
that. Every kind is 120 by 96, so the family lines up on a grid. The symbol's
band runs from 4 to 56, which straddles the item's half height on purpose: a
horizontal connector binds at mid height, and an arrow has to land level with
the symbol rather than with the name.

A note appears under the name when someone types one, and it is plain text with
no meaning downstream. `external` has no dashed frame either; its glyph's own
wall is dashed, so the one third-party item says "outside" without a second
outline around the words.

The glyphs are authored in a 22 unit square and scaled to 52 by `scaleGlyph`,
which leaves every `strokeWidth` alone. A pen is not part of a drawing's size:
scaled with the marks, the hairline tuned at 22 would print as a 3.5 unit slab.

The glyphs are prims. A crisp Phosphor path inside a wobbling outline reads as a
rendering fault.

Two slugs were forced by other names. `machine` is not `node`, because "node"
already means a layer on this canvas, and `node`, `host`, `vm`, `cpu` are
keywords so the search finds it. The dashboard box is `metrics`, because the
Screens template has held `dashboard` since before the shelf existed and a file
naming that kind has to keep opening as the screen it was. The word still finds
the box, by name and keyword.

## Blueprints

`lib/library/system-templates.ts`: Short link, Chat, Rate limiter, Upload. Each
builds with the builders in `lib/doc.ts`, so its connectors are bound to the
boxes they were built against and its region is a named group. A component that
drew a whole architecture would detach into loose lines, which is worse than
useless on a connector.

`placeBlueprint` centres the drawing on a point, mints fresh ids for every node
and group, and cascades down and right while the spot is occupied, so asking
for a second architecture holds it beside the first instead of on top of it.
`insertBlueprint` in the store is one `edit()`, so one keystroke undoes the
whole thing, boundary included. The palette lists the four under Blueprints.

## Not built, on purpose

Typed spec fields, capacity validation, auto-layout, sequence diagrams, and
containers with real nesting. The first two push toward the precision this tool
exists to avoid. The last would be a second hierarchy beside `groupIds`.
