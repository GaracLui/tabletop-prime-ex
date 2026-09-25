'use client'

/**
 * error.tsx — catches errors thrown in any page or child layout.
 *
 * Unlike global-error.tsx, this keeps the root layout (header, footer)
 * visible — only the main content area is replaced by this error UI.
 */
import * as React from 'react'
import { AlertCircle } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  React.useEffect(() => {
    console.error('Page error:', error)
  }, [error])

  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center px-4 py-20 text-center">
      <AlertCircle className="mb-4 h-12 w-12 text-destructive" aria-hidden="true" />
      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
        Something went wrong
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        An error occurred while loading this page. Try again — your data is safe.
      </p>
      {error.digest && (
        <p className="mt-2 text-xs text-muted-foreground/60">
          Error ID: {error.digest}
        </p>
      )}
      <div className="mt-6 flex gap-2">
        <button
          onClick={reset}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Try again
        </button>
        <button
          onClick={() => window.location.href = '/'}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Home
        </button>
      </div>
    </div>
  )
}
