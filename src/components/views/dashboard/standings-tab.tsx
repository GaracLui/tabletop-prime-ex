'use client'

/**
 * Standings tab — table with rank/player/game points/table points/event points,
 * plus CSV export buttons (standings + match history).
 *
 * Extracted from dashboard-view.tsx.
 */
import { Trophy, Download } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useI18n } from '@/hooks/use-i18n'
import { useStandings, useExportCsv, useEvent } from '@/hooks/use-event-data'
import { ShareButton } from '@/lib/share/share-button'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PlayerChipInline } from '@/components/player-chip'

export function StandingsTableApi({ eventId }: { eventId: string }) {
  const { t } = useI18n()
  const { data: standings, isLoading } = useStandings(eventId)
  const { data: eventData } = useEvent(eventId)
  const exportCsv = useExportCsv(eventId)
  const { toast } = useToast()

  const handleExport = async (type: 'standings' | 'matches') => {
    try {
      const res = await exportCsv.mutateAsync(type)
      toast({ title: t('dashboard.exportedFilename').replace('{filename}', res.filename) })
    } catch (err: any) {
      toast({ title: err.message || t('dashboard.exportFailed'), variant: 'destructive' })
    }
  }

  if (isLoading) return <div className="animate-pulse text-muted-foreground">{t('dashboard.loadingStandings')}</div>

  const header = (
    <CardHeader className="flex-row items-center justify-between space-y-0">
      <CardTitle className="flex items-center gap-2 text-lg">
        <Trophy className="h-4 w-4 text-amber-500" /> {t('dashboard.tabs.standings')}
      </CardTitle>
      {standings && standings.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {eventData?.event && (
            <ShareButton
              event={eventData.event}
              players={eventData.event.players || []}
              standings={standings.map((s: any) => ({
                name: s.name, color: s.color, total: s.total,
                gamePointsTotal: s.gamePointsTotal, rounds: s.rounds,
              }))}
            />
          )}
          <Button size="sm" variant="outline" onClick={() => handleExport('standings')} disabled={exportCsv.isPending}>
            <Download className="mr-1.5 h-3.5 w-3.5" /> <span className="hidden sm:inline">{t('dashboard.tabs.standings')}</span><span className="sm:hidden">{t('dashboard.exportStandingsShort')}</span>
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleExport('matches')} disabled={exportCsv.isPending}>
            <Download className="mr-1.5 h-3.5 w-3.5" /> <span className="hidden sm:inline">{t('dashboard.matchHistory')}</span><span className="sm:hidden">{t('dashboard.exportMatchHistoryShort')}</span>
          </Button>
        </div>
      )}
    </CardHeader>
  )

  if (!standings || standings.length === 0) {
    return (
      <Card>
        {header}
        <CardContent className="py-8 text-center text-muted-foreground">{t('share.noScores')}</CardContent>
      </Card>
    )
  }

  return (
    <Card>
      {header}
      <CardContent>
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <Table className="min-w-[520px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>{t('share.playerColumn')}</TableHead>
                <TableHead className="text-right whitespace-nowrap">{t('dashboard.gamePoints')}</TableHead>
                <TableHead className="text-right whitespace-nowrap">{t('dashboard.tablePoints')}</TableHead>
                <TableHead className="text-right whitespace-nowrap">{t('dashboard.eventPoints')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {standings.map((row: any, i: number) => (
                <TableRow key={row.playerId}>
                  <TableCell className="font-mono text-sm">{i + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <PlayerChipInline name={row.name} color={row.color} medium />
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground whitespace-nowrap">{row.gamePointsTotal}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground whitespace-nowrap">{row.accumulatedTablePoints}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold whitespace-nowrap">{row.total}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
