'use client'

/**
 * Event context — provides the active event data and mutations
 * to all child components without prop drilling.
 */
import * as React from 'react'
import { useEvent, useUpdateEvent, useDeleteEvent, useAddPlayers, useUpdatePlayer, useGeneratePairings, useSubmitScore } from '@/hooks/use-event-data'

interface EventContextValue {
  eventId: string
  event: any | null
  role: string | null
  isLoading: boolean
  updateEvent: (input: Record<string, unknown>) => Promise<void>
  deleteEvent: () => Promise<void>
  addPlayers: (input: { name?: string; names?: string[] }) => Promise<void>
  updatePlayer: (input: { playerId: string; checkedIn?: boolean; ready?: boolean }) => Promise<void>
  generatePairings: (input: { action: 'generate' | 'regenerate'; format?: string; round?: number }) => Promise<void>
  submitScore: (input: {
    tableNumber: number
    round: number
    placements: Array<{ playerId: string; placement: number; gamePoints: number }>
    note?: string
    action: 'submit' | 'confirm' | 'update'
  }) => Promise<void>
}

const EventContext = React.createContext<EventContextValue | null>(null)

export function useEventContext() {
  const ctx = React.useContext(EventContext)
  if (!ctx) throw new Error('useEventContext must be used within EventProvider')
  return ctx
}

export function EventProvider({ eventId, children }: { eventId: string; children: React.ReactNode }) {
  const { data, isLoading } = useEvent(eventId)
  const updateEventMut = useUpdateEvent(eventId)
  const deleteEventMut = useDeleteEvent(eventId)
  const addPlayersMut = useAddPlayers(eventId)
  const updatePlayerMut = useUpdatePlayer(eventId)
  const generatePairingsMut = useGeneratePairings(eventId)
  const submitScoreMut = useSubmitScore(eventId)

  const value: EventContextValue = {
    eventId,
    event: data?.event ?? null,
    role: data?.role ?? null,
    isLoading,
    updateEvent: async (input) => { await updateEventMut.mutateAsync(input) },
    deleteEvent: async () => { await deleteEventMut.mutateAsync() },
    addPlayers: async (input) => { await addPlayersMut.mutateAsync(input) },
    updatePlayer: async (input) => { await updatePlayerMut.mutateAsync(input) },
    generatePairings: async (input) => { await generatePairingsMut.mutateAsync(input) },
    submitScore: async (input) => { await submitScoreMut.mutateAsync(input) },
  }

  return React.createElement(EventContext.Provider, { value }, children)
}
