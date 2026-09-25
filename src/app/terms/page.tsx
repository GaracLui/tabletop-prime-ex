import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal/legal-page'
import { TermsContentEn } from '@/content/legal/en/terms'
import { TermsContentEs } from '@/content/legal/es/terms'

export const metadata: Metadata = {
  title: 'Terms of Service — TableTop Prime',
  description:
    'Terms of Service for TableTop Prime — acceptable use, organizer and player responsibilities, account suspension, and limitation of liability.',
  alternates: { canonical: 'https://tabletopprime.com/terms' },
  openGraph: {
    title: 'Terms of Service — TableTop Prime',
    description: 'Terms of Service for TableTop Prime.',
    url: 'https://tabletopprime.com/terms',
    type: 'article',
    locale: 'en_US',
    alternateLocale: ['es_AR', 'es_ES'],
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'TableTop Prime — Terms of Service',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/og-image.png'],
  },
}

export default function TermsOfServicePage() {
  return (
    <LegalPage
      titleEn="Terms of Service"
      titleEs="Términos de Servicio"
      lastUpdatedEn="Last updated: September 2026"
      lastUpdatedEs="Última actualización: Septiembre 2026"
      contentEn={<TermsContentEn />}
      contentEs={<TermsContentEs />}
    />
  )
}
