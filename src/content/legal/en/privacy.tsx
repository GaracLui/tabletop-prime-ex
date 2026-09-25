/**
 * Privacy Policy content — English.
 *
 * This is the body content (sections) for /privacy. The page shell
 * (header, title, language toggle, footer) is handled by <LegalPage>.
 *
 * Imported by: src/app/privacy/page.tsx
 */
import { Shield, Cookie, Database, Mail, Trash2, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const CONTACT_EMAIL = 'privacy@tabletopprime.com'

export function PrivacyContentEn() {
  return (
    <>
      {/* Intro */}
      <section>
        <p className="leading-relaxed">
          TableTop Prime (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;the app&rdquo;) is a
          tournament and league management platform for board game associations, conventions,
          and local gaming communities. This Privacy Policy explains what data we collect, why
          we collect it, how it is stored, and the choices you have over your information.
        </p>
        <p className="mt-3 leading-relaxed">
          By creating an account or using any TableTop Prime feature, you agree to the
          practices described in this policy. If you do not agree, do not create an account.
        </p>
      </section>

      {/* What we collect */}
      <section>
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Database className="h-5 w-5 text-primary" aria-hidden="true" />
          1. Data we collect
        </h2>
        <h3 className="mt-4 font-semibold">Data you provide directly</h3>
        <ul className="mt-2 list-disc space-y-1.5 pl-6">
          <li>
            <strong>Email address</strong> — used as your unique account identifier and for
            event invitations, password reset, and account-deletion confirmations.
          </li>
          <li>
            <strong>Display name</strong> — shown to other participants in events you join
            (organizers, judges, and fellow players).
          </li>
          <li>
            <strong>Tournament data</strong> — events you organize or participate in, players
            you add, pairings generated, scores you submit or confirm, and judge calls you
            make. This data is visible to other participants in the same event.
          </li>
        </ul>

        <h3 className="mt-4 font-semibold">Data received from Google OAuth</h3>
        <p className="mt-2 leading-relaxed">
          When you sign in with Google, we request access to the following scopes:
        </p>
        <ul className="mt-2 list-disc space-y-1.5 pl-6">
          <li>
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">openid</code> — verifies
            your Google identity during login.
          </li>
          <li>
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">email</code> — your
            Google email address, used as your account identifier.
          </li>
          <li>
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">profile</code> — your
            Google display name, used to pre-fill your TableTop Prime profile.
          </li>
        </ul>
        <p className="mt-3 leading-relaxed">
          <strong>We do not request</strong> access to your Google Drive, Gmail, Contacts,
          Calendar, YouTube, or any other Google service. We do not read your emails, post on
          your behalf, or share your Google data with third parties.
        </p>

        <h3 className="mt-4 font-semibold">Data collected automatically</h3>
        <ul className="mt-2 list-disc space-y-1.5 pl-6">
          <li>
            <strong>Authentication cookies</strong> — a Supabase session JWT
            (<code className="rounded bg-muted px-1.5 py-0.5 text-xs">sb-&lt;project-ref&gt;-auth-token</code>)
            keeps you signed in. Refreshed automatically on each request.
          </li>
          <li>
            <strong>Theme preference</strong> — a cookie storing your light/dark/system
            theme choice.
          </li>
          <li>
            <strong>Anonymous page-view analytics</strong> — collected by Vercel Analytics.
            Includes page URL, referrer, country (derived from IP), and browser/OS. No user
            IDs, no cross-site tracking, no advertising identifiers.
          </li>
          <li>
            <strong>Server logs</strong> — standard request logs (IP, timestamp, user agent)
            retained by Vercel and Supabase for security and abuse prevention. Automatically
            purged per their respective retention policies.
          </li>
        </ul>
      </section>

      {/* Why we request Google data */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ExternalLink className="h-4 w-4 text-primary" aria-hidden="true" />
            Why we request your Google data
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed">
          <p>
            We use Google Sign-In solely to authenticate you — to verify you are who you
            claim to be when creating a TableTop Prime account. Specifically:
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-6">
            <li>
              <strong>Email</strong> becomes your account identifier. Without it, we cannot
              create a unique account or send you event invitations, password-reset emails, or
              GDPR deletion confirmations.
            </li>
            <li>
              <strong>Name</strong> pre-fills your profile so other participants in your events
              can recognize you. You can change this name at any time from your Account page.
            </li>
          </ul>
          <p className="mt-3">
            We do <strong>not</strong> use your Google data for advertising, marketing, or
            selling to third parties. We do <strong>not</strong> post to Google on your behalf
            or access any other Google service.
          </p>
        </CardContent>
      </Card>

      {/* How we store data */}
      <section>
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Shield className="h-5 w-5 text-primary" aria-hidden="true" />
          2. How we store and protect data
        </h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-6">
          <li>
            <strong>Database:</strong> Supabase (PostgreSQL) hosted in Canada
            (ca-central-1). Data is encrypted at rest and in transit (TLS 1.2+).
          </li>
          <li>
            <strong>Authentication:</strong> Supabase Auth handles password hashing,
            OAuth token exchange, and session JWTs. We never see or store your Google
            password — Google authenticates you on its own servers and sends us only the
            email and name listed above.
          </li>
          <li>
            <strong>Real-time features:</strong> Judge calls use Supabase Realtime
            (WebSocket). The WebSocket carries only the judge-call data you submit — no
            additional personal data.
          </li>
          <li>
            <strong>Hosting:</strong> Vercel (Next.js). Vercel has access to request logs and
            analytics data only; it does not have access to your database.
          </li>
          <li>
            <strong>Row-Level Security (RLS):</strong> Every database table has RLS policies
            that prevent any user from reading or writing another user&apos;s data outside
            of events they participate in.
          </li>
        </ul>
      </section>

      {/* How we use data */}
      <section>
        <h2 className="text-xl font-semibold">3. How we use your data</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-6">
          <li>To create and maintain your TableTop Prime account.</li>
          <li>
            To identify you to other participants in events you join (display name and
            organizer&apos;s email only — never your password or auth tokens).
          </li>
          <li>To generate pairings, compute standings, and display real-time results.</li>
          <li>
            To send you transactional emails: event invitations, password resets, and
            account-deletion confirmations.
          </li>
          <li>
            To produce anonymized aggregate statistics (e.g., &ldquo;total events run on the
            platform&rdquo;) for product improvement. These statistics never include
            personally identifiable information.
          </li>
          <li>
            To export tournament results as CSV files when an organizer requests them.
          </li>
        </ul>
        <p className="mt-3 leading-relaxed">
          We do <strong>not</strong> sell your personal data to third parties or share
          it with data brokers. We do use Google AdSense to display ads on the
          site (see section 3a below).
        </p>

        {/* Advertising */}
        <h3 className="mt-4 font-semibold">3a. Advertising (Google AdSense)</h3>
        <p className="mt-2 leading-relaxed">
          TableTop Prime uses Google AdSense to display advertisements. AdSense
          uses cookies (including the <code className="rounded bg-muted px-1.5 py-0.5 text-xs">__gads</code>,
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">IDE</code>, and
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">NID</code> cookies) and device
          identifiers to serve ads based on your prior visits to this and other websites.
          Google&apos;s use of advertising cookies enables it and its partners to serve ads
          to you based on your visit to our site and/or other sites on the internet.
        </p>
        {/* Required by Google: prominent link to "How Google uses data" */}
        <Card className="mt-3 border-primary/30 bg-primary/5">
          <CardContent className="p-3 text-sm leading-relaxed">
            <p>
              <strong>How Google uses data when you use our partners&apos; sites:</strong>{' '}
              Learn how Google and its partners use cookies and data{' '}
              <a
                href="https://policies.google.com/technologies/partner-sites"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 font-medium"
              >
                across sites and apps
              </a>
              .
            </p>
          </CardContent>
        </Card>
        <ul className="mt-3 list-disc space-y-1.5 pl-6">
          <li>
            You may opt out of personalized advertising by visiting{' '}
            <a
              href="https://www.google.com/settings/ads"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            >
              Google Ads Settings
            </a>
            .
          </li>
          <li>
            You may opt out of third-party vendors&apos; use of cookies for personalized
            advertising by visiting{' '}
            <a
              href="https://www.aboutads.info"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            >
              www.aboutads.info
            </a>
            .
          </li>
          <li>
            AdSense cookies are <strong>non-essential</strong> and are only loaded after
            you accept &ldquo;all cookies&rdquo; in our consent banner. If you choose
            &ldquo;essential only&rdquo;, no ad cookies are set.
          </li>
          <li>
            Google&apos;s use of advertising cookies is governed by{' '}
            <a
              href="https://policies.google.com/technologies/ads"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            >
              Google&apos;s Advertising Cookies policy
            </a>
            .
          </li>
        </ul>
      </section>

      {/* Third-party processors */}
      <section>
        <h2 className="text-xl font-semibold">4. Third-party processors</h2>
        <p className="mt-2 leading-relaxed">
          We rely on the following services to operate TableTop Prime. Each is a sub-processor
          with access to the data listed:
        </p>
        <ul className="mt-3 list-disc space-y-1.5 pl-6">
          <li>
            <strong>Supabase Inc.</strong> — database hosting, authentication, real-time
            WebSocket infrastructure. Access: email, hashed password (if you set one), display
            name, and all tournament data. Regions: Canada (ca-central-1).
          </li>
          <li>
            <strong>Vercel Inc.</strong> — web hosting, edge CDN, and analytics. Access:
            request logs (IP, user agent, timestamps) and anonymous page-view analytics.
          </li>
          <li>
            <strong>Google LLC</strong> — OAuth identity provider AND advertising (Google AdSense).
            Access for auth: only the email and profile name Google sends us during sign-in.
            Access for ads: Google AdSense sets cookies (<code className="rounded bg-muted px-1.5 py-0.5 text-xs">__gads</code>,
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">IDE</code>,
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">NID</code>) on your browser
            to serve personalized ads, but only after you accept &ldquo;all cookies&rdquo; in our
            consent banner. Google&apos;s use of your data is
            governed by{' '}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            >
              Google&apos;s Privacy Policy
            </a>
            .
          </li>
        </ul>
      </section>

      {/* Data sharing */}
      <section>
        <h2 className="text-xl font-semibold">5. When we share your data</h2>
        <p className="mt-2 leading-relaxed">
          We share your data only in these specific situations:
        </p>
        <ul className="mt-3 list-disc space-y-1.5 pl-6">
          <li>
            <strong>Within events you join:</strong> your display name is visible to other
            participants in the same event (organizers, judges, players). Your email is
            visible only to the event organizer.
          </li>
          <li>
            <strong>Public share pages:</strong> when an organizer publishes an event, a
            public page at <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/share/&lt;eventCode&gt;</code> shows
            player names, colors, and scores. <strong>No emails, no user IDs</strong> are
            ever shown on public pages.
          </li>
          <li>
            <strong>Legal compliance:</strong> if required by law, court order, or to protect
            the rights, property, or safety of TableTop Prime, our users, or the public.
          </li>
          <li>
            <strong>Business transfer:</strong> in the event of a merger, acquisition, or
            asset sale, user data may be transferred. We will notify you by email before any
            such transfer.
          </li>
        </ul>
      </section>

      {/* Data retention */}
      <section>
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Cookie className="h-5 w-5 text-primary" aria-hidden="true" />
          6. Data retention
        </h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-6">
          <li>
            <strong>Active accounts:</strong> your data is retained while your account is
            active.
          </li>
          <li>
            <strong>Account deletion requests:</strong> when you request deletion from your
            Account page, your email is anonymized, your password is cleared, your auth.users
            entry is locked, and your EventParticipant rows are removed within 30 days.
            Historical tournament results (player names, scores, pairings) are preserved for
            archival integrity — the Player rows have their <code className="rounded bg-muted px-1.5 py-0.5 text-xs">userId</code> nulled
            so they are no longer linked to your account.
          </li>
          <li>
            <strong>Event data:</strong> pairings, scores, and placements are retained
            indefinitely as archival records of past tournaments, even after the organizer
            leaves or the event is deleted.
          </li>
          <li>
            <strong>Server logs:</strong> Vercel and Supabase retain request logs according
            to their own policies (typically 30–90 days).
          </li>
        </ul>
      </section>

      {/* Your rights */}
      <section>
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Trash2 className="h-5 w-5 text-primary" aria-hidden="true" />
          7. Your rights (GDPR / CCPA / LGPD)
        </h2>
        <p className="mt-2 leading-relaxed">
          Depending on your jurisdiction, you may have the following rights over your personal
          data:
        </p>
        <ul className="mt-3 list-disc space-y-1.5 pl-6">
          <li><strong>Access</strong> — request a copy of the data we hold about you.</li>
          <li><strong>Rectification</strong> — correct inaccurate or incomplete data.</li>
          <li>
            <strong>Erasure</strong> — request deletion of your account and personal data
            (the &ldquo;Right to be Forgotten&rdquo;, GDPR Article 17).
          </li>
          <li>
            <strong>Restriction</strong> — ask us to limit how we use your data while a
            complaint is resolved.
          </li>
          <li>
            <strong>Portability</strong> — receive your data in a machine-readable format.
          </li>
          <li>
            <strong>Objection</strong> — object to processing based on legitimate interests.
          </li>
        </ul>
        <p className="mt-3 leading-relaxed">
          To exercise any of these rights,{' '}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-primary underline underline-offset-2"
          >
            email us
          </a>{' '}
          or visit your Account page and click &ldquo;Request deletion&rdquo;. We respond to
          all verifiable requests within 30 days.
        </p>
      </section>

      {/* Cookies */}
      <section>
        <h2 className="text-xl font-semibold">8. Cookies</h2>
        <p className="mt-2 leading-relaxed">
          We use a combination of essential, analytics, and advertising
          cookies. The table below summarizes each cookie; our full{' '}
          <a href="/cookies" className="text-primary underline underline-offset-2">
            Cookie Policy
          </a>{' '}
          has the complete list with durations and purposes.
        </p>
        <ul className="mt-3 list-disc space-y-1.5 pl-6">
          <li>
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">sb-&lt;project-ref&gt;-auth-token</code> —
            Supabase session JWT. Required for authentication. HttpOnly, Secure, SameSite=Lax.
            <strong> Essential.</strong>
          </li>
          <li>
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">theme</code> — stores
            your light/dark/system preference. <strong>Essential.</strong>
          </li>
          <li>
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">tabletop-prime-ui</code> —
            stores UI state (locale, active event). <strong>Essential.</strong>
          </li>
          <li>
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">_vercel_jwt</code> —
            Vercel Analytics cookie for anonymous page views.{' '}
            <strong>Analytics.</strong> Loaded only after you accept
            &ldquo;all cookies&rdquo;.
          </li>
          <li>
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">__gads</code>,{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">IDE</code>,{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">NID</code> — Google
            AdSense cookies for ad personalization, delivery, and measurement.{' '}
            <strong>Advertising.</strong> Loaded only after you accept
            &ldquo;all cookies&rdquo;. See section 3a above for opt-out links.
          </li>
        </ul>
        <p className="mt-3 leading-relaxed">
          You can control which cookies are set by using our{' '}
          <a href="/cookies" className="text-primary underline underline-offset-2">
            consent manager
          </a>
          . Choose &ldquo;essential only&rdquo; to block all analytics and
          advertising cookies.
        </p>
      </section>

      {/* Children */}
      <section>
        <h2 className="text-xl font-semibold">9. Children&apos;s privacy</h2>
        <p className="mt-2 leading-relaxed">
          TableTop Prime is not directed at children under 13 (or the equivalent minimum age
          in your jurisdiction). We do not knowingly collect personal data from children. If
          you believe a child has provided us with personal data, please{' '}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-primary underline underline-offset-2"
          >
            contact us
          </a>{' '}
          and we will delete it promptly.
        </p>
      </section>

      {/* Changes */}
      <section>
        <h2 className="text-xl font-semibold">10. Changes to this policy</h2>
        <p className="mt-2 leading-relaxed">
          We may update this Privacy Policy from time to time. When we do, we will revise the
          &ldquo;Last updated&rdquo; date at the top of this page. For material changes that
          affect how we use your data, we will notify you by email and require renewed consent
          before applying the changes.
        </p>
      </section>

      {/* Contact */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4 text-primary" aria-hidden="true" />
            Contact
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed">
          <p>
            For any privacy questions, data requests, or to report a privacy concern, contact
            our Data Protection Officer at:
          </p>
          <p className="mt-2">
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-medium text-primary underline underline-offset-2"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            If you are not satisfied with our response, you have the right to lodge a
            complaint with your local data protection authority. In the EU, that is your
            national DPA; in Argentina, the AAIP; in California, the Attorney General.
          </p>
        </CardContent>
      </Card>
    </>
  )
}
