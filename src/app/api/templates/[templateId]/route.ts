/**
 * DELETE /api/templates/[templateId] → delete a template
 */
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/server'
import { db } from '@/lib/db'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response
  const profile = auth.value.profile
  const { templateId } = await params

  try {
    // Defense-in-depth: only the creator can delete their own template.
    // NOTE: RLS does NOT enforce this for the app — Prisma connects as the
    // table-owner role, which bypasses RLS entirely (see rls-policies.sql
    // header, S1). This check is the only enforcement that exists.
    const tpl = await db.eventTemplate.findUnique({ where: { id: templateId }, select: { createdById: true } })
    if (!tpl) return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    if (tpl.createdById !== profile.id) {
      return NextResponse.json({ error: 'Only the creator can delete this template' }, { status: 403 })
    }

    await db.eventTemplate.delete({ where: { id: templateId } })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Template DELETE error:', err)
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 })
  }
}
