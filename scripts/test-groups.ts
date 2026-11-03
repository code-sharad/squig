// ---------------------------------------------------------------------------
// Groups as a hierarchy, by the operations that used to disagree about it.
//
//   node --experimental-strip-types --import ./scripts/register-loader.mjs \
//        scripts/test-groups.ts
// ---------------------------------------------------------------------------

;(globalThis as { window?: unknown }).window = {
  innerWidth: 1440,
  innerHeight: 900,
  addEventListener() {},
  removeEventListener() {},
}
const held = new Map<string, string>()
;(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => held.get(k) ?? null,
  setItem: (k: string, v: string) => void held.set(k, v),
  removeItem: (k: string) => void held.delete(k),
}

const { useSquig } = await import("../lib/store.ts")
const { canGroupSelection, groupPickForHit, pruneGroupStyles, selectionForPress, stepIntoGroup } = await import("../lib/canvas/groups.ts")
const { BOUNDARY_PAD, boundaryList, boundaryPrims, boundarySeed } = await import("../lib/canvas/boundary.ts")
import type { SquigNode } from "../lib/types.ts"
import { check, report } from "./harness.ts"

const s = () => useSquig.getState()

function reset() {
  useSquig.setState({
    nodes: {},
    order: [],
    selection: [],
    selectionGroupId: null,
    selectionGroups: [],
    clipboard: [],
    past: [],
    future: [],
    dupTrail: null,
    editingId: null,
    croppingId: null,
  })
}

const rect = (x: number, y = 0) =>
  s().addNode({
    type: "shape",
    shape: "rect",
    fill: "none",
    x,
    y,
    w: 40,
    h: 30,
  } as Omit<SquigNode, "id" | "seed">)

function group(ids: string[]): string {
  s().setSelection(ids)
  s().groupSelected()
  return s().selectionGroupId!
}

const path = (id: string) => s().nodes[id]?.groupIds ?? []

// -- one group remains one object ------------------------------------------

{
  reset()
  const a = rect(0)
  const b = rect(80)
  const g = group([a, b])
  const before = s().past.length

  check("a new group is the active selection", !!g && s().selectionGroupId === g)
  check("an already-selected group cannot be grouped by itself", !canGroupSelection([a, b], s().nodes, s().order))
  s().groupSelected()
  check("grouping one group adds no wrapper and no history", path(a).join() === g && s().past.length === before)
}

// -- ⌘D and Option-drag agree ----------------------------------------------

for (const [label, duplicate] of [
  ["⌘D", () => s().duplicateSelected(16)],
  ["Option-drag", () => s().cloneSelectionInPlace()],
] as const) {
  reset()
  const a = rect(0)
  const b = rect(80)
  const g = group([a, b])
  const copies = duplicate()
  const copiedGroup = path(copies[0])[0]

  check(`${label}: the copied group has a new identity`, !!copiedGroup && copiedGroup !== g)
  check(`${label}: both copies share that new identity`, path(copies[1])[0] === copiedGroup)
  check(`${label}: the copy is selected as its own group`, s().selectionGroupId === copiedGroup)
  check(`${label}: the duplicate is not a member of the original`, s().expandSelection([a]).length === 2)
}

// -- a subgroup copy stays in its parent, not in its source subgroup -------

{
  reset()
  const a = rect(0)
  const b = rect(80)
  const inner = group([a, b])
  const c = rect(160)
  const outer = group([a, b, c])

  check("grouping a group with a leaf creates a two-level path", path(a).join() === `${outer},${inner}`)
  check("the sibling sits directly in the parent", path(c).join() === outer)

  s().setSelection([a, b], inner)
  const copies = s().duplicateSelected(16)
  const copiedInner = path(copies[0])[1]
  check("subgroup duplicate: the parent is retained", path(copies[0])[0] === outer)
  check("subgroup duplicate: the subgroup is remapped", !!copiedInner && copiedInner !== inner)
  check("subgroup duplicate: its members stay together", path(copies[1]).join() === `${outer},${copiedInner}`)
  check("subgroup duplicate: the copy lands beside the source inside the parent", s().order.join() === [a, b, ...copies, c].join())
  check("subgroup duplicate: the original subgroup still selects only itself", s().expandSelection([a]).length === 5)

  const outerPick = groupPickForHit(a, [], null, s().nodes, s().order)
  const innerPick = stepIntoGroup(a, outerPick.ids, outerPick.groupId, s().nodes, s().order)
  const leafPick = stepIntoGroup(a, innerPick.ids, innerPick.groupId, s().nodes, s().order)
  check("plain click takes the outer group", outerPick.groupId === outer && outerPick.ids.length === 5)
  check("one double-click takes the original subgroup", innerPick.groupId === inner && innerPick.ids.join() === [a, b].join())
  check("the next double-click takes the leaf", leafPick.groupId === null && leafPick.ids.join() === a)
  check("a deep-selected leaf stays deep on its next press", groupPickForHit(a, [a], null, s().nodes, s().order).ids.join() === a)
}

// -- grouping and ungrouping at a nested depth -----------------------------

{
  reset()
  const a = rect(0)
  const b = rect(80)
  const inner = group([a, b])
  const c = rect(160)
  const d = rect(240)
  const outer = group([a, b, c, d])

  s().setSelection([a, b, c])
  s().groupSelected()
  const middle = s().selectionGroupId!
  check("grouping siblings inserts below their shared parent", path(a).join() === `${outer},${middle},${inner}`)
  check("the loose sibling enters the same subgroup", path(c).join() === `${outer},${middle}`)
  check("an unselected sibling stays directly in the parent", path(d).join() === outer)

  s().ungroupSelected()
  check("ungroup removes the selected middle depth", path(a).join() === `${outer},${inner}` && path(c).join() === outer)
  check("ungroup preserves the deeper subgroup", path(b).join() === `${outer},${inner}`)
}

// -- deleting the other child removes an invisible one-item wrapper --------

{
  reset()
  const a = rect(0)
  const b = rect(80)
  const g = group([a, b])
  s().setSelection([b], null)
  s().deleteSelected()
  check("deleting one of two leaves the survivor ungrouped", path(a).length === 0, `${g}: ${path(a).join()}`)
  s().setSelection([a])
  const [copy] = s().duplicateSelected()
  check("the survivor duplicates as an ordinary leaf", path(copy).length === 0)
}

// -- detaching inside a group creates a subgroup, not a new outer parent ----

{
  reset()
  const component = s().addNode({
    type: "component",
    kind: "button",
    props: { label: "Continue" },
    x: 0,
    y: 0,
    w: 120,
    h: 40,
  } as Omit<SquigNode, "id" | "seed">)
  const sibling = rect(180)
  const outer = group([component, sibling])
  s().setSelection([component])
  s().detachSelected()
  const pieces = [...s().selection]
  const detachedGroup = path(pieces[0])[1]
  check("detach replaces the component with editable pieces", pieces.length > 1 && !s().nodes[component])
  check("detached pieces retain their existing parent first", !!detachedGroup && path(pieces[0])[0] === outer)
  check("detached pieces form a subgroup inside that parent", pieces.every((id) => path(id).join() === `${outer},${detachedGroup}`))
}

// -- undo/redo keeps the active group depth --------------------------------

{
  reset()
  const a = rect(0)
  const b = rect(80)
  const g = group([a, b])
  const copies = s().duplicateSelected()
  const copiedGroup = s().selectionGroupId
  s().undo()
  s().redo()
  check("redo restores the copied leaves", copies.every((id) => !!s().nodes[id]))
  check("redo restores the copied group as active", !!copiedGroup && s().selectionGroupId === copiedGroup && copiedGroup !== g)
}

// -- a boundary is a group with a name --------------------------------------

/** a plain rectangle, so the geometry in these cases is the box it says */
const area = (id: string, x: number, y: number, w: number, h: number, groupIds?: string[]): SquigNode => ({
  id,
  seed: 1,
  type: "shape",
  shape: "rect",
  fill: "none",
  x,
  y,
  w,
  h,
  ...(groupIds ? { groupIds } : {}),
})

{
  const nodes = [area("a", 10, 20, 100, 50, ["region"]), area("b", 200, 0, 40, 30, ["region"]), area("c", 500, 500, 10, 10)]
  const [boundary] = boundaryList(nodes, { region: { label: "aws" } })
  check("a named group becomes one boundary", boundaryList(nodes, { region: { label: "aws" } }).length === 1)
  check("the box is the members' union plus the padding", boundary.x === 10 - BOUNDARY_PAD && boundary.y === 0 - BOUNDARY_PAD)
  check("…and reaches the far corner too", boundary.x + boundary.w === 240 + BOUNDARY_PAD && boundary.y + boundary.h === 70 + BOUNDARY_PAD)
  check("a member outside the group doesn't stretch it", boundary.w === 240 - 10 + BOUNDARY_PAD * 2)
  check("an unnamed group draws nothing", boundaryList(nodes, undefined).length === 0)
  check("no record, no boundary", boundaryList(nodes, { other: { label: "x" } }).length === 0)
}

{
  // outer wraps the zone, the zone wraps the service: depth decides the order,
  // because an outer boundary printed after its inner one would cover it
  const nodes = [
    area("a", 0, 0, 10, 10, ["outer", "inner"]),
    area("b", 40, 0, 10, 10, ["outer", "inner"]),
    area("c", 100, 0, 10, 10, ["outer"]),
  ]
  const list = boundaryList(nodes, { inner: { label: "zone" }, outer: { label: "region" } })
  check("nested groups print outermost first", list.map((b) => b.groupId).join() === "outer,inner")
  check("…and the outer one holds every member at any depth", list[0].x === -BOUNDARY_PAD && list[0].x + list[0].w === 110 + BOUNDARY_PAD)
  check("…while the inner one holds only its own", list[1].x === -BOUNDARY_PAD && list[1].x + list[1].w === 50 + BOUNDARY_PAD)
  check("depth comes from the path, not from the order asked about", list[0].depth === 0 && list[1].depth === 1)
}

{
  const nodes = [area("a", 0, 0, 10, 10, ["region"]), area("b", 40, 0, 10, 10, ["region"])]
  const named = Object.fromEntries(nodes.map((n) => [n.id, n]))
  check("a record whose group has no members draws nothing", boundaryList(nodes, { region: { label: "x" }, gone: { label: "ghost" } }).every((b) => b.groupId === "region"))
  check("…and is pruned from the document", JSON.stringify(pruneGroupStyles({ region: { label: "x" }, gone: { label: "ghost" } }, named)) === JSON.stringify({ region: { label: "x" } }))
  check("no names, nothing to prune", pruneGroupStyles(undefined, {}) === undefined)
  check("pruning the last name leaves no empty record", pruneGroupStyles({ gone: { label: "x" } }, {}) === undefined)
}

{
  // the wobble has to survive a re-render, or the dashes crawl on every frame
  check("the seed is a fold of the id, not a roll", boundarySeed("Wq3dRt") === boundarySeed("Wq3dRt"))
  check("…and two groups get two seeds", boundarySeed("Wq3dRt") !== boundarySeed("Kd8mPs"))
  check("…both inside the range a document seed lives in", [boundarySeed("Wq3dRt"), boundarySeed("Kd8mPs")].every((seed) => seed > 0 && seed < 2 ** 31))
}

{
  const inside = boundaryPrims({ label: "aws" }, 200, 100)
  check("a boundary draws a dashed hairline in the faint ink", inside[0].t === "rect" && !!inside[0].o?.dashed && inside[0].o?.stroke === "faint")
  const name = inside[1]
  check("…and its name inside the box", name.t === "text" && name.text === "aws" && name.color === "muted" && name.x === 14)
  const right = boundaryPrims({ label: "aws", at: "inside-right" }, 200, 100)[1]
  check("inside-right anchors to the right edge", right.t === "text" && right.align === "right" && right.x === 200 - 14)
  const edge = boundaryPrims({ label: "aws", at: "edge-center" }, 200, 100)
  check("an edge name brings the shared paper pad", edge.length === 3 && edge[1].t === "rect" && edge[1].o?.fill === "solid" && edge[1].o?.fillColor === "paper")
  check("…centred on the top edge", edge[1].t === "rect" && edge[1].y < 0 && edge[1].y + edge[1].h > 0)
}

// ---------------------------------------------------------------------------


{
  const current = { ids: ["a", "b"], groupId: null }
  const picked = { ids: ["a"], groupId: null }
  const plain = selectionForPress(current, picked, false, false)
  check("plain press preserves the whole selection for dragging", plain.press.ids.join() === "a,b" && plain.click?.ids.join() === "a")
  const shift = selectionForPress(current, picked, true, false)
  check("Shift press defers removal until release", shift.press.ids.join() === "a,b" && shift.click?.ids.join() === "b")
  const deep = selectionForPress(current, picked, false, true)
  check("deep-selection immediately isolates the leaf for dragging", deep.press.ids.join() === "a" && deep.click === null)
  const addDeep = selectionForPress(current, { ids: ["c"], groupId: null }, true, true)
  check("Shift plus deep-selection adds the leaf", addDeep.press.ids.join() === "a,b,c")
}


// Alignment uses selected hierarchy, not the flattened list used for dragging.
{
  reset()
  const a = rect(0, 0), b = rect(60, 40), c = rect(300, 100), d = rect(380, 160)
  const g = group([a, b]), h = group([c, d])
  const { press } = selectionForPress(
    { ids: [a, b], groupId: g }, { ids: [c, d], groupId: h }, true, false
  )
  s().setSelection(press.ids, press.groupId, press.groups)
  const before = JSON.stringify(s().nodes)
  const depth = s().past.length
  s().alignSelected("hcenter")
  check("two group picks align their bounding boxes", s().nodes[a].x === 160 && s().nodes[c].x === 150)
  check("alignment preserves each group's internal offsets", s().nodes[b].x - s().nodes[a].x === 60 && s().nodes[d].x - s().nodes[c].x === 80)
  check("alignment leaves the other axis alone", s().nodes[b].y === 40 && s().nodes[d].y === 160)
  check("group alignment is one undo step", s().past.length === depth + 1)
  const after = JSON.stringify(s().nodes)
  s().undo()
  check("undo restores positions and both selected groups", JSON.stringify(s().nodes) === before && s().selectionGroups.join() === [g, h].join())
  s().redo()
  check("redo restores positions and both selected groups", JSON.stringify(s().nodes) === after && s().selectionGroups.join() === [g, h].join())
  const alignedDepth = s().past.length
  s().alignSelected("hcenter")
  check("repeated alignment spends no undo step", s().past.length === alignedDepth)
  s().undo()
  s().setSelection([a, b])
  s().alignSelected("left")
  check("explicitly selecting all children still aligns the children", s().nodes[a].x === 0 && s().nodes[b].x === 0)
  check("deep alignment leaves other groups alone", s().nodes[c].x === 300 && s().nodes[d].x === 380)
}

{
  reset()
  const a = rect(0), b = rect(80), c = rect(200), outside = rect(400)
  const inner = group([a, b]), outer = group([a, b, c])
  const picked = groupPickForHit(a, [a, b, outside], null, s().nodes, s().order, [inner])
  check("clicking a subgroup in a mixed selection keeps its depth", picked.groupId === inner)
  const entered = stepIntoGroup(a, [a, b, outside], null, s().nodes, s().order, [inner])
  check("double-clicking a subgroup in a mixed selection enters that subgroup", entered.ids.join() === a && entered.groupId === null)
  s().setSelection([a])
  s().alignSelected("right")
  check("a single child aligns inside its immediate parent", s().nodes[a].x === 80 && s().nodes[b].x === 80 && s().nodes[c].x === 200)
  s().undo()
  s().setSelection([a, b], inner)
  s().alignSelected("right")
  check("a nested group aligns to its parent as a unit", s().nodes[a].x === 120 && s().nodes[b].x === 200)
  s().undo()
  s().setSelection([a, outside])
  s().alignSelected("hcenter")
  check("a deep child and an outside node align to each other", s().nodes[a].x === 200 && s().nodes[outside].x === 200)
  check("mixed alignment leaves unselected siblings alone", s().nodes[b].x === 80 && s().nodes[c].x === 200)
  s().undo()
  s().setSelection([a, b, c], outer)
  const before = JSON.stringify(s().nodes), depth = s().past.length
  s().alignSelected("left")
  check("a lone top-level group has no alignment target", JSON.stringify(s().nodes) === before && s().past.length === depth)
  s().setSelection([a, b, c, outside], null, [outer, inner])
  s().alignSelected("right")
  check("overlapping parent and subgroup picks move each leaf once", s().nodes[a].x === 200 && s().nodes[b].x === 280 && s().nodes[c].x === 400)
}

for (const [edge, x, y] of [
  ["left", 0, 60], ["hcenter", 80, 60], ["right", 160, 60],
  ["top", 60, 0], ["vcenter", 60, 85], ["bottom", 60, 170],
] as const) {
  reset()
  const background = rect(0), child = rect(60, 60)
  s().updateNode(background, { w: 200, h: 200, locked: true })
  s().updateNodes({ [background]: { groupIds: ["parent"] }, [child]: { groupIds: ["parent"] } })
  s().setSelection([child])
  s().alignSelected(edge)
  check(`single child ${edge} uses parent bounds, including locked members`, s().nodes[child].x === x && s().nodes[child].y === y)
  check(`single child ${edge} does not move its container`, s().nodes[background].x === 0 && s().nodes[background].y === 0)
}

{
  reset()
  const ids = [0, 60, 200, 260, 600, 660].map((x) => rect(x))
  const groups = [group(ids.slice(0, 2)), group(ids.slice(2, 4)), group(ids.slice(4, 6))]
  s().selectAll()
  s().distributeSelected("h")
  check("select all distributes three whole groups", s().nodes[ids[2]].x === 300 && s().nodes[ids[3]].x === 360)
  check("group distribution keeps the outer units fixed", s().nodes[ids[0]].x === 0 && s().nodes[ids[5]].x === 660)
  s().setSelection(ids.slice(0, 4), null, groups.slice(0, 2))
  const before = JSON.stringify(s().nodes)
  s().distributeSelected("h")
  check("two selected groups cannot distribute their four children", JSON.stringify(s().nodes) === before)
  const clones = s().duplicateSelected()
  check("duplicating a multi-group selection preserves its units", s().selectionGroups.length === 2 && s().selectionGroups.every((g) => !groups.includes(g)))
  s().checkpoint()
  s().cloneSelectionInPlace()
  const draggedGroups = [...s().selectionGroups]
  s().undo()
  s().redo()
  check("redo of an in-place drag copy restores the copied group units", s().selectionGroups.join() === draggedGroups.join())
  s().undo()
  s().alignSelected("left")
  check("duplicated groups align without collapsing children", s().nodes[clones[1]].x - s().nodes[clones[0]].x === 60)
}

report("group checks passed")
