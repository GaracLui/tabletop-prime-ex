'use client'

/**
 * Scoring rules tab — editable placement points, modifiers, and tiebreakers.
 * Extracted from dashboard-view.tsx.
 *
 * Component structure:
 *   - ScoringConfigApi        (orchestrator + Save/Reset)
 *   - PlacementPointsEditor   (1st/2nd/3rd… points list)
 *   - ModifiersEditor         (stackable modifier list)
 *   - TiebreakersEditor       (ordered tiebreaker list with reorder + add)
 */
import * as React from 'react'
import { Save, PlusCircle, Trash, ChevronUp, ChevronDown, AlertTriangle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useI18n } from '@/hooks/use-i18n'
import { useEvent, useUpdateEvent } from '@/hooks/use-event-data'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

// ---------------------------------------------------------------------------
// Constants — shared option lists
// ---------------------------------------------------------------------------

export const TIEBREAKER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'TOTAL_GAME_POINTS', label: 'dashboard.tiebreakerTotalGamePoints' },
  { value: 'TABLE_STRENGTH', label: 'dashboard.tiebreakerTableStrength' },
  { value: 'FIRST_PLACES', label: 'dashboard.tiebreakerFirstPlaces' },
  { value: 'BEST_PLACEMENT', label: 'dashboard.tiebreakerBestPlacement' },
  { value: 'DROP_WORST_ROUND', label: 'dashboard.tiebreakerDropWorstRound' },
]

export const MODIFIER_TYPES: Array<{ value: string; label: string }> = [
  { value: 'ATTENDANCE_BONUS', label: 'dashboard.modAttendance' },
  { value: 'FINAL_ROUND_MULTIPLIER', label: 'dashboard.modFinal' },
  { value: 'FLAT_BONUS', label: 'dashboard.modFlat' },
  { value: 'MULTIPLIER', label: 'dashboard.modMultiplier' },
  { value: 'CUSTOM', label: 'dashboard.modCustom' },
]

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ScoringConfigApi({ eventId }: { eventId: string }) {
  const { t } = useI18n()
  const { data } = useEvent(eventId)
  const updateEvent = useUpdateEvent(eventId)
  const { toast } = useToast()
  const event = data?.event
  const [rules, setRules] = React.useState<any | null>(null)
  const [dirty, setDirty] = React.useState(false)
  const [showTiebreakerWarning, setShowTiebreakerWarning] = React.useState(false)

  // Sync local rules state when event loads
  React.useEffect(() => {
    if (event?.scoringRules) {
      setRules(JSON.parse(JSON.stringify(event.scoringRules)))
      setDirty(false)
    }
  }, [event?.scoringRules])

  if (!event) return <div className="animate-pulse text-muted-foreground">{t('common.loading')}</div>
  if (!rules) return null

  const patch = (updater: (r: any) => void) => {
    setRules((prev: any) => {
      const next = JSON.parse(JSON.stringify(prev))
      updater(next)
      return next
    })
    setDirty(true)
  }

  // Check if there are any LOCKED or DISPUTED scores (rounds that have been
  // scored and committed). If so, changing tiebreakers will retroactively
  // re-rank those rounds — we warn the organizer before saving.
  const hasLockedScores = (event.scores || []).some(
    (s: any) => s.state === 'LOCKED' || s.state === 'DISPUTED'
  )

  // Check if the tiebreaker list specifically changed (not just placement
  // points or modifiers — those are frozen at submission and don't have a
  // retroactive effect).
  const originalTiebreakers = event.scoringRules?.tiebreakers || []
  const currentTiebreakers = rules.tiebreakers || []
  const tiebreakersChanged =
    JSON.stringify(originalTiebreakers) !== JSON.stringify(currentTiebreakers)

  // Whether to show the warning before saving.
  const needsTiebreakerWarning = hasLockedScores && tiebreakersChanged

  const doSave = async () => {
    try {
      await updateEvent.mutateAsync({ scoringRules: rules })
      toast({ title: t('dashboard.rulesSaved') })
      setDirty(false)
      setShowTiebreakerWarning(false)
    } catch (err: any) {
      toast({ title: err.message || t('dashboard.saveFailed'), variant: 'destructive' })
    }
  }

  const handleSave = () => {
    if (needsTiebreakerWarning) {
      setShowTiebreakerWarning(true)
    } else {
      doSave()
    }
  }

  const handleReset = () => {
    if (event.scoringRules) {
      setRules(JSON.parse(JSON.stringify(event.scoringRules)))
      setDirty(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-lg">{t('dashboard.tabs.scoring')}</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">{t('dashboard.scoringRulesHint')}</p>
        </div>
        <div className="flex gap-2">
          {dirty && (
            <Button size="sm" variant="ghost" onClick={handleReset}>{t('common.reset')}</Button>
          )}
          <Button size="sm" onClick={handleSave} disabled={!dirty || updateEvent.isPending}>
            <Save className="mr-1.5 h-3.5 w-3.5" /> {t('dashboard.saveRules')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <PlacementPointsEditor rules={rules} patch={patch} />
        <ModifiersEditor rules={rules} patch={patch} totalRounds={event.totalRounds} />
        <TiebreakersEditor rules={rules} patch={patch} />
      </CardContent>

      {/* Tiebreaker warning — shown when the organizer changes tiebreakers on
          an event that already has LOCKED/DISPUTED scores. The audit found
          that tiebreakers are live-recomputed at sort time, so changing them
          retroactively re-ranks players in already-scored rounds. This dialog
          warns the organizer before they accidentally change results. */}
      <AlertDialog open={showTiebreakerWarning} onOpenChange={setShowTiebreakerWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" aria-hidden="true" />
              {t('dashboard.tiebreakerWarningTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('dashboard.tiebreakerWarningBody')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowTiebreakerWarning(false)}>
              {t('dashboard.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={doSave}
              disabled={updateEvent.isPending}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {t('dashboard.tiebreakerWarningConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Placement points editor
// ---------------------------------------------------------------------------

function PlacementPointsEditor({ rules, patch }: { rules: any; patch: (u: (r: any) => void) => void }) {
  const { t } = useI18n()
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t('dashboard.placementPoints')}</Label>
        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs"
          onClick={() => patch((r) => r.placementPoints.push(0))}>
          <PlusCircle className="mr-1 h-3 w-3" /> {t('dashboard.addPlacement')}
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {rules.placementPoints.map((pts: number, idx: number) => (
          <div key={idx} className="space-y-1">
            <span className="text-xs text-muted-foreground">{idx + 1}{idx === 0 ? t('common.ordinalSt') : idx === 1 ? t('common.ordinalNd') : idx === 2 ? t('common.ordinalRd') : t('common.ordinalTh')}</span>
            <div className="flex items-center gap-1">
              <Input type="number" inputMode="decimal" step="any" value={pts} className="w-16"
                onChange={(e) => {
                  const n = Number(e.target.value)
                  patch((r) => { r.placementPoints[idx] = isNaN(n) ? 0 : n })
                }} />
              {rules.placementPoints.length > 1 && (
                <Button size="sm" variant="ghost" className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
                  aria-label={t('common.delete')}
                  onClick={() => patch((r) => { r.placementPoints.splice(idx, 1) })}>
                  <Trash className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Tie score mode */}
      <div className="mt-3 rounded-md border border-border/60 bg-muted/20 px-3 py-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t('dashboard.tieScoring')}</Label>
        <p className="mt-1 text-xs text-muted-foreground">
          {t('dashboard.tieScoringDesc')}
        </p>
        {/* v6: stack on mobile (flex-col) so each button gets its own row;
            inline on sm+ (sm:flex-row) for desktop. w-full on mobile makes the
            buttons span the full width — easier to tap. */}
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <Button
            size="sm"
            variant={(!rules.tieScoreMode || rules.tieScoreMode === 'SHARED') ? 'default' : 'outline'}
            onClick={() => patch((r) => { r.tieScoreMode = 'SHARED' })}
            className="text-xs w-full sm:w-auto"
          >
            {t('dashboard.tieModeShared')}
          </Button>
          <Button
            size="sm"
            variant={rules.tieScoreMode === 'SPLIT' ? 'default' : 'outline'}
            onClick={() => patch((r) => { r.tieScoreMode = 'SPLIT' })}
            className="text-xs w-full sm:w-auto"
          >
            {t('dashboard.tieModeSplit')}
          </Button>
        </div>
        {rules.tieScoreMode === 'SPLIT' && (
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
            {t('dashboard.tieSplitExample')}
          </p>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Modifiers editor
// ---------------------------------------------------------------------------

function ModifiersEditor({ rules, patch, totalRounds }: { rules: any; patch: (u: (r: any) => void) => void; totalRounds: number }) {
  const { t } = useI18n()
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t('dashboard.modifiersStackable')}</Label>
        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs"
          onClick={() => patch((r) => r.modifiers.push({ id: `mod_${Date.now()}`, type: 'FLAT_BONUS', label: t('dashboard.modifierNewLabel'), value: 0, appliesTo: 'ALL' }))}>
          <PlusCircle className="mr-1 h-3 w-3" /> {t('dashboard.addModifier')}
        </Button>
      </div>
      {rules.modifiers.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">{t('dashboard.noModifiers')}</p>
      ) : (
        <ul className="space-y-2">
          {rules.modifiers.map((mod: any, idx: number) => (
            <ModifierRow key={mod.id || idx} mod={mod} idx={idx} patch={patch} totalRounds={totalRounds} />
          ))}
        </ul>
      )}
    </div>
  )
}

function ModifierRow({ mod, idx, patch, totalRounds }: { mod: any; idx: number; patch: (u: (r: any) => void) => void; totalRounds: number }) {
  const { t } = useI18n()
  return (
    <li className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_80px_120px_32px] gap-2 items-end rounded-md border border-border/60 bg-muted/30 px-3 py-2">
      <div>
        <span className="text-xs text-muted-foreground">{t('dashboard.modifierType')}</span>
        <Select value={mod.type} onValueChange={(v) => patch((r) => { r.modifiers[idx].type = v })}>
          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MODIFIER_TYPES.map((mt) => <SelectItem key={mt.value} value={mt.value}>{t(mt.label)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <span className="text-xs text-muted-foreground">{t('dashboard.modifierLabel')}</span>
        <Input value={mod.label} className="h-8 text-sm"
          onChange={(e) => patch((r) => { r.modifiers[idx].label = e.target.value })} />
      </div>
      <div>
        <span className="text-xs text-muted-foreground">{t('dashboard.modifierValue')}</span>
        <Input
          type="number"
          inputMode="decimal"
          step="any"
          value={mod.value}
          className="h-8 text-sm"
          onChange={(e) => {
            const n = Number(e.target.value)
            // Guard against NaN — if the browser doesn't normalize comma
            // decimals (e.g. "2,4" in some locales), Number() returns NaN.
            // Store 0 as a safe fallback so scores don't silently corrupt.
            patch((r) => { r.modifiers[idx].value = isNaN(n) ? 0 : n })
          }}
        />
      </div>
      <div>
        <span className="text-xs text-muted-foreground">{t('dashboard.modifierAppliesTo')}</span>
        <Select
          value={String(mod.appliesTo)}
          onValueChange={(v) => patch((r) => { r.modifiers[idx].appliesTo = v === 'ALL' ? 'ALL' : Number(v) })}
        >
          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t('dashboard.appliesAll')}</SelectItem>
            {Array.from({ length: totalRounds }, (_, i) => (
              <SelectItem key={i} value={String(i + 1)}>{t('dashboard.appliesRound').replace('{n}', String(i + 1))}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button size="sm" variant="ghost" className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
        aria-label={t('common.delete')}
        onClick={() => patch((r) => { r.modifiers.splice(idx, 1) })}>
        <Trash className="h-4 w-4" />
      </Button>
    </li>
  )
}

// ---------------------------------------------------------------------------
// Tiebreakers editor
// ---------------------------------------------------------------------------

function TiebreakersEditor({ rules, patch }: { rules: any; patch: (u: (r: any) => void) => void }) {
  const { t } = useI18n()
  return (
    <div>
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t('dashboard.tiebreakersLabel')}</Label>
      <ul className="mt-2 space-y-1">
        <li className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm">
          <Badge variant="secondary" className="tabular-nums flex-shrink-0">1</Badge>
          <span className="flex-1 min-w-0 break-words">{t('dashboard.tiebreakerEventPoints')}</span>
        </li>
        {rules.tiebreakers.map((tb: string, idx: number) => (
          <TiebreakerRow key={idx} tb={tb} idx={idx} total={rules.tiebreakers.length} patch={patch} />
        ))}
        <li className="pt-1">
          <Select
            value=""
            onValueChange={(v) => { if (v) patch((r) => { r.tiebreakers.push(v) }) }}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder={t('dashboard.addTiebreakerPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {TIEBREAKER_OPTIONS.filter((opt) => !rules.tiebreakers.includes(opt.value)).map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{t(opt.label)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </li>
      </ul>
    </div>
  )
}

function TiebreakerRow({ tb, idx, total, patch }: { tb: string; idx: number; total: number; patch: (u: (r: any) => void) => void }) {
  const { t } = useI18n()
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm">
      <Badge variant="secondary" className="tabular-nums flex-shrink-0">{idx + 2}</Badge>
      <Select value={tb} onValueChange={(v) => patch((r) => { r.tiebreakers[idx] = v })}>
        <SelectTrigger className="h-9 min-w-0 flex-1 text-sm"><SelectValue /></SelectTrigger>
        <SelectContent>
          {TIEBREAKER_OPTIONS.map((opt) => <SelectItem key={opt.value} value={opt.value}>{t(opt.label)}</SelectItem>)}
        </SelectContent>
      </Select>
      <div className="flex flex-shrink-0">
        <Button size="sm" variant="ghost" className="h-9 w-9 p-0" disabled={idx === 0}
          aria-label={t('dashboard.moveUp')}
          onClick={() => patch((r) => { const tmp = r.tiebreakers.splice(idx, 1)[0]; r.tiebreakers.splice(idx - 1, 0, tmp) })}>
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" className="h-9 w-9 p-0" disabled={idx === total - 1}
          aria-label={t('dashboard.moveDown')}
          onClick={() => patch((r) => { const tmp = r.tiebreakers.splice(idx, 1)[0]; r.tiebreakers.splice(idx + 1, 0, tmp) })}>
          <ChevronDown className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
          aria-label={t('common.delete')}
          onClick={() => patch((r) => { r.tiebreakers.splice(idx, 1) })}>
          <Trash className="h-4 w-4" />
        </Button>
      </div>
    </li>
  )
}
