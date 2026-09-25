/**
 * Judge store — live queue of player "Call Judge" requests.
 *
 * In a real deployment this would be backed by Supabase Realtime or a
 * socket.io mini-service (see `examples/websocket/`). For the demo we
 * keep it in-memory + localStorage so the queue persists across reloads
 * and updates instantly between the Companion and Judge views.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { JudgeCall, JudgeCallCategory, JudgeCallStatus } from '@/lib/types'

interface JudgeState {
  calls: JudgeCall[]
  pushCall: (input: {
    tableNumber: number
    category: JudgeCallCategory
    message?: string
    submittedBy: string
  }) => string
  acknowledge: (id: string) => void
  resolve: (id: string) => void
  clear: () => void
}

function uid(prefix = 'call'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}

export const useJudgeStore = create<JudgeState>()(
  persist(
    (set) => ({
      calls: [],
      pushCall: (input) => {
        const id = uid()
        const call: JudgeCall = {
          id,
          tableNumber: input.tableNumber,
          category: input.category,
          message: input.message,
          submittedBy: input.submittedBy,
          status: 'PENDING',
          createdAt: new Date().toISOString(),
        }
        set((s) => ({ calls: [call, ...s.calls] }))
        return id
      },
      acknowledge: (id) =>
        set((s) => ({
          calls: s.calls.map((c) =>
            c.id === id
              ? {
                  ...c,
                  status: 'ACKNOWLEDGED' as JudgeCallStatus,
                  acknowledgedAt: new Date().toISOString(),
                }
              : c
          ),
        })),
      resolve: (id) =>
        set((s) => ({
          calls: s.calls.map((c) =>
            c.id === id
              ? {
                  ...c,
                  status: 'RESOLVED' as JudgeCallStatus,
                  resolvedAt: new Date().toISOString(),
                }
              : c
          ),
        })),
      clear: () => set({ calls: [] }),
    }),
    { name: 'tabletop-prime-judge' }
  )
)
