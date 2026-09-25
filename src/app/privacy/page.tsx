import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal/legal-page'
import { PrivacyContentEn } from '@/content/legal/en/privacy'
import { PrivacyContentEs } from '@/content/legal/es/privacy'

export const metadata: Metadata = {
  title: 'Privacy Policy — TableTop Prime',
  description:
    'How TableTop Prime collects, uses, stores, and shares user data. Includes Google OAuth data usage, third-party processors, and GDPR deletion rights.',
  alternates: { canonical: 'https://tabletopprime.com/privacy' },
  openGraph: {
    title: 'Privacy Policy — TableTop Prime',
    description:
      'How TableTop Prime collects, uses, stores, and shares user data.',
    url: 'https://tabletopprime.com/privacy',
    type: 'article',
    locale: 'en_US',
    alternateLocale: ['es_AR', 'es_ES'],
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'TableTop Prime — Privacy Policy',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/og-image.png'],
  },
}

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      titleEn="Privacy Policy"
      titleEs="Política de Privacidad"
      lastUpdatedEn="Last updated: September 2026"
      lastUpdatedEs="Última actualización: Septiembre 2026"
      contentEn={<PrivacyContentEn />}
      contentEs={<PrivacyContentEs />}
    />
  )
}
