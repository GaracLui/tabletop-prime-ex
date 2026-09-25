/**
 * UI store — view router, locale, active event context, and auth display.
 *
 * The user's role is NO LONGER global — it's per-event. When the user
 * selects an event, `activeEventRole` is set based on their
 * EventParticipant record. The header nav and page routing use this
 * to determine which views to show.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Locale } from '@/lib/i18n'

export type ViewKey = 'landing' | 'my-events' | 'dashboard' | 'companion' | 'judge' | 'account' | 'auth'

export type EventRole = 'ORGANIZER' | 'JUDGE' | 'PLAYER' | null

interface UIState {
  view: ViewKey
  showAuth: boolean
  locale: Locale
  /** The event the user is currently viewing. */
  activeEventId: string | null
  /** The user's role in the active event (fetched from EventParticipant). */
  activeEventRole: EventRole
  /** The player ID used by the Companion view. */
  currentPlayerId: string | null
  setView: (v: ViewKey) => void
  setShowAuth: (v: boolean) => void
  setLocale: (l: Locale) => void
  setActiveEvent: (eventId: string | null, role: EventRole) => void
  setCurrentPlayerId: (id: string | null) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      view: 'landing',
      showAuth: false,
      locale: 'en',
      activeEventId: null,
      activeEventRole: null,
      currentPlayerId: null,
      setView: (view) => set({ view }),
      setShowAuth: (showAuth) => set({ showAuth }),
      setLocale: (locale) => set({ locale }),
      setActiveEvent: (eventId, role) =>
        set({ activeEventId: eventId, activeEventRole: role }),
      setCurrentPlayerId: (id) => set({ currentPlayerId: id }),
    }),
    {
      name: 'tabletop-prime-ui',
      partialize: (s) => ({
        locale: s.locale,
        currentPlayerId: s.currentPlayerId,
      }),
    }
  )
)
