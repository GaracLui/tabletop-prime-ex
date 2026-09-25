import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal/legal-page'
import { CookiesContentEn } from '@/content/legal/en/cookies'
import { CookiesContentEs } from '@/content/legal/es/cookies'

export const metadata: Metadata = {
  title: 'Cookie Policy — TableTop Prime',
  description:
    'How TableTop Prime uses cookies — essential (auth, theme), analytics (Vercel), and advertising (Google AdSense). Includes consent management and opt-out instructions.',
  alternates: { canonical: 'https://tabletopprime.com/cookies' },
  openGraph: {
    title: 'Cookie Policy — TableTop Prime',
    description: 'How TableTop Prime uses cookies. Manage your consent preferences.',
    url: 'https://tabletopprime.com/cookies',
    type: 'article',
    locale: 'en_US',
    alternateLocale: ['es_AR', 'es_ES'],
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'TableTop Prime — Cookie Policy',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/og-image.png'],
  },
}

export default function CookiePolicyPage() {
  return (
    <LegalPage
      titleEn="Cookie Policy"
      titleEs="Política de Cookies"
      lastUpdatedEn="Last updated: September 2026"
      lastUpdatedEs="Última actualización: Septiembre 2026"
      contentEn={<CookiesContentEn />}
      contentEs={<CookiesContentEs />}
    />
  )
}
