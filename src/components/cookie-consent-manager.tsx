'use client'

/**
 * CookieConsentManager — shows the user's current consent choice
 * and lets them reset it (which shows the consent banner again).
 *
 * Used on the /cookies page so users can manage their preferences
 * after the initial banner dismissal.
 */
import * as React from 'react'
import { RotateCcw, Check, ShieldCheck } from 'lucide-react'
import { useI18n } from '@/hooks/use-i18n'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getConsent, CONSENT_COOKIE_NAME } from '@/components/cookie-consent'

export function CookieConsentManager() {
  const { t } = useI18n()
  const [choice, setChoice] = React.useState<'all' | 'essential' | null>(null)
  const [reset, setReset] = React.useState(false)

  React.useEffect(() => {
    setChoice(getConsent())

    const handler = () => setChoice(getConsent())
    window.addEventListener('ttp-consent-change', handler as EventListener)
    window.addEventListener('storage', (e) => {
      if (e.key === CONSENT_COOKIE_NAME) handler()
    })
    return () => {
      window.removeEventListener('ttp-consent-change', handler as EventListener)
    }
  }, [])

  const handleReset = () => {
    // Delete the consent cookie
    document.cookie = `${CONSENT_COOKIE_NAME}=; max-age=0; path=/; SameSite=Lax; Secure`
    setChoice(null)
    setReset(true)
    // Reload after a short delay so the banner appears
    setTimeout(() => window.location.reload(), 1500)
  }

  return (
    <Card className="mt-8 border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings className="h-4 w-4 text-primary" />
          {t('common.cookieYourChoice')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {choice === 'all' ? (
          <Badge className="gap-1.5 bg-emerald-500 text-white">
            <Check className="h-3 w-3" /> {t('common.cookieChoiceAll')}
          </Badge>
        ) : choice === 'essential' ? (
          <Badge className="gap-1.5">
            <ShieldCheck className="h-3 w-3" /> {t('common.cookieChoiceEssential')}
          </Badge>
        ) : (
          <Badge variant="outline">—</Badge>
        )}

        <p className="text-sm text-muted-foreground leading-relaxed">
          {t('common.cookieChangePrompt')}
        </p>

        {reset ? (
          <p className="text-sm text-emerald-700 dark:text-emerald-400">
            {t('common.cookieResetDone')}
          </p>
        ) : (
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            {t('common.cookieReset')}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

// Import Settings icon locally so we don't need to modify the parent page's imports
import { Settings } from 'lucide-react'
