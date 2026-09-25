'use client'

/**
 * DashboardView — orchestrator shell that hosts the 5 dashboard tabs.
 *
 * Each tab lives in its own file under `./dashboard/` so this file stays
 * short and the tabs can be edited independently.
 *
 *   PairingsTabApi       — ./dashboard/pairings-tab
 *   StandingsTableApi    — ./dashboard/standings-tab
 *   ScoringConfigApi     — ./dashboard/scoring-tab
 *   RoundConfigTabApi    — ./dashboard/round-config-tab
 *   EventDetailsApi      — ./dashboard/event-details-tab
 *   EventLifecycleBarSimple — ./dashboard/event-lifecycle-bar
 */
import * as React from 'react'
import { useI18n } from '@/hooks/use-i18n'
import { EventProvider, useEventContext } from '@/hooks/event-context'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EventBanner } from '@/components/event-banner'

import { EventLifecycleBarSimple } from './dashboard/event-lifecycle-bar'
import { PairingsTabApi } from './dashboard/pairings-tab'
import { StandingsTableApi } from './dashboard/standings-tab'
import { ScoringConfigApi } from './dashboard/scoring-tab'
import { RoundConfigTabApi } from './dashboard/round-config-tab'
import { EventDetailsApi } from './dashboard/event-details-tab'

export function DashboardView({ eventId }: { eventId: string }) {
  const { t } = useI18n()
  const [tabValue, setTabValue] = React.useState<string>('pairings')

  function DashboardContent() {
    const ctx = useEventContext()
    const event = ctx.event

    if (ctx.isLoading || !event) {
      return (
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="animate-pulse text-muted-foreground">{t('dashboard.loadingEvent')}</div>
        </div>
      )
    }

    const TAB_OPTIONS = [
      { value: 'pairings', label: t('dashboard.tabs.pairings') },
      { value: 'standings', label: t('dashboard.tabs.standings') },
      { value: 'scoring', label: t('dashboard.tabs.scoring') },
      { value: 'rounds', label: t('dashboard.tabs.rounds') },
      { value: 'events', label: t('dashboard.tabs.events') },
    ]

    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Procedural banner — deterministic from (eventId + bannerSeedOffset).
            Organizers can reroll from the Event Details tab. */}
        <EventBanner
          eventId={eventId}
          seedOffset={event.bannerSeedOffset ?? 0}
          variant="wide"
          className="mb-4"
        />

        <div className="mb-6 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl break-words leading-tight">{event.name}</h1>
          <p className="text-sm text-muted-foreground break-words">{event.gameName}</p>
        </div>

        <EventLifecycleBarSimple eventId={eventId} status={event.status} />

        <Tabs value={tabValue} onValueChange={setTabValue} className="w-full mt-6">
          {/* Mobile: Select for tab navigation.
              Theme-aware: bg-primary is dark in light theme, light in dark theme.
              text-primary-foreground is the opposite — always readable.
              h-12 (48px) exceeds WCAG touch-target minimum; px-5 gives generous
              horizontal breathing room on mobile. */}
          <Select value={tabValue} onValueChange={setTabValue}>
            <SelectTrigger
              className="sm:hidden h-12 px-5 border-transparent bg-primary dark:bg-primary text-primary-foreground dark:text-primary-foreground hover:bg-primary/90 dark:hover:bg-primary/90 [&>svg]:text-primary-foreground dark:[&>svg]:text-primary-foreground"
              aria-label={t('dashboard.selectTab')}
            >
              <span className="text-xs text-primary-foreground/70">{t('dashboard.tabLabel')}</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TAB_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Desktop: TabsList */}
          <TabsList className="hidden w-full sm:grid sm:grid-cols-5">
            {TAB_OPTIONS.map((opt) => (
              <TabsTrigger key={opt.value} value={opt.value} className="whitespace-nowrap">{opt.label}</TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="pairings" className="mt-4">
            <PairingsTabApi eventId={eventId} />
          </TabsContent>
          <TabsContent value="standings" className="mt-4">
            <StandingsTableApi eventId={eventId} />
          </TabsContent>
          <TabsContent value="scoring" className="mt-4">
            <ScoringConfigApi eventId={eventId} />
          </TabsContent>
          <TabsContent value="rounds" className="mt-4">
            <RoundConfigTabApi eventId={eventId} />
          </TabsContent>
          <TabsContent value="events" className="mt-4">
            <EventDetailsApi eventId={eventId} />
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  return (
    <EventProvider eventId={eventId}>
      <DashboardContent />
    </EventProvider>
  )
}
