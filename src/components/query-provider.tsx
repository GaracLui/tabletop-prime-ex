'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as React from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 30s stale time — balances freshness with avoiding refetch storms.
            // Judge calls have their own 5s refetchInterval so they stay live.
            staleTime: 30 * 1000,
            gcTime: 5 * 60 * 1000, // cache inactive data for 5 min before GC
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
