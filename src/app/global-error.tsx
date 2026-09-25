'use client'

/**
 * global-error.tsx — catches errors that error.tsx cannot.
 *
 * This is the outermost error boundary — it replaces the entire <html>
 * document when an unhandled error occurs in the root layout itself.
 * (If the error occurs in a page or child layout, error.tsx catches it
 * instead and the layout shell remains visible.)
 *
 * Must include its own <html> and <body> tags because it replaces the
 * root layout entirely.
 */
import * as React from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  React.useEffect(() => {
    console.error('Global error:', error)
  }, [error])

  return (
    <html lang="en">
      <body className="antialiased bg-background text-foreground">
        <div className="flex min-h-screen flex-col items-center justify-center px-4">
          <div className="max-w-md text-center">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Something went wrong
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              An unexpected error occurred. Try refreshing the page —
              your data is safe.
            </p>
            {error.digest && (
              <p className="mt-2 text-xs text-muted-foreground/60">
                Error ID: {error.digest}
              </p>
            )}
            <button
              onClick={reset}
              className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Try again
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="mt-3 block w-full text-sm text-muted-foreground hover:text-foreground"
            >
              Go to home
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
