// ---------------------------------------------------------------------------
// The room and the palettes it paints.
//
//   node --experimental-strip-types scripts/test-theme.ts
//
// Two things are worth pinning down here. The night palettes are derived rather
// than authored, so the ladder rule from lib/theme can be checked as arithmetic
// and the ink can be checked for the only property that matters at night: that
// you can read it. And the export has a room now, so the day picture has to
// stay exactly the picture it was before the room existed.
// ---------------------------------------------------------------------------

import { createHash } from "node:crypto"

import { componentNode, shapeNode, textNode } from "../lib/doc.ts"
import { renderSvg } from "../lib/sketch/svg.ts"
import {
  bgOf,
  isDark,
  paletteOf,
  PAPER_SHADES,
  THEME_NAMES,
  type Appearance,
  type Look,
  type Palette,
} from "../lib/theme.ts"
import { check, report } from "./harness.ts"

// -- colour maths ------------------------------------------------------------

/** The rule in lib/theme's header, written out independently of its code. */
function mix(a: string, b: string, t: number): string {
  const channels = (s: string) =>
    [1, 3, 5].map((i) => parseInt(s.replace("#", "").slice(i - 1, i + 1), 16))
  const [r1, g1, b1] = channels(a)
  const [r2, g2, b2] = channels(b)
  const at = (x: number, y: number) => Math.round(x + (y - x) * t)
  return `#${[at(r1, r2), at(g1, g2), at(b1, b2)]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("")}`
}

function luminance(hex: string): number {
  const raw = hex.replace("#", "")
  const channel = (i: number) => parseInt(raw.slice(i, i + 2), 16) / 255
  const linear = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  return 0.2126 * linear(channel(0)) + 0.7152 * linear(channel(2)) + 0.0722 * linear(channel(4))
}

const contrast = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const night = (name: string): Palette => paletteOf(name, true)

// -- every theme has a night of its own --------------------------------------

{
  check("there are six themes to check", THEME_NAMES.length === 6)
  const sheets = new Set<string>()
  const inks = new Set<string>()
  for (const name of THEME_NAMES) {
    const day = paletteOf(name)
    const dark = night(name)
    check(`${name} has a night palette`, dark.night === true)
    check(`${name}'s night is not its day`, dark.bg !== day.bg && dark.ink !== day.ink && dark.select !== day.select)
    sheets.add(dark.bg)
    inks.add(dark.ink)
  }
  check("no two themes share a night sheet", sheets.size === THEME_NAMES.length)
  check("no two themes share a night ink", inks.size === THEME_NAMES.length)
}

// -- the derived ladder ------------------------------------------------------

for (const name of THEME_NAMES) {
  const p = night(name)
  check(`${name}: shade is 8 percent ink into paper`, p.shade === mix(p.paper, p.ink, 0.08))
  check(`${name}: shadeStrong is 20 percent ink into paper`, p.shadeStrong === mix(p.paper, p.ink, 0.2))
  check(
    `${name}: muted and faint sit between the sheet and the ink`,
    luminance(p.bg) < luminance(p.faint) &&
      luminance(p.faint) < luminance(p.muted) &&
      luminance(p.muted) < luminance(p.ink),
  )
}

// -- can you read it ---------------------------------------------------------

for (const name of THEME_NAMES) {
  const p = night(name)
  check(`${name}: night ink on the night sheet is legible`, contrast(p.ink, p.bg) >= 4.5, contrast(p.ink, p.bg).toFixed(2))
  check(`${name}: night ink on night paper is legible`, contrast(p.ink, p.paper) >= 4.5, contrast(p.ink, p.paper).toFixed(2))
}

// -- paper -------------------------------------------------------------------

{
  check("white paper is pure white in the day", bgOf(paletteOf("internet-blue"), "white") === "#FFFFFF")
  for (const name of THEME_NAMES) {
    const p = night(name)
    check(`${name}: the authored sheet is the middle shade`, bgOf(p, "subtle") === p.bg)
    const [white, subtle, shaded] = PAPER_SHADES.map(({ value }) => bgOf(p, value))
    check(`${name}: three paper shades stay distinct`, new Set([white, subtle, shaded]).size === 3)
    check(
      `${name}: the three paper shades keep one order`,
      luminance(subtle) < luminance(white) && luminance(white) < luminance(shaded),
    )
  }
}

// -- the decision ------------------------------------------------------------

{
  const appearances: Appearance[] = ["light", "dark", "system"]
  check("light stays light, even when the system is dark", !isDark("light", true) && !isDark("light", false))
  check("dark stays dark, even when the system is light", isDark("dark", true) && isDark("dark", false))
  check("system follows the system both ways", isDark("system", true) && !isDark("system", false))
  check("every appearance resolves to a room", appearances.every((a) => typeof isDark(a, false) === "boolean"))
}

// -- the room reaches a picture ----------------------------------------------

{
  const LOOK: Look = { theme: "internet-blue", paper: "subtle", font: "sans", grid: false }
  const nodes = [
    shapeNode("rect", { id: "box", seed: 11, x: 10, y: 20, w: 100, h: 50 }),
    textNode("hello", { id: "label", seed: 12, x: 200, y: 0 }),
    componentNode("button", { id: "btn", seed: 13, x: 0, y: 100 }),
  ]
  const day = renderSvg(nodes, LOOK, "paper")
  const dark = renderSvg(nodes, LOOK, "paper", undefined, { night: true })

  // The hash is the day export as it was before the room existed, taken from
  // the commit before this change. If it moves, the light room moved with it.
  const DAY_EXPORT = "5ba570697b900b7185bb23762849ba5bf590f13a1bbeba7efce8a854ebc8e670"
  check(
    "the day export is byte for byte what it was before the room",
    createHash("sha256").update(day).digest("hex") === DAY_EXPORT,
  )
  check("the night export is a different picture", day !== dark)
  check("the night export's sheet is the night sheet", dark.includes(`fill="${night("internet-blue").bg}"`))
  check("the day export's sheet is still the day sheet", day.includes(`fill="${bgOf(paletteOf("internet-blue"), "subtle")}"`))
  check("a day export never uses the night sheet", !day.includes(night("internet-blue").bg))
  check("the night export is not empty", dark.length > 0)
}

report("theme checks passed")
