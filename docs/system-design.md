# System design on squig

Boxes, arrows and boundaries are a system diagram already. What squig lacks is
not a canvas, it is a name for a set of boxes, a word on an arrow, and a shelf
of things that are not UI. This file is the decision record for closing that
gap. It is a plan, not documentation of shipped behaviour, so it moves as the
work lands.

## What we are building

Four units, each ending on the gate in `AGENTS.md` (`pnpm typecheck`,
`pnpm test`, `pnpm lint`) and a look at `/kitchen-sink`.

1. Arrow labels.
2. Group boundaries.
3. The Systems shelf.
4. Blueprints.

A fifth unit, double-clicking a connector to type its label on the canvas,
comes after those four are green.

## Unit 1, a word on an arrow

`ArrowNode` gains `label?: string`. It is a new field, so it has to pass the
four doors that already exist.

| door | what it does with `label` |
|---|---|
| `lib/types.ts` | declares it, absent means unlabelled |
| `lib/clipboard-payload.ts` (`validNode`) | keeps a non-empty string under 120 characters, drops the rest |
| `lib/agent/schema.ts` | adds it to the zod allowlist, so an agent can write it |
| `components/canvas/sketch.tsx` (`shapeKey`) | includes it, or the line redraws without its label |

`lib/sketch/node-prims.ts` draws it: a text prim at the route midpoint, on top
of a paper-filled rect that is two or three units wider than the words. The pad
is the point. Without it the stroke runs through the letters, which the
prototype sheet in this repo made obvious and ugly. The pad's own outline is
never drawn.

The midpoint is a new `localRouteMidpoint` beside `localRouteEndTangent` in
`lib/canvas/line-routing.ts`. A straight line takes its halfway point. A
polyline takes the midpoint of the middle run, so an elbow carries its label on
the horizontal or vertical run rather than at the corner. A curve takes t=0.5.
The label hides itself when the run is shorter than the words, because a label
hanging off a stub is worse than no label.

`arrowRouteBounds`, used to size exports, grows to include the label, or a long
word on a short arrow is cropped out of the PNG.

The inspector gets one text field. Nothing else in the UI changes.

## Unit 2, a boundary is a group with a name

A group already carries membership, moving together, nesting, duplicate, paste
and undo. What it does not carry is a name, and nothing renders it.

So `SquigDoc` gains one optional field.

```json
{
  "groups": {
    "Wq3dRt": { "label": "aws us-east-1", "labelAt": "inside-left" }
  }
}
```

`labelAt` is one enum, `inside-left` (the default), `inside-center`,
`inside-right`, `on-left`, `on-center`, `on-right`. There is no boolean pair
here because two booleans that have to agree is the shape this codebase spends
its comments avoiding. `on-*` placements put the name on the edge and break the
dashed line with the same paper pad the arrow label uses. One helper for the
pad serves both, in `lib/sketch/labels.ts`.

Rules that keep this honest.

- **The box is a consequence.** Boundary geometry is the union of its members
  plus 24 units of padding, computed at render. Nothing about it is stored, the
  same deal a bound arrow already has with its targets.
- **It prints under its members.** Boundaries draw first, sorted by depth from
  `groupIds`, so a region can contain a zone that contains a service.
- **It prunes with the group.** `pruneDegenerateGroups` already drops a group
  that falls below two children. The `groups` record is filtered to the ids
  still referenced after that runs, so a boundary never outlives its members.
- **It is the only spelling.** A group with no record draws nothing, exactly as
  today, so grouping for tidy selection stays invisible until you name it.

The render lives in one pure function that returns prims, `lib/canvas/boundary.ts`,
called from the canvas pass and from the exporter. Two renderers is the real
risk in this unit, so the shared function is what keeps them from drifting, and
`scripts/test-svg.ts` asserts an exported document contains the boundary name.

The exporter needs the groups to draw them, and `renderSvg` takes a node list
rather than a document. Rather than grow a fifth positional parameter, the
export path gains a document-aware entry, `renderDoc(doc, surface)`, that
unpacks order, nodes, look and groups. Callers that hold a whole document move
to it. `renderSvg` keeps its signature for callers that hold only nodes.

The inspector shows a name field and the placement select when the selection is
exactly one group.

## Unit 3, the shelf

Everything, twenty-two kinds, in three sections appended to the Components
panel. No third category, no new panel, no new shortcut, because a category
costs `PanelKind`, the rail, two keys, the palette section names and the
kitchen sink, and buys a shelf of twenty-two items its own tab.

| section | kinds |
|---|---|
| Systems | `server`, `database`, `cache`, `queue`, `topic`, `worker`, `load-balancer`, `gateway`, `cdn`, `object-store`, `client`, `external` |
| Pipelines | `pipeline`, `cron`, `stream`, `warehouse`, `dashboard` |
| Infra | `pod`, `container`, `node`, `ingress`, `secret` |

Every kind takes a `label` and a `note`. The note is plain text with no
meaning: a box may say `postgres` or `2 replicas`, and nothing downstream
reads it as a specification. Two controls, and the note disappears when it is
empty.

Signatures are drawn prims in the house hand. A cylinder is an ellipse, a body,
and a second ellipse, which is the same vocabulary the library already uses for
tables and calendars. No Phosphor glyph goes inside a system box, because a
crisp imported glyph next to a wobbling outline reads as a rendering fault.
`external` is the one dashed box, for anything third party.

`node` is a poor name for a compute host, since it collides with the document's
own word for a layer. It ships as `machine` with `node` as a keyword.

## Unit 4, blueprints

A blueprint is a document fragment, not a component. A component that renders a
whole architecture becomes one node, and Break Apart then hands you loose lines
with the bindings gone, which is worse than useless on a connector.

So `lib/library/system-templates.ts` holds a table. Each entry has an `id`, a
`title`, a `description`, and a `build(at)` that returns real nodes through the
builders in `lib/doc.ts`, so `arrowNode` binds to the boxes it just made. One
store action places the result through the existing `addNodes`, and each
blueprint appears in `⌘K` as an action.

| blueprint | what it teaches |
|---|---|
| Short link | client, gateway, service, cache, database |
| Chat | a topic fanning out to sockets |
| Rate limiter | a counter store in front of a service |
| Upload | service, object store, queue, worker, database |

## Not building

Typed spec fields, capacity validation, auto-layout, sequence diagrams, and
containers with real nesting. The first two push toward the precision this tool
exists to avoid. The third is a feature nobody asked for on a napkin. The last
would be a second hierarchy beside `groupIds`.

## Decided by the render, not by argument

Two throwaway sheets were drawn with today's primitives and exported through
`pnpm squig render`.

- Labels struck through by their own line. Fixed by the paper pad above.
- The boundary reads on a napkin at a faint dashed outline with its name inside
  the top left. On the line it needed a pad, and the pad's outline turned the
  name into a chip.
- Straight connectors crossing each other is a property of straight connectors,
  not of labels. Blueprints should use `lineStyle: "elbow"` where two
  connectors share a source.

## Open decisions

- The systems shelf has no theme or sheet of its own. It prints on whatever the
  document already is, which is the point of one ink.
- Placement of a blueprint is the centre of the viewport, selected after
  insertion. Dropping one at the pointer may be worth a follow-up.
