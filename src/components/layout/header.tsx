'use client'

import * as React from 'react'
import { getBrowserClient } from '@/lib/supabase/browser'
import { Menu, X, LogIn, LogOut } from 'lucide-react'
import { useI18n } from '@/hooks/use-i18n'
import { useUIStore, type ViewKey } from '@/lib/store/ui-store'
import { useAuth } from '@/components/auth/auth-provider'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { LanguageSwitcher } from '@/components/i18n/language-switcher'
import { Logo } from '@/components/layout/logo'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

// Nav items available based on the user's role in the active event
function getNavItems(role: string | null): Array<{ key: ViewKey; label: string }> {
  // "Account" is always available for authenticated users.
  // Legal pages (Privacy, Terms, Cookies) live at /privacy, /terms, /cookies
  // and are linked from the footer — no longer an in-app view.
  const accountItem = { key: 'account' as ViewKey, label: 'nav.account' }

  if (role === 'ORGANIZER') {
    return [
      { key: 'my-events', label: 'nav.myEvents' },
      { key: 'dashboard', label: 'nav.dashboard' },
      { key: 'judge', label: 'nav.judge' },
      accountItem,
    ]
  }
  if (role === 'JUDGE') {
    return [
      { key: 'my-events', label: 'nav.myEvents' },
      { key: 'judge', label: 'nav.judge' },
      accountItem,
    ]
  }
  if (role === 'PLAYER') {
    return [
      { key: 'my-events', label: 'nav.myEvents' },
      { key: 'companion', label: 'nav.companion' },
      accountItem,
    ]
  }
  // No active event — show My Events + Account
  return [
    { key: 'my-events', label: 'nav.myEvents' },
    accountItem,
  ]
}

export function Header({ onShowAuth }: { onShowAuth?: () => void }) {
  const { t } = useI18n()
  const { user } = useAuth()
  const view = useUIStore((s) => s.view)
  const setView = useUIStore((s) => s.setView)
  const setShowAuth = useUIStore((s) => s.setShowAuth)
  const activeEventRole = useUIStore((s) => s.activeEventRole)
  const [open, setOpen] = React.useState(false)

  const navItems = getNavItems(activeEventRole)
  const userName = user?.name || user?.email?.split('@')[0] || ''
  const isAuthenticated = !!user

  const handleNav = (key: ViewKey) => {
    setView(key)
    setOpen(false)
  }

  const handleSignOut = async () => {
    const supabase = getBrowserClient()




    await supabase.auth.signOut()
    // Clear active event + navigate to landing
    useUIStore.getState().setActiveEvent(null, null)
    setView('landing')
    setOpen(false)
  }

  return (
    <header
      className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
      role="banner"
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Brand */}
        <button
          type="button"
          onClick={() => handleNav('landing')}
          className="flex min-h-11 items-center gap-2 rounded-md px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t('brand')}
        >
          <Logo size="sm" />
          <span className="text-sm font-semibold tracking-tight">
            {t('brand')}
          </span>
        </button>

        {/* Desktop nav */}
        <nav
          className="hidden md:flex items-center gap-1"
          aria-label={t('header.primaryNav')}
        >
          {navItems.map((item) => (
            <Button
              key={item.key}
              variant={view === item.key ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => handleNav(item.key)}
              aria-current={view === item.key ? 'page' : undefined}
              className="text-sm"
            >
              {t(item.label)}
            </Button>
          ))}
        </nav>

        {/* Right-side controls */}
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />

          {/* Auth state */}
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <span className="hidden text-xs text-muted-foreground sm:inline">
                {userName}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                aria-label={t('auth.signOut')}
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="ml-1.5 hidden sm:inline">{t('auth.signOut')}</span>
              </Button>
            </div>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={() => onShowAuth?.() ?? setShowAuth(true)}
              aria-label={t('auth.signIn')}
            >
              <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="ml-1.5 hidden sm:inline">{t('auth.signIn')}</span>
            </Button>
          )}

          {/* Mobile nav */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="md:hidden"
                aria-label={t('common.openMenu')}
              >
                {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle>{t('brand')}</SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-1" aria-label={t('header.mobileNav')}>
                {navItems.map((item) => (
                  <Button
                    key={item.key}
                    variant={view === item.key ? 'secondary' : 'ghost'}
                    className={cn('justify-start')}
                    onClick={() => handleNav(item.key)}
                    aria-current={view === item.key ? 'page' : undefined}
                  >
                    {t(item.label)}
                  </Button>
                ))}
                {isAuthenticated && (
                  <div className="mt-4 border-t border-border/60 pt-4">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={handleSignOut}
                    >
                      <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                      {t('auth.signOut')}
                    </Button>
                  </div>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
