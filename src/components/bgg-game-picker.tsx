'use client'

/**
 * BggGamePicker — "Search BGG" button that opens a dialog to search
 * BoardGameGeek for a board game. Selecting a game fills the form
 * fields with BGG data (name, max players, BGG ID).
 *
 * Design decisions:
 *   • Button (not autocomplete) to avoid BGG rate-limiting (~1 req/sec)
 *   • Results shown in a dialog with game name + year published
 *   • Selecting a game auto-fetches details and fills parent form
 *   • Can be dismissed — user can still type a game name manually
 */
import * as React from 'react'
import { Search, Loader2, Dice5, X, Check } from 'lucide-react'
import { useI18n } from '@/hooks/use-i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

interface BggSearchResult {
  id: string
  name: string
  yearPublished?: number
}

interface BggGameDetails {
  id: string
  name: string
  yearPublished?: number
  minPlayers?: number
  maxPlayers?: number
  thumbnail?: string
}

export interface BggSelection {
  bggId: string
  gameName: string
  maxPlayers?: number
  minPlayers?: number
}

interface BggGamePickerProps {
  /** Called when a game is selected from BGG. */
  onSelect: (selection: BggSelection) => void
  /** Current game name (to pre-fill the search field). */
  currentGameName?: string
}

export function BggGamePicker({ onSelect, currentGameName }: BggGamePickerProps) {
  const { t } = useI18n()
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [results, setResults] = React.useState<BggSearchResult[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [fetchingDetails, setFetchingDetails] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (open && currentGameName && !query) {
      setQuery(currentGameName)
    }
  }, [open, currentGameName, query])

  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    setResults([])
    try {
      const res = await fetch(`/api/bgg?q=${encodeURIComponent(query.trim())}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Search failed' }))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setResults(data.results || [])
      if (data.results?.length === 0) {
        setError(t('bgg.noResults'))
      }
    } catch (err: any) {
      setError(err.message || t('bgg.searchFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = async (result: BggSearchResult) => {
    setFetchingDetails(result.id)
    setError(null)
    try {
      const res = await fetch(`/api/bgg?id=${result.id}`)
      if (!res.ok) throw new Error('Failed to fetch details')
      const data = await res.json()
      const game: BggGameDetails = data.game

      onSelect({
        bggId: game.id,
        gameName: game.name,
        maxPlayers: game.maxPlayers,
        minPlayers: game.minPlayers,
      })

      setOpen(false)
      setResults([])
      setQuery('')
    } catch {
      // If details fail, still use the search result's name
      onSelect({
        bggId: result.id,
        gameName: result.name,
      })
      setOpen(false)
    } finally {
      setFetchingDetails(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline" className="w-full">
          <Search className="mr-1.5 h-3.5 w-3.5" />
          {t('bgg.searchButton')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dice5 className="h-4 w-4 text-primary" />
            {t('bgg.searchTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('bgg.searchDescription')}
          </DialogDescription>
        </DialogHeader>

        {/* Search bar */}
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
            placeholder={t('bgg.searchPlaceholder')}
            autoFocus
          />
          <Button onClick={handleSearch} disabled={loading || !query.trim()} size="sm">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-amber-700 dark:text-amber-400">{error}</p>
        )}

        {/* Results */}
        {results.length > 0 && (
          <ul className="max-h-64 space-y-1 overflow-y-auto">
            {results.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(r)}
                  disabled={fetchingDetails !== null}
                  className="flex w-full items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50 disabled:opacity-50"
                >
                  <div className="min-w-0 flex-1">
                    <span className="block truncate font-medium" title={r.name}>
                      {r.name}
                    </span>
                    {r.yearPublished && (
                      <span className="text-xs text-muted-foreground">{r.yearPublished}</span>
                    )}
                  </div>
                  {fetchingDetails === r.id ? (
                    <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Empty state hint */}
        {results.length === 0 && !loading && !error && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {t('bgg.emptyHint')}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t('common.cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
