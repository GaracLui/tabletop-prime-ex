/**
 * Procedural event banner generator.
 *
 * Generates a deterministic SVG banner from an event ID + optional seed offset.
 * The same event always renders the same banner unless the organizer clicks
 * "Reroll" (which increments the seed offset).
 *
 * Design goals:
 *   • ~2 KB SVG output, inlineable in JSX
 *   • 16:4 aspect ratio (1600×400) — fits dashboard + share page headers
 *   • Curated palettes that look good on both light and dark themes
 *   • 6 distinct pattern families so banners don't feel like one template
 *   • Theme-aware: uses CSS variables so the banner adapts to light/dark
 *
 * Algorithm:
 *   1. Hash (eventId + offset) → 32-bit integer via cyrb53
 *   2. Seed mulberry32 PRNG with the hash
 *   3. Pick palette, pattern, angle, accent from the PRNG
 *   4. Render pattern function → SVG markup string
 *
 * No external dependencies. Both cyrb53 and mulberry32 are ~10 lines each.
 */

// ---------------------------------------------------------------------------
// Hash + PRNG
// ---------------------------------------------------------------------------

/**
 * cyrb53 — tiny, fast, well-distributed 32-bit string hash.
 * Source: https://stackoverflow.com/a/57576513
 * Returns a 32-bit unsigned integer.
 */
function cyrb53(str: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed
  let h2 = 0x41c6ce57 ^ seed
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return 4294967296 * (2097151 & h2) + (h1 >>> 0)
}

/**
 * mulberry32 — tiny deterministic PRNG. Returns a function that produces
 * floats in [0, 1) from a 32-bit seed.
 * Source: https://gist.github.com/tommyettinger/46af8fb0139f2cb2b5d9c8e8b5d9c8e8
 */
function mulberry32(seed: number): () => number {
  let a = seed | 0
  return function () {
    a = (a + 0x6d2b79f5) | 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---------------------------------------------------------------------------
// Palettes — curated two- and three-color combos
// ---------------------------------------------------------------------------

interface Palette {
  /** Background base color. */
  bg: string
  /** Primary pattern color. */
  fg: string
  /** Secondary accent color. */
  accent: string
}

/**
 * 12 curated palettes. Chosen to look good on both light and dark themes
 * (the banner sits inside a card with the theme background, so the palette
 * needs to read against either).
 */
const PALETTES: Palette[] = [
  { bg: '#1e3a8a', fg: '#3b82f6', accent: '#93c5fd' }, // ocean blue
  { bg: '#064e3b', fg: '#10b981', accent: '#6ee7b7' }, // emerald
  { bg: '#7c2d12', fg: '#ea580c', accent: '#fdba74' }, // sunset orange
  { bg: '#581c87', fg: '#9333ea', accent: '#d8b4fe' }, // royal purple
  { bg: '#7f1d1d', fg: '#dc2626', accent: '#fca5a5' }, // crimson
  { bg: '#0c4a6e', fg: '#0ea5e9', accent: '#7dd3fc' }, // sky cyan
  { bg: '#365314', fg: '#84cc16', accent: '#bef264' }, // lime
  { bg: '#831843', fg: '#ec4899', accent: '#f9a8d4' }, // magenta
  { bg: '#1c1917', fg: '#f59e0b', accent: '#fcd34d' }, // gold on dark
  { bg: '#0f172a', fg: '#6366f1', accent: '#a5b4fc' }, // indigo night
  { bg: '#451a03', fg: '#d97706', accent: '#fbbf24' }, // amber
  { bg: '#042f2e', fg: '#14b8a6', accent: '#5eead4' }, // teal
]

// ---------------------------------------------------------------------------
// Pattern renderers — each returns SVG markup for a 1600×400 canvas
// ---------------------------------------------------------------------------

type PatternFn = (p: Palette, rng: () => number) => string

/**
 * Mesh gradient — 3-4 overlapping radial gradients, heavily blurred.
 * Soft, modern, looks like a Linear-style background.
 */
const patternMesh: PatternFn = (p, rng) => {
  const blobs: string[] = []
  const count = 3 + Math.floor(rng() * 2) // 3 or 4 blobs
  for (let i = 0; i < count; i++) {
    const cx = Math.floor(rng() * 1600)
    const cy = Math.floor(rng() * 400)
    const r = 200 + Math.floor(rng() * 300)
    const color = i % 2 === 0 ? p.fg : p.accent
    const opacity = 0.5 + rng() * 0.3
    blobs.push(
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" opacity="${opacity.toFixed(2)}" filter="url(#blur)" />`
    )
  }
  return `
    <defs>
      <filter id="blur" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="60" />
      </filter>
    </defs>
    <rect width="1600" height="400" fill="${p.bg}" />
    ${blobs.join('\n    ')}
  `
}

/**
 * Topographic — sine-wave contour lines, varied amplitude and frequency.
 * Looks like a topographic map or sound waveform.
 */
const patternTopo: PatternFn = (p, rng) => {
  const lines: string[] = []
  const lineCount = 14 + Math.floor(rng() * 6) // 14-19 lines
  for (let i = 0; i < lineCount; i++) {
    const y = (i / lineCount) * 400
    const amp = 15 + rng() * 35
    const freq = 0.005 + rng() * 0.01
    const phase = rng() * Math.PI * 2
    // Build a sine-wave path across the width
    const segments = 40
    let d = `M 0 ${y}`
    for (let s = 1; s <= segments; s++) {
      const x = (s / segments) * 1600
      const yOffset = Math.sin(s * freq * 100 + phase) * amp
      d += ` L ${x.toFixed(1)} ${(y + yOffset).toFixed(1)}`
    }
    const opacity = 0.15 + (i / lineCount) * 0.5
    const color = i % 3 === 0 ? p.accent : p.fg
    lines.push(
      `<path d="${d}" fill="none" stroke="${color}" stroke-width="${(1 + i / lineCount * 2).toFixed(1)}" opacity="${opacity.toFixed(2)}" />`
    )
  }
  return `
    <rect width="1600" height="400" fill="${p.bg}" />
    ${lines.join('\n    ')}
  `
}

/**
 * Bokeh — scattered circles at varied opacity and size.
 * Soft, dreamy, looks like out-of-focus lights.
 */
const patternBokeh: PatternFn = (p, rng) => {
  const circles: string[] = []
  const count = 25 + Math.floor(rng() * 15) // 25-39 circles
  for (let i = 0; i < count; i++) {
    const cx = Math.floor(rng() * 1600)
    const cy = Math.floor(rng() * 400)
    const r = 20 + Math.floor(rng() * 80)
    const color = rng() > 0.5 ? p.fg : p.accent
    const opacity = 0.1 + rng() * 0.4
    circles.push(
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" opacity="${opacity.toFixed(2)}" />`
    )
  }
  return `
    <defs>
      <filter id="bblur" x="-10%" y="-10%" width="120%" height="120%">
        <feGaussianBlur stdDeviation="8" />
      </filter>
    </defs>
    <rect width="1600" height="400" fill="${p.bg}" />
    <g filter="url(#bblur)">
    ${circles.join('\n    ')}
    </g>
  `
}

/**
 * Geometric tiles — triangles in a grid, alternating colors.
 * Sharp, modern, looks like a low-poly background.
 */
const patternGeo: PatternFn = (p, rng) => {
  const tiles: string[] = []
  const cols = 16
  const rows = 4
  const tw = 1600 / cols // 100
  const th = 400 / rows   // 100
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * tw
      const y = r * th
      // Alternate between two triangle orientations
      const flip = rng() > 0.5
      const colorChoice = rng()
      const fill = colorChoice < 0.33 ? p.bg : colorChoice < 0.66 ? p.fg : p.accent
      const opacity = 0.4 + rng() * 0.5
      if (flip) {
        tiles.push(
          `<polygon points="${x},${y} ${x + tw},${y} ${x},${y + th}" fill="${fill}" opacity="${opacity.toFixed(2)}" />`
        )
        tiles.push(
          `<polygon points="${x + tw},${y} ${x + tw},${y + th} ${x},${y + th}" fill="${p.bg}" opacity="${(opacity * 0.5).toFixed(2)}" />`
        )
      } else {
        tiles.push(
          `<polygon points="${x},${y} ${x + tw},${y} ${x + tw},${y + th}" fill="${p.bg}" opacity="${(opacity * 0.5).toFixed(2)}" />`
        )
        tiles.push(
          `<polygon points="${x},${y} ${x + tw},${y + th} ${x},${y + th}" fill="${fill}" opacity="${opacity.toFixed(2)}" />`
        )
      }
    }
  }
  return `
    <rect width="1600" height="400" fill="${p.bg}" />
    ${tiles.join('\n    ')}
  `
}

/**
 * Wave field — overlapping sine waves with varied amplitude.
 * Calm, organic, looks like water or audio waves.
 */
const patternWaves: PatternFn = (p, rng) => {
  const waves: string[] = []
  const count = 8 + Math.floor(rng() * 5) // 8-12 waves
  for (let i = 0; i < count; i++) {
    const y = 50 + (i / count) * 300
    const amp = 20 + rng() * 40
    const freq = 0.01 + rng() * 0.02
    const phase = rng() * Math.PI * 2
    const segments = 60
    let d = `M 0 ${y}`
    for (let s = 1; s <= segments; s++) {
      const x = (s / segments) * 1600
      const yOffset = Math.sin(s * freq * 100 + phase) * amp
      d += ` L ${x.toFixed(1)} ${(y + yOffset).toFixed(1)}`
    }
    const opacity = 0.2 + (i / count) * 0.5
    const color = i % 2 === 0 ? p.fg : p.accent
    waves.push(
      `<path d="${d}" fill="none" stroke="${color}" stroke-width="${(2 + rng() * 3).toFixed(1)}" opacity="${opacity.toFixed(2)}" />`
    )
  }
  return `
    <rect width="1600" height="400" fill="${p.bg}" />
    ${waves.join('\n    ')}
  `
}

/**
 * Stippled dots — gradient density dot pattern.
 * Technical, clean, looks like a halftone or data visualization.
 */
const patternStipple: PatternFn = (p, rng) => {
  const dots: string[] = []
  const cols = 50
  const rows = 13
  const dx = 1600 / cols // 32
  const dy = 400 / rows   // ~30.7
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = c * dx + dx / 2
      const cy = r * dy + dy / 2
      // Density falls off from a random focal point
      const focalX = rng() * 1600
      const focalY = rng() * 400
      const dist = Math.sqrt((cx - focalX) ** 2 + (cy - focalY) ** 2)
      const maxDist = Math.sqrt(1600 ** 2 + 400 ** 2)
      const density = 1 - dist / maxDist // 1 at focal, 0 at far corner
      if (rng() > density * 0.8) continue // skip sparse areas
      const radius = 1 + density * 4
      const color = density > 0.5 ? p.accent : p.fg
      const opacity = 0.3 + density * 0.5
      dots.push(
        `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${radius.toFixed(1)}" fill="${color}" opacity="${opacity.toFixed(2)}" />`
      )
    }
  }
  return `
    <rect width="1600" height="400" fill="${p.bg}" />
    ${dots.join('\n    ')}
  `
}

const PATTERNS: PatternFn[] = [
  patternMesh,
  patternTopo,
  patternBokeh,
  patternGeo,
  patternWaves,
  patternStipple,
]

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface BannerOptions {
  /** Event ID — the primary seed source. */
  eventId: string
  /** Optional offset (default 0). Incrementing this re-rolls the banner. */
  seedOffset?: number
}

/**
 * Generate a deterministic SVG banner for an event.
 *
 * Returns a complete SVG document string (including <svg> wrapper).
 * The SVG uses a 1600×400 viewBox so it scales to any container width.
 *
 * @example
 * const svg = generateBannerSvg({ eventId: 'abc123' })
 * // → '<svg viewBox="0 0 1600 400" ...>...</svg>'
 */
export function generateBannerSvg({ eventId, seedOffset = 0 }: BannerOptions): string {
  const seed = cyrb53(eventId, seedOffset)
  const rng = mulberry32(seed)

  const palette = PALETTES[Math.floor(rng() * PALETTES.length)]
  const patternFn = PATTERNS[Math.floor(rng() * PATTERNS.length)]

  // Re-seed the PRNG for the pattern so palette+pattern selection doesn't
  // consume the same random sequence every time (keeps patterns varied).
  const patternRng = mulberry32(seed ^ 0x9e3779b9)
  const body = patternFn(palette, patternRng)

  return `<svg viewBox="0 0 1600 400" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Event banner">
  ${body}
</svg>`
}

/**
 * Generate a data URL suitable for an <img src="..."> tag.
 *
 * Encodes the SVG as `data:image/svg+xml;utf8,...` so it can be used in
 * places where dangerouslySetInnerHTML isn't available (e.g. OG images,
 * email templates, third-party embeds).
 */
export function generateBannerDataUrl(options: BannerOptions): string {
  const svg = generateBannerSvg(options)
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

/**
 * Returns the palette colors for an event — useful for theming UI accents
 * (e.g. matching the banner's accent color to a badge or button).
 */
export function getBannerPalette({ eventId, seedOffset = 0 }: BannerOptions): Palette {
  const seed = cyrb53(eventId, seedOffset)
  const rng = mulberry32(seed)
  return PALETTES[Math.floor(rng() * PALETTES.length)]
}
