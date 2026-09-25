'use client'

import * as React from 'react'
import { useAuth } from '@/components/auth/auth-provider'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { LandingView } from '@/components/views/landing-view'
import { DashboardView } from '@/components/views/dashboard-view'
import { CompanionView } from '@/components/views/companion-view'
import { JudgeView } from '@/components/views/judge-view'
import { AuthView } from '@/components/views/auth-view'
import { AccountView } from '@/components/views/account-view'
import { MyEventsView } from '@/components/views/my-events-view'
import { useUIStore } from '@/lib/store/ui-store'
import { useI18n } from '@/hooks/use-i18n'

export default function Home() {
  const { t } = useI18n()
  const { user, isLoading } = useAuth()
  const view = useUIStore((s) => s.view)
  const setView = useUIStore((s) => s.setView)
  const activeEventId = useUIStore((s) => s.activeEventId)
  const activeEventRole = useUIStore((s) => s.activeEventRole)
  const showAuth = useUIStore((s) => s.showAuth)
  const setShowAuth = useUIStore((s) => s.setShowAuth)
  const [hashAuth, setHashAuth] = React.useState(false)

  React.useEffect(() => {
    const checkHash = () => setHashAuth(window.location.hash === '#auth')
    checkHash()
    window.addEventListener('hashchange', checkHash)
    return () => window.removeEventListener('hashchange', checkHash)
  }, [])

  // Scroll to top on view change
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [view])

  // When the user logs in, default to My Events
  React.useEffect(() => {
    if (user) {
      setShowAuth(false)
      setHashAuth(false)
      if (window.location.hash === '#auth') {
        window.location.hash = ''
      }
      if (view === 'landing' || view === 'auth') {
        setView('my-events')
      }
    }
  }, [user, view, setView, setShowAuth])

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">{t('common.loading')}</div>
      </div>
    )
  }

  // Not authenticated
  if (!user) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          {t('common.skipToContent')}
        </a>
        <Header onShowAuth={() => { setShowAuth(true); window.location.hash = '#auth' }} />
        <main id="main" className="flex-1">
          {showAuth || hashAuth ? <AuthView /> : <LandingView />}
        </main>
        <Footer />
      </div>
    )
  }

  // Authenticated — route based on view + activeEventRole
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        {t('common.skipToContent')}
      </a>

      <Header />

      <main id="main" className="flex-1" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {view === 'landing' && <LandingView />}
        {view === 'my-events' && <MyEventsView />}
        {view === 'account' && <AccountView />}
        {/* Role-gated views — pass activeEventId from UI store */}
        {view === 'dashboard' && activeEventRole === 'ORGANIZER' && activeEventId && <DashboardView eventId={activeEventId} />}
        {view === 'dashboard' && (activeEventRole !== 'ORGANIZER' || !activeEventId) && <MyEventsView />}
        {view === 'judge' && (activeEventRole === 'JUDGE' || activeEventRole === 'ORGANIZER') && activeEventId && <JudgeView eventId={activeEventId} />}
        {view === 'judge' && (activeEventRole === 'PLAYER' || !activeEventId) && <CompanionView eventId={activeEventId ?? undefined} />}
        {view === 'companion' && activeEventId && <CompanionView eventId={activeEventId} />}
        {view === 'companion' && !activeEventId && <MyEventsView />}
      </main>

      <Footer />
    </div>
  )
}
