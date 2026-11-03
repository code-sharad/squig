// ---------------------------------------------------------------------------
// A word on a line, and the paper pad that interrupts it.
//
// A connector's label and a named boundary's edge label are the same object:
// one run of words on an opaque pad the line breaks around. Two copies of that
// geometry would drift into two slightly different pads, so both callers come
// through here.
// ---------------------------------------------------------------------------

import { textWidth, type InkColor, type Prim } from "./kit"

/** One run of words, centred on the point it was asked for. */
export interface LabelPad {
  x: number
  y: number
  w: number
  h: number
}

/** Line box as a multiple of the type size, the same ratio text nodes use. */
const LINE = 1.35
/** How much paper sits above and below the words. */
const PAD = 4
/**
 * Erring wide is deliberate: too wide only hides a little more line, too
 * narrow reads as a broken render. The inset is the paper either side of the
 * words on top of that.
 */
const SLACK = 1.15
const INSET = 8

/** The pad a label of this size needs, centred on a point. */
export function labelPadBox(label: string, size: number, center: { cx: number; cy: number }): LabelPad {
  const w = textWidth(label, size) * SLACK + INSET
  const h = size * LINE + PAD
  return { x: center.cx - w / 2, y: center.cy - h / 2, w, h }
}

/**
 * The pad first, then its words, so the words print on the paper rather than
 * under the dash the pad is there to interrupt.
 */
export function labelPadPrims(pad: LabelPad, label: string, size: number, color?: InkColor): Prim[] {
  return [
    { t: "rect", x: pad.x, y: pad.y, w: pad.w, h: pad.h, o: { fill: "solid", fillColor: "paper", strokeWidth: 0 } },
    {
      t: "text",
      x: pad.x + pad.w / 2,
      // a baseline sits a touch under the centre of the line box
      y: pad.y + pad.h / 2 + size * 0.35,
      text: label,
      size,
      align: "center",
      ...(color ? { color } : {}),
    },
  ]
}
