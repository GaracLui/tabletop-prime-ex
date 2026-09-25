#!/usr/bin/env node
/**
 * i18n-check.mjs — validates i18n consistency across the codebase.
 *
 * Three checks:
 *   1. PARITY  — en.json and es.json must have identical key sets.
 *   2. MISSING — keys used in t('...') calls but missing from en.json.
 *   3. UNUSED  — keys in en.json but never referenced in any src/ file.
 *
 * Usage:
 *   node scripts/i18n-check.mjs           # full report
 *   node scripts/i18n-check.mjs --quiet   # only print if issues found
 *
 * Exit code: 1 on BLOCKING issues only (PARITY mismatch or MISSING keys) —
 * these render broken UI and gate CI. UNUSED keys are advisory: they are
 * reported but do not affect the exit code (purge is tracked separately).
 *
 * Limitations:
 *   - Dynamic t() calls like t(`dashboard.round${n}`) are not statically
 *     resolvable. If you use dynamic keys, the MISSING check won't catch
 *     typos in the dynamic part. The UNUSED check still works because it
 *     searches for the key string literally anywhere in src/.
 *   - Keys referenced only via format helpers (formatScoreState etc.)
 *     won't appear in t() calls, but WILL be found by the UNUSED check
 *     because the key string appears as a literal in format.ts.
 */
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, extname, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const EN_PATH = join(ROOT, 'src/messages/en.json')
const ES_PATH = join(ROOT, 'src/messages/es.json')
const SRC_DIR = join(ROOT, 'src')

const quiet = process.argv.includes('--quiet')

// ---------------------------------------------------------------------------
// Load + flatten JSON
// ---------------------------------------------------------------------------

function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

/**
 * Recursively flatten a nested JSON object into dot-notation keys.
 * { a: { b: { c: "x" } } } → ["a.b.c"]
 * Arrays are not expected in i18n files; if found, their indices are used.
 */
function flattenKeys(obj, prefix = '') {
  const keys = []
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...flattenKeys(v, path))
    } else {
      keys.push(path)
    }
  }
  return keys
}

const en = loadJson(EN_PATH)
const es = loadJson(ES_PATH)
const enKeys = new Set(flattenKeys(en))
const esKeys = new Set(flattenKeys(es))

// ---------------------------------------------------------------------------
// Collect all source file contents
// ---------------------------------------------------------------------------

function walkDir(dir, exts) {
  const results = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      results.push(...walkDir(full, exts))
    } else if (exts.includes(extname(full))) {
      results.push(full)
    }
  }
  return results
}

const sourceFiles = walkDir(SRC_DIR, ['.ts', '.tsx'])
const fileContents = new Map()
for (const f of sourceFiles) {
  fileContents.set(f, readFileSync(f, 'utf8'))
}

// ---------------------------------------------------------------------------
// Check 1: PARITY — en ↔ es key sync
// ---------------------------------------------------------------------------

const inEnNotEs = [...enKeys].filter((k) => !esKeys.has(k)).sort()
const inEsNotEn = [...esKeys].filter((k) => !enKeys.has(k)).sort()

// ---------------------------------------------------------------------------
// Check 2: MISSING — t('...') calls in code but key missing from en.json
// ---------------------------------------------------------------------------

/**
 * Extract all t('literal') and t("literal") calls from source.
 * Returns a Set of key strings.
 *
 * Also catches t(`literal`) template literals WITHOUT interpolation —
 * t(`dashboard.round${n}`) is dynamic and skipped (can't resolve statically).
 */
function extractTKeys(contents) {
  const keys = new Set()
  // Matches: t('key'), t("key"), t(  'key'  )
  // Also matches: t(`key`) when the template has no ${...} interpolation
  const re = /\bt\(\s*(['"`])([^'"`]+)\1/g
  let match
  while ((match = re.exec(contents)) !== null) {
    const key = match[2]
    // Only include strings that look like i18n keys (contain a dot)
    if (key.includes('.') && !key.includes(' ')) {
      keys.add(key)
    }
  }
  return keys
}

const usedKeys = new Set()
for (const [, contents] of fileContents) {
  for (const key of extractTKeys(contents)) {
    usedKeys.add(key)
  }
}

const missingFromEn = [...usedKeys].filter((k) => !enKeys.has(k)).sort()

// ---------------------------------------------------------------------------
// Check 3: UNUSED — keys in en.json but never referenced in any src/ file
// ---------------------------------------------------------------------------

/**
 * For each key in en.json, search for the literal key string anywhere in
 * src/. If it doesn't appear, the key is potentially unused.
 *
 * This catches both direct t('key') calls AND indirect references in
 * helper files like format.ts (where the key appears as a string literal
 * in a keyMap object).
 */
const unusedKeys = []
for (const key of enKeys) {
  let found = false
  for (const [, contents] of fileContents) {
    if (contents.includes(key)) {
      found = true
      break
    }
  }
  if (!found) unusedKeys.push(key)
}
unusedKeys.sort()

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

let hasIssues = false
let hasBlockingIssues = false
const sections = []

if (inEnNotEs.length > 0 || inEsNotEn.length > 0) {
  hasIssues = true
  hasBlockingIssues = true
  sections.push({
    title: 'PARITY — en.json ↔ es.json key mismatch',
    detail: [
      inEnNotEs.length > 0
        ? `  Keys in en.json but MISSING from es.json (${inEnNotEs.length}):\n` +
          inEnNotEs.map((k) => `    ${k}`).join('\n')
        : '',
      inEsNotEn.length > 0
        ? `  Keys in es.json but MISSING from en.json (${inEsNotEn.length}):\n` +
          inEsNotEn.map((k) => `    ${k}`).join('\n')
        : '',
    ].filter(Boolean).join('\n'),
  })
}

if (missingFromEn.length > 0) {
  hasIssues = true
  // BLOCKING: a t() call with a missing key renders the literal key string
  // to users (e.g. the hero CTA once displayed "landing.ctaDemo").
  hasBlockingIssues = true
  sections.push({
    title: `MISSING — t() calls referencing keys not in en.json (${missingFromEn.length})`,
    detail: missingFromEn.map((k) => `    ${k}`).join('\n'),
  })
}

if (unusedKeys.length > 0) {
  hasIssues = true
  sections.push({
    title: `UNUSED — keys in en.json not referenced in src/ (${unusedKeys.length})`,
    detail:
      '  (Potentially unused. Check for dynamic t() calls with template\n' +
      '   literals before deleting — those can\'t be detected statically.)\n' +
      unusedKeys.map((k) => `    ${k}`).join('\n'),
  })
}

if (!quiet || hasIssues) {
  console.log('═'.repeat(70))
  console.log('  i18n check — TableTop Prime')
  console.log('═'.repeat(70))
  console.log(`  en.json: ${enKeys.size} keys`)
  console.log(`  es.json: ${esKeys.size} keys`)
  console.log(`  source files scanned: ${sourceFiles.length}`)
  console.log(`  t() calls found: ${usedKeys.size} unique keys`)
  console.log('─'.repeat(70))

  if (sections.length === 0) {
    console.log('  ✅ All checks passed — en ↔ es in sync, no missing or unused keys.')
  } else {
    for (const s of sections) {
      console.log('\n  ' + s.title)
      console.log(s.detail)
    }
  }

  if (!hasBlockingIssues && hasIssues) {
    console.log('\n  ℹ️  UNUSED keys are advisory only — exit code is 0.')
  }
  console.log('\n' + '═'.repeat(70))
}

// Exit non-zero only on BLOCKING issues (PARITY / MISSING). A missing key
// ships broken UI, so it must fail the check even when --quiet is passed.
process.exit(hasBlockingIssues ? 1 : 0)
