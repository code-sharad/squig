// ---------------------------------------------------------------------------
// Themes — a duotone ink on paper, applied as CSS custom properties so the
// whole canvas restyles without re-running a single rough.js path.
//
// The look is early-web risograph: one saturated ink, bright paper, and flat
// shaded fills doing the "analog" work that wobbly lines used to do. Lines
// stay clean and closed.
//
// Area fills come from exactly three tones — paper, shade, shadeStrong — so a
// wireframe reads as a small tonal ladder rather than a pile of tints. Both
// shades are the ink mixed into the paper (8% and 20%), which keeps every
// theme's fills in that theme's own hue. If you retune a palette's ink or
// paper, recompute the two shades from them rather than nudging them by eye.
// ---------------------------------------------------------------------------

export interface Palette {
  /** shown in the menu */
  label: string
  /** infinite canvas behind everything */
  bg: string
  /** surfaces that should occlude what's under them */
  paper: string
  /** the ink: strokes and text */
  ink: string
  /** secondary text and strokes */
  muted: string
  /** dividers, hairlines, disabled */
  faint: string
  /** fill tone 1 — the light wash: inert surfaces, tracks, image placeholders */
  shade: string
  /** fill tone 2 — one clear step darker: emphasis, selection, chart bars */
  shadeStrong: string
  /** the canvas dot grid */
  grid: string
  /** selection UI — deliberately NOT the ink, so it reads against the art */
  select: string
  /**
   * This palette is the night version of one. The colours are the truth; the
   * flag is how the paper ladder knows which way "lighter" runs.
   */
  night?: true
}

export const THEMES = {
  "internet-blue": {
    label: "Internet blue",
    bg: "#FBFAF5",
    paper: "#FFFFFF",
    ink: "#2438FF",
    muted: "#6E7DFF",
    faint: "#BFC6FF",
    shade: "#EDEFFF",
    shadeStrong: "#D3D7FF",
    grid: "#E6E1D3",
    select: "#A200FF",
  },
  "riso-red": {
    label: "Riso red",
    bg: "#FCFAF7",
    paper: "#FFFFFF",
    ink: "#E0342B",
    muted: "#EE7B72",
    faint: "#F7B9B3",
    shade: "#FDEFEE",
    shadeStrong: "#F9D6D5",
    grid: "#E8E0D3",
    select: "#2438FF",
  },
  "terminal-green": {
    label: "Terminal green",
    bg: "#F8FBF7",
    paper: "#FFFFFF",
    ink: "#137A3D",
    muted: "#54A472",
    faint: "#A3CDB2",
    shade: "#ECF4EF",
    shadeStrong: "#D0E4D8",
    grid: "#D9E4D5",
    select: "#E8622F",
  },
  plum: {
    label: "Purple drizzle",
    bg: "#FCF9FC",
    paper: "#FFFFFF",
    ink: "#71268A",
    muted: "#A566B8",
    faint: "#D0AADB",
    shade: "#F4EEF6",
    shadeStrong: "#E3D4E8",
    grid: "#E7DFE9",
    select: "#D9A441",
  },
  marigold: {
    label: "Dirty blond",
    bg: "#FDFAF2",
    paper: "#FFFFFF",
    ink: "#B26A0F",
    muted: "#D69B4E",
    faint: "#EDCC96",
    shade: "#F9F3EC",
    shadeStrong: "#F0E1CF",
    grid: "#EAE0C7",
    select: "#2438FF",
  },
  graphite: {
    label: "Hipster black",
    bg: "#FCFCFA",
    paper: "#FFFFFF",
    ink: "#2D2A26",
    muted: "#8A857D",
    faint: "#C9C4BB",
    shade: "#EEEEEE",
    shadeStrong: "#D5D4D4",
    grid: "#E2DDD3",
    select: "#E0653A",
  },
} satisfies Record<string, Palette>

/**
 * The night ink for each palette: three values, not nine.
 *
 * A night theme is the day palette with ink and paper traded places, and the
 * rest of the ladder still follows the rule at the top of this file: the two
 * shades are the ink mixed into the paper, the secondary text is the ink mixed
 * into the sheet. So only the sheet, the ink and the selection colour are
 * chosen by hand; everything between them is derived, and retuning one palette
 * cannot leave a stray fill behind.
 *
 * None of these are black, white or fully saturated. A warm off-white ink on a
 * hue-tinted charcoal keeps the risograph feel at night, and the one bright
 * element stays the ink itself, which is what the drawing is made of.
 */
const NIGHT: Record<ThemeName, { bg: string; ink: string; select: string }> = {
  "internet-blue": { bg: "#101322", ink: "#8B9BFF", select: "#C77DFF" },
  "riso-red": { bg: "#1A1211", ink: "#FF8477", select: "#7FA5FF" },
  "terminal-green": { bg: "#0E1712", ink: "#63D992", select: "#F1975A" },
  plum: { bg: "#17111C", ink: "#CE93E4", select: "#E8C46B" },
  marigold: { bg: "#191307", ink: "#F2B964", select: "#7FA5FF" },
  graphite: { bg: "#121110", ink: "#E9E4DA", select: "#F0925F" },
}

export type ThemeName = keyof typeof THEMES

export const THEME_NAMES = Object.keys(THEMES) as ThemeName[]
export const DEFAULT_THEME: ThemeName = "internet-blue"

/**
 * The face the canvas letters in — the "is this decided yet" dial.
 *
 * Hand says nothing is settled. Sans and serif are the two ways a wireframe
 * starts admitting it might ship, and picking between them is a real question
 * early on, which is why it's a choice of three rather than a switch.
 */
export type FontMode = "hand" | "sans" | "serif"
export const DEFAULT_FONT: FontMode = "hand"

/** What each mode puts in --sq-font. */
export const FONT_FAMILY: Record<FontMode, string> = {
  hand: "var(--font-sketch)",
  sans: "var(--font-sans)",
  serif: "var(--font-serif)",
}

/**
 * The same three faces by name, for markup that leaves the page — an SVG
 * rendered from node has no next/font variables to resolve. The families match
 * what app/layout.tsx loads; the fallbacks are what a viewer without them draws.
 */
export const FONT_STACK: Record<FontMode, string> = {
  hand: "'Patrick Hand', 'Comic Sans MS', cursive",
  sans: "Geist, system-ui, sans-serif",
  serif: "'Source Serif 4', Georgia, serif",
}

// ---------------------------------------------------------------------------
// Paper.
//
// Each palette ships one sheet colour — the warm off-white it was drawn
// against. This is the dial off it: bleach it to pure white for a screenshot,
// leave it as authored, or take it a step down toward the grid so a
// mostly-white wireframe has something to sit on.
//
// It moves --sq-bg only. --sq-paper, the opaque fill a card uses to occlude
// what's behind it, stays the palette's white: darkening the sheet is exactly
// how you make those cards lift off it.
// ---------------------------------------------------------------------------

export type PaperShade = "white" | "subtle" | "shaded"
export const DEFAULT_PAPER: PaperShade = "subtle"

export const PAPER_SHADES: readonly { value: PaperShade; label: string }[] = [
  { value: "white", label: "White" },
  { value: "subtle", label: "Subtle" },
  { value: "shaded", label: "Shaded" },
]

/** Linear blend of two hex colours — `t` of `b` into `a`. */
function mix(a: string, b: string, t: number): string {
  const hex = (s: string) => {
    const v = s.replace("#", "")
    const n = v.length === 3 ? v.split("").map((c) => c + c).join("") : v
    return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)]
  }
  const [r1, g1, b1] = hex(a)
  const [r2, g2, b2] = hex(b)
  const c = (x: number, y: number) => Math.round(x + (y - x) * t)
  return `#${[c(r1, r2), c(g1, g2), c(b1, b2)].map((n) => n.toString(16).padStart(2, "0")).join("")}`
}

/**
 * The sheet colour: what sits behind the whole drawing.
 *
 * At night the ladder runs the other way, because the grid colour is a lift off
 * the sheet rather than a step down from it. So the same two expressions give
 * the right direction in both rooms: white lifts a hair toward white, shaded
 * takes a step toward the grid, and the middle shade is the authored sheet.
 */
export function bgOf(p: Palette, shade: PaperShade): string {
  if (shade === "white") return p.night ? mix(p.bg, "#FFFFFF", 0.05) : "#FFFFFF"
  // far enough toward the grid colour to read as a choice — at half that, the
  // three shades look like the same white three times
  if (shade === "shaded") return mix(p.bg, p.grid, 0.7)
  return p.bg
}

/** The dot grid, kept readable against whatever the sheet just became. */
function gridOf(p: Palette, shade: PaperShade): string {
  return shade === "shaded" ? mix(p.grid, p.ink, 0.15) : p.grid
}

/**
 * A palette by name, in the day or the night room.
 *
 * Derived on each call rather than cached, because a palette is ten strings and
 * a mix, and a cache keyed by name plus mode is one more thing that can be
 * stale after a hot reload. Retune a night ink and every derived tone moves
 * with it, which is the point of choosing only three.
 */
export function paletteOf(name: string, night = false): Palette {
  const key = name in THEMES ? (name as ThemeName) : DEFAULT_THEME
  const p = THEMES[key]
  if (!night) return p
  const n = NIGHT[key]
  const paper = mix(n.bg, n.ink, 0.055)
  return {
    label: p.label,
    bg: n.bg,
    paper,
    ink: n.ink,
    muted: mix(n.bg, n.ink, 0.62),
    faint: mix(n.bg, n.ink, 0.32),
    // the same rule as the day ladder: ink mixed into the paper it sits on
    shade: mix(paper, n.ink, 0.08),
    shadeStrong: mix(paper, n.ink, 0.2),
    grid: mix(n.bg, n.ink, 0.14),
    select: n.select,
    night: true,
  }
}

// ---------------------------------------------------------------------------
// The room.
//
// Light or dark belongs to the app, not to the drawing: two documents opened
// side by side share one room, and a drawing opened on somebody else's dark
// laptop is still the same drawing. So the choice lives in prefs, never in a
// .squig.json, and the palette it paints is the same palette in its night form.
// ---------------------------------------------------------------------------

export type Appearance = "light" | "dark" | "system"
export const DEFAULT_APPEARANCE: Appearance = "system"

/** The preference the two callers and the pre-paint script both listen to. */
export const SYSTEM_DARK_QUERY = "(prefers-color-scheme: dark)"

/**
 * Which room to paint, from the setting and what the system says.
 *
 * Pure so the three-way choice can be checked without a browser in the room;
 * `systemPrefersDark` below is the only part that reaches for one.
 */
export function isDark(appearance: Appearance, systemDark: boolean): boolean {
  return appearance === "dark" || (appearance === "system" && systemDark)
}

/** What the system says right now: false where there is no window to ask,
    and false for the partial window a node test stubs. */
export function systemPrefersDark(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false
  return window.matchMedia(SYSTEM_DARK_QUERY).matches
}

// ---------------------------------------------------------------------------
// The look.
//
// Ink, paper, font and grid belong to the drawing, not to the app: a red
// marker-on-white flow chart and a graphite-on-shaded interface study are two
// documents you keep side by side, and opening one shouldn't repaint the other.
// So a look is saved inside the document, and the last one you set is only the
// default a NEW document starts from.
// ---------------------------------------------------------------------------

export interface Look {
  theme: ThemeName
  paper: PaperShade
  font: FontMode
  /** the canvas dot grid is drawn */
  grid: boolean
}

export const DEFAULT_LOOK: Look = {
  theme: DEFAULT_THEME,
  paper: DEFAULT_PAPER,
  font: DEFAULT_FONT,
  grid: true,
}

/** Write a look onto the document element, in the room it is in. `grid` is
    drawn by the canvas, not by a custom property, so it is the one part this
    doesn't touch. The `dark` class is set here rather than beside it so the
    canvas and the chrome can never end up in two different rooms. */
export function applyLook({ theme, font, paper }: Look, dark: boolean) {
  if (typeof document === "undefined") return
  const p = paletteOf(theme, dark)
  const root = document.documentElement
  root.style.setProperty("--sq-bg", bgOf(p, paper))
  root.style.setProperty("--sq-paper", p.paper)
  root.style.setProperty("--sq-ink", p.ink)
  root.style.setProperty("--sq-muted", p.muted)
  root.style.setProperty("--sq-faint", p.faint)
  root.style.setProperty("--sq-shade", p.shade)
  root.style.setProperty("--sq-shade-strong", p.shadeStrong)
  root.style.setProperty("--sq-grid", gridOf(p, paper))
  root.style.setProperty("--sq-select", p.select)
  root.style.setProperty("--sq-font", FONT_FAMILY[font] ?? FONT_FAMILY.hand)
  root.classList.toggle("dark", dark)
}

// -- a look from somewhere else ----------------------------------------------

/** A palette that has since been renamed or retired must not take the app down. */
function knownTheme(t: unknown): ThemeName {
  return typeof t === "string" && t in THEMES ? (t as ThemeName) : DEFAULT_THEME
}

function knownFont(f: unknown): FontMode {
  // "clean" was the old name for the one non-hand face, back when there was one
  if (f === "clean") return "sans"
  return f === "hand" || f === "sans" || f === "serif" ? f : DEFAULT_FONT
}

function knownPaper(s: unknown): PaperShade {
  return s === "white" || s === "subtle" || s === "shaded" ? s : DEFAULT_PAPER
}

/** A prefs blob written before the room existed reads as `system`. */
export function knownAppearance(a: unknown): Appearance {
  return a === "light" || a === "dark" || a === "system" ? a : DEFAULT_APPEARANCE
}

/**
 * A look from storage, with every field vouched for. A field that is missing or
 * no longer valid — a palette we retired, a font mode we renamed — comes from
 * `fallback` rather than taking the canvas down with it.
 */
export function knownLook(v: unknown, fallback: Look): Look {
  const l = (v ?? {}) as Partial<Look>
  return {
    theme: l.theme === undefined ? fallback.theme : knownTheme(l.theme),
    paper: l.paper === undefined ? fallback.paper : knownPaper(l.paper),
    font: l.font === undefined ? fallback.font : knownFont(l.font),
    // the grid is on unless someone turned it off
    grid: typeof l.grid === "boolean" ? l.grid : fallback.grid,
  }
}
