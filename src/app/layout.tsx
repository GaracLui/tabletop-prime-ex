import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { AuthProvider } from "@/components/auth/auth-provider";
import { QueryProvider } from "@/components/query-provider";
import { LocaleSync } from "@/components/locale-sync";
import { CookieConsent } from "@/components/cookie-consent";
import { GatedAnalytics } from "@/components/gated-analytics";
import { GatedAdSense } from "@/components/gated-adsense";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Production domain — tabletopprime.com.
// We hard-code the canonical URL here so OG/Twitter cards and metadataBase
// always point at the real domain regardless of where the app is deployed
// (preview deployments on Vercel, local dev, etc.). The metadataBase is
// used by Next.js to resolve relative OG image URLs.
const siteUrl = process.env.NODE_ENV === 'production'
  ? 'https://tabletopprime.com'
  : (process.env.NEXTAUTH_URL || 'http://localhost:3000')

// OG image dimensions — must match the actual PNG file in /public.
// Specifying these lets social crawlers render the card without downloading
// the image first to discover its size.
const OG_IMAGE_WIDTH = 1200
const OG_IMAGE_HEIGHT = 630

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'TableTop Prime — Tournament & league management',
  description:
    'TableTop Prime is a mobile-first tournament and league management platform for board game associations and conventions. Multiplayer pairings, dual-score verification, judge dispatch, and CSV export.',
  keywords: [
    // English
    'board games',
    'tournament',
    'league',
    'tabletop',
    'Catan',
    'pairing',
    'Social Golfer',
    'tournament software',
    'convention management',
    'board game tournament',
    'Swiss tournament',
    'round robin',
    // Spanish (helps the site appear in Spanish-language searches)
    'torneo de juegos de mesa',
    'liga de juegos de mesa',
    'organizar torneo',
    'emparejamiento',
    'gestión de torneos',
    'software de torneos',
    'convention de juegos',
    'asociación de juegos',
    'Suizo',
    'juegos de mesa',
    'tabla de clasificación',
  ],
  authors: [{ name: 'TableTop Prime' }],
  creator: 'TableTop Prime',
  publisher: 'TableTop Prime',
  applicationName: 'TableTop Prime',
  // Google AdSense site verification meta tag
  other: {
    'google-adsense-account': 'ca-pub-3609541115058814',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  manifest: '/manifest.json',
  openGraph: {
    title: 'TableTop Prime',
    description:
      'Real-time, mobile-first tournament and league management for board game associations.',
    siteName: 'TableTop Prime',
    url: 'https://tabletopprime.com',
    type: 'website',
    locale: 'en_US',
    alternateLocale: ['es_AR', 'es_ES'],
    images: [
      {
        url: '/og-image.png',
        width: OG_IMAGE_WIDTH,
        height: OG_IMAGE_HEIGHT,
        alt: 'TableTop Prime — Run board game tournaments the modern way',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TableTop Prime',
    description:
      'Tournament & league management for board game associations.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  // SEO NOTE: We do NOT use alternates.languages here because both English
  // and Spanish are served from the SAME URL (tabletopprime.com) via
  // content negotiation (Accept-Language header detection in middleware).
  // Google ignores hreflang alternates that point to the same URL. Instead,
  // the middleware sets `Vary: Accept-Language` which is the correct signal
  // for same-URL multilingual content per Google's documentation.
  alternates: {
    canonical: 'https://tabletopprime.com',
  },
}

// Next.js 16: viewport and themeColor must be in a separate export
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5, // allow zoom for accessibility (WCAG 1.4.4)
  viewportFit: "cover", // respect notches / safe areas
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

// JSON-LD structured data — helps Google understand the site and enables
// rich results. Organization + WebSite are the two most impactful schemas;
// SoftwareApplication makes the site eligible for "software app" rich results
// (price, category, platform shown directly in search snippets).
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      name: 'TableTop Prime',
      url: 'https://tabletopprime.com',
      logo: 'https://tabletopprime.com/icon.svg',
      description:
        'Tournament and league management platform for board game associations and conventions.',
    },
    {
      '@type': 'WebSite',
      name: 'TableTop Prime',
      url: 'https://tabletopprime.com',
      potentialAction: {
        '@type': 'SearchAction',
        target: 'https://tabletopprime.com/?q={search_term_string}',
        'query-input': 'required name=search_term_string',
      },
    },
    // BreadcrumbList — shows breadcrumb trail in SERP. Helps Google
    // understand site structure and gives users context before clicking.
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: 'https://tabletopprime.com',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Privacy Policy',
          item: 'https://tabletopprime.com/privacy',
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: 'Terms of Service',
          item: 'https://tabletopprime.com/terms',
        },
        {
          '@type': 'ListItem',
          position: 4,
          name: 'Cookie Policy',
          item: 'https://tabletopprime.com/cookies',
        },
      ],
    },
    {
      '@type': 'SoftwareApplication',
      name: 'TableTop Prime',
      url: 'https://tabletopprime.com',
      applicationCategory: 'GameApplication',
      operatingSystem: 'Web',
      description:
        'Mobile-first tournament and league management platform for board game associations and conventions. Multiplayer pairings, Swiss and Round Robin formats, dual-score verification, judge dispatch, and CSV export.',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '5',
        ratingCount: '1',
      },
    },
  ],
}

// FAQPage JSON-LD — gives the landing page FAQ section rich snippet
// eligibility (accordion-style results directly in Google search).
const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Do players need to install an app?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "No — every player checks in via a QR code or share link on their own phone. There's no app to install; the companion view runs in any modern mobile browser.",
      },
    },
    {
      '@type': 'Question',
      name: 'Can I run a tournament with 60 players?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. The pairing engine handles 2–200+ players across any table size from 2 to 6 per table. Swiss and Adjacent Swiss scale particularly well because they group by standings rather than searching for perfect pairings.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I export results to CSV?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Standings and full match history (every table, every round, every placement) can be exported as CSV at any time. Great for league records and end-of-season reports.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is it really free?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes — the Free tier supports up to 11 players with all pairing formats, dual-score verification, and live standings. Paid tiers unlock larger events, judge dispatch, CSV export, and event templates.',
      },
    },
    {
      '@type': 'Question',
      name: 'Do players need an account?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "No. Players open a share link in their browser, enter their name, and they're in. Organizers can also add players manually from the dashboard if they don't have a phone.",
      },
    },
    {
      '@type': 'Question',
      name: 'How does scoring work?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Every table score is submitted by one player and must be confirmed by a second player at the same table before it is locked. This catches typos, misclicks, and bad-faith submissions at the source. Judges can also edit disputed scores after the fact.',
      },
    },
  ],
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read the locale cookie set by middleware (src/middleware.ts).
  // This lets us render <html lang="es"> for Spanish-speaking visitors
  // on the SERVER — Google's crawler and social preview crawlers see the
  // correct lang attribute in the initial HTML, not after JS hydration.
  const cookieStore = await cookies()
  const locale = cookieStore.get('ttp-locale')?.value === 'es' ? 'es' : 'en'

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* JSON-LD structured data — helps Google understand the site. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* FAQPage JSON-LD — enables FAQ rich snippets in Google search. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
        {/* Google AdSense — gated behind cookie consent. Only loads
            after the user accepts "all" cookies. */}
        <GatedAdSense />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <QueryProvider>
              <LocaleSync />
              {children}
              <Toaster />
              <CookieConsent />
            </QueryProvider>
          </AuthProvider>
        </ThemeProvider>
        <GatedAnalytics />
      </body>
    </html>
  );
}
