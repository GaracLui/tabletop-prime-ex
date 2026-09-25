#!/usr/bin/env node
/**
 * i18n-sort.mjs — sorts keys alphabetically within each section of en.json
 * and es.json.
 *
 * Why: alphabetically-sorted keys are easier to find (Ctrl+F works
 * predictably), produce cleaner git diffs (new keys insert in a stable
 * position), and reduce merge conflicts (two people adding keys to
 * different parts of the same section rarely touch the same lines).
 *
 * Usage:
 *   node scripts/i18n-sort.mjs          # sort + write back
 *   node scripts/i18n-sort.mjs --check  # exit 1 if not sorted (CI mode)
 *
 * The sort is recursive — nested objects (e.g. dashboard.metadata) are
 * also sorted. String values are left untouched; only key order changes.
 */
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const EN_PATH = join(ROOT, 'src/messages/en.json')
const ES_PATH = join(ROOT, 'src/messages/es.json')
const checkOnly = process.argv.includes('--check')

/**
 * Recursively sort an object's keys alphabetically.
 * Returns a new object with keys in sorted order.
 * Nested objects are sorted recursively.
 * Non-object values (strings, numbers, arrays) are returned as-is.
 */
function sortObjectKeys(obj) {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj
  }
  const sorted = {}
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = sortObjectKeys(obj[key])
  }
  return sorted
}

function processFile(path) {
  const original = readFileSync(path, 'utf8')
  const parsed = JSON.parse(original)
  const sorted = sortObjectKeys(parsed)
  const formatted = JSON.stringify(sorted, null, 2) + '\n'

  if (original === formatted) {
    console.log(`  ✅ ${path.split('/').pop()} — already sorted`)
    return false
  } else if (checkOnly) {
    console.log(`  ❌ ${path.split('/').pop()} — NOT sorted (run: npm run i18n:sort)`)
    return true
  } else {
    writeFileSync(path, formatted, 'utf8')
    console.log(`  🔧 ${path.split('/').pop()} — sorted`)
    return true
  }
}

console.log(checkOnly ? 'Checking key sort order...' : 'Sorting i18n keys...')

const enChanged = processFile(EN_PATH)
const esChanged = processFile(ES_PATH)

if (checkOnly && (enChanged || esChanged)) {
  process.exit(1)
}
