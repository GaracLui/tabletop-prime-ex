#!/usr/bin/env node
/**
 * One-off migration script: replace NextAuth's getServerSession with
 * Supabase's getAuthProfile in all API route files.
 *
 * Run with: node scripts/migrate-to-supabase-auth.js
 */
const fs = require('fs')
const path = require('path')

// Simple recursive file finder (no glob dependency)
function findFiles(dir, pattern) {
  const results = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...findFiles(fullPath, pattern))
    } else if (entry.name.match(pattern)) {
      results.push(fullPath)
    }
  }
  return results
}

const files = findFiles(path.join(process.cwd(), 'src', 'app', 'api'), /\.ts$/)
let changed = 0

for (const filepath of files) {
  let content = fs.readFileSync(filepath, 'utf8')
  const original = content
  const file = path.relative(process.cwd(), filepath)

  // Skip files that don't use getServerSession
  if (!content.includes('getServerSession')) continue

  // Replace import: remove next-auth imports, add supabase import
  content = content.replace(
    /import \{ getServerSession \} from 'next-auth'\nimport \{ authOptions \} from '@\/lib\/auth\/auth-options'\n/g,
    "import { getAuthProfile } from '@/lib/supabase/clients'\n"
  )
  // Handle cases where imports are on one line or different order
  content = content.replace(
    /import \{ getServerSession \} from 'next-auth'\n/g,
    ''
  )
  content = content.replace(
    /import \{ authOptions \} from '@\/lib\/auth\/auth-options'\n/g,
    "import { getAuthProfile } from '@/lib/supabase/clients'\n"
  )

  // Replace the session check pattern:
  // Old:
  //   const session = await getServerSession(authOptions)
  //   if (!session?.user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  //   const userId = (session.user as { id: string }).id
  //
  // New:
  //   const profile = await getAuthProfile()
  //   if (!profile) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  //   const userId = profile.id
  content = content.replace(
    /const session = await getServerSession\(authOptions\)\n\s*if \(!session\?\.user\) return NextResponse\.json\(\{ error: 'Not authenticated' \}, \{ status: 401 \}\)\n\s*const userId = \(session\.user as \{ id: string \}\)\.id/g,
    "const profile = await getAuthProfile()\n  if (!profile) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })\n  const userId = profile.id"
  )

  // Also handle the "Not authenticated" without the userId line
  content = content.replace(
    /const session = await getServerSession\(authOptions\)\n\s*if \(!session\?\.user\) return NextResponse\.json\(\{ error: 'Not authenticated' \}, \{ status: 401 \}\)/g,
    "const profile = await getAuthProfile()\n  if (!profile) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })"
  )

  // Replace any remaining references to `session.user` with `profile`
  // (for the account routes that use session.user.name etc.)
  content = content.replace(
    /session\.user as \{ id: string \}\.id/g,
    'profile.id'
  )

  // Replace `const userId = (session.user as { id: string }).id` with `const userId = profile.id`
  content = content.replace(
    /const userId = \(session\.user as \{ id: string \}\)\.id/g,
    'const userId = profile.id'
  )

  // Replace remaining `session?.user` references
  content = content.replace(/session\?\.user/g, 'profile')
  content = content.replace(/session\.user/g, 'profile')

  if (content !== original) {
    fs.writeFileSync(filepath, content)
    changed++
    console.log(`✓ ${file}`)
  }
}

console.log(`\nDone. ${changed} files updated.`)
