/**
 * not-found.tsx — shown when a route doesn't exist.
 *
 * This is the 404 page. It renders inside the root layout (header, footer
 * remain visible).
 */
import { FileQuestion } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center px-4 py-20 text-center">
      <FileQuestion className="mb-4 h-12 w-12 text-muted-foreground" aria-hidden="true" />
      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
        Page not found
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <a
        href="/"
        className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Go to home
      </a>
    </div>
  )
}
