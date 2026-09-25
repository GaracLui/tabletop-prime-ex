'use client'

/**
 * CompanionView — orchestrator shell for the player companion.
 *
 * Tabs: My Table / Score / Standings / Ready / Judge
 * The "My Table" and "Standings" tabs are new — they let the player see
 * their current table assignment and the event standings without asking
 * the organizer.
 */
import { BatteryWarning, Trophy, Sparkles, Share2 } from 'lucide-react'
import { useEvent, useStandings } from '@/hooks/use-event-data'
import { useAuth } from '@/components/auth/auth-provider'
import { useI18n } from '@/hooks/use-i18n'
import { webShare, buildShareUrl } from '@/lib/share/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { ScoreTab } from './companion/score-tab'
import { StatsTab } from './companion/stats-tab'
import { JudgeTab } from './companion/judge-tab'

export function CompanionView({ eventId }: { eventId?: string }) {
  const { t } = useI18n()
  if (!eventId) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t('common.noEventSelected')}
          </CardContent>
        </Card>
      </div>
    )
  }
  return <CompanionContent eventId={eventId} />
}

function CompanionContent({ eventId }: { eventId: string }) {
  const { t } = useI18n()
  const { data: eventData, isLoading } = useEvent(eventId)
  const { data: standings } = useStandings(eventId)
  const { user } = useAuth()

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="animate-pulse text-muted-foreground">{t('common.loading')}</div>
      </div>
    )
  }

  const event = eventData?.event
  if (!event) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Card><CardContent className="py-12 text-center text-muted-foreground">{t('common.eventNotFound')}</CardContent></Card>
      </div>
    )
  }

  // Find the current user's player record in this event
  const myPlayer = (event.players || []).find((p: any) => p.userId === user?.id)

  // Find which table the player is at in the current round
  const currentRound = event.pairings?.find((p: any) => p.round === event.currentRound)
  let myTable: any = null
  if (currentRound && myPlayer) {
    myTable = currentRound.tables.find((t: any) => t.playerIds.includes(myPlayer.id))
  }

  // Find bonus rounds where the player is seated
  const myBonusRounds = (event.pairings || [])
    .filter((p: any) => p.isBonus)
    .filter((p: any) => myPlayer && p.tables.some((t: any) => t.playerIds.includes(myPlayer.id)))

  // Find the player's position in standings
  const myStanding = standings?.find((s: any) => s.playerId === myPlayer?.id)
  const myRank = standings?.findIndex((s: any) => s.playerId === myPlayer?.id) ?? -1

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl break-words leading-tight">{event.name}</h1>
          <p className="text-sm text-muted-foreground break-words">{t('companion.companionSubtitle').replace('{game}', event.gameName)}</p>
        </div>
        {event.eventCode && (
          <Button
            size="sm"
            variant="outline"
            aria-label={t('common.share')}
            onClick={async () => {
              const url = buildShareUrl(event.eventCode!)
              const text = myStanding && myRank >= 0
                ? t('companion.shareRanked').replace('{rank}', String(myRank + 1)).replace('{name}', event.name)
                : t('companion.shareFollow').replace('{name}', event.name)
              await webShare(event.name, text, url)
            }}
          >
            <Share2 className="mr-1.5 h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('common.share')}</span>
          </Button>
        )}
      </div>

      {/* Quick info banner — table + rank at a glance */}
      {myPlayer && (
        <div className="mb-4 grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="py-3">
              <p className="text-xs text-muted-foreground">{t('companion.myTable')}</p>
              {myTable ? (
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
                    {myTable.tableNumber}
                  </span>
                  <span className="text-sm">
                    {t('companion.playersCount').replace('{n}', String(myTable.playerIds.length))}
                  </span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {event.currentRound > 0 ? t('companion.notSeatedShort') : t('companion.noRoundsYet')}
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3">
              <p className="text-xs text-muted-foreground">{t('companion.myRank')}</p>
              {myStanding && myRank >= 0 ? (
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">#{myRank + 1}</span>
                  <span className="text-sm text-muted-foreground">
                    {myStanding.total} {t('common.pts')}
                  </span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t('companion.noScoresYetShort')}</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bonus round info — show if player is in any bonus round */}
      {myPlayer && myBonusRounds.length > 0 && (
        <Card className="mb-4 border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-3">
            <p className="text-xs text-muted-foreground mb-1">{t('dashboard.bonusRounds')}</p>
            <div className="space-y-1">
              {myBonusRounds.map((br: any) => {
                const myBonusTable = br.tables.find((t: any) => t.playerIds.includes(myPlayer.id))
                return (
                  <div key={br.round} className="flex items-center gap-2 text-sm">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    <span className="font-medium">{br.label || t('dashboard.bonusRoundN').replace('{n}', String(br.round))}</span>
                    {myBonusTable && (
                      <Badge variant="secondary" className="text-xs">
                        {t('dashboard.roundStatusTable').replace('{n}', String(myBonusTable.tableNumber))}
                      </Badge>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="score" className="w-full">
        <TabsList className="grid h-11 w-full grid-cols-4 text-xs sm:h-10 sm:text-sm">
          <TabsTrigger value="score" className="px-1">{t('companion.tabScore')}</TabsTrigger>
          <TabsTrigger value="standings" className="px-1">{t('dashboard.tabs.standings')}</TabsTrigger>
          <TabsTrigger value="stats" className="px-1">{t('companion.tabStats')}</TabsTrigger>
          <TabsTrigger value="judge" className="px-1">{t('nav.judge')}</TabsTrigger>
        </TabsList>

        <TabsContent value="score" className="mt-4">
          <ScoreTab eventId={eventId} event={event} myPlayerId={myPlayer?.id} isStaff={false} />
        </TabsContent>
        <TabsContent value="standings" className="mt-4">
          {/* Standings tab — compact table, highlights the current player */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Trophy className="h-4 w-4 text-amber-500" /> {t('dashboard.tabs.standings')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!standings || standings.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">{t('share.noScores')}</p>
              ) : (
                <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                  <Table className="min-w-[400px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">{t('common.rankSymbol')}</TableHead>
                        <TableHead>{t('share.playerColumn')}</TableHead>
                        <TableHead className="text-right whitespace-nowrap">{t('dashboard.eventPoints')}</TableHead>
                        <TableHead className="text-right whitespace-nowrap hidden sm:table-cell">{t('dashboard.gamePoints')}</TableHead>
                        <TableHead className="text-right whitespace-nowrap hidden sm:table-cell">{t('share.roundsColumn')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {standings.map((row: any, i: number) => {
                        const isMe = row.playerId === myPlayer?.id
                        return (
                          <TableRow key={row.playerId} className={isMe ? 'bg-primary/5' : ''}>
                            <TableCell className="font-mono text-sm">{i + 1}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className={'h-2.5 w-2.5 flex-shrink-0 rounded-full ' + row.color} />
                                <span className="font-medium truncate" title={row.name}>
                                  {row.name}
                                  {isMe && <Badge variant="secondary" className="ml-2 text-xs">{t('companion.youCapitalized')}</Badge>}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right tabular-nums font-semibold whitespace-nowrap">{row.total}</TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground whitespace-nowrap hidden sm:table-cell">{row.gamePointsTotal}</TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground whitespace-nowrap hidden sm:table-cell">{row.rounds}</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="stats" className="mt-4">
          <StatsTab eventId={eventId} />
        </TabsContent>
        <TabsContent value="judge" className="mt-4">
          <JudgeTab eventId={eventId} event={event} />
        </TabsContent>
      </Tabs>

      <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
        <BatteryWarning className="h-3.5 w-3.5" /> {t('companion.batteryDead')}
      </p>
    </div>
  )
}
