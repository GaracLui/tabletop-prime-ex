/**
 * Cookie Policy content — English.
 *
 * This is the body content (sections) for /cookies. The page shell
 * (header, title, language toggle, footer) is handled by <LegalPage>.
 *
 * Imported by: src/app/cookies/page.tsx
 */
import { Cookie, Shield, Settings, Mail } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CookieConsentManager } from '@/components/cookie-consent-manager'

const CONTACT_EMAIL = 'privacy@tabletopprime.com'

export function CookiesContentEn() {
  return (
    <>
      {/* Intro */}
      <section>
        <p className="leading-relaxed">
          This Cookie Policy explains how TableTop Prime uses cookies and similar
          technologies (collectively, &ldquo;cookies&rdquo;) to operate the service. Cookies
          are small text files stored in your browser. We use essential cookies
          for authentication and preferences, analytics cookies to understand how
          the site is used, and — if you accept them — advertising cookies served
          by Google AdSense.
        </p>
        <p className="mt-3 leading-relaxed">
          <strong>You are in control.</strong> Our consent banner lets you choose
          &ldquo;all cookies&rdquo; (essential + analytics + advertising) or
          &ldquo;essential only&rdquo; (no analytics, no advertising). You can
          change your choice at any time using the consent manager at the bottom
          of this page.
        </p>
        <p className="mt-3 leading-relaxed">
          We do <strong>not</strong> use cookies for cross-site tracking, building
          behavioral profiles, or sharing data with data brokers. We do{' '}
          <strong>not</strong> use Facebook Pixel, LinkedIn Insight Tag, or any
          social-media tracker. The only advertising cookies are those set by
          Google AdSense, and only after you explicitly accept them.
        </p>
        <p className="mt-3 leading-relaxed">
          This policy should be read alongside our{' '}
          <a href="/privacy" className="text-primary underline underline-offset-2">
            Privacy Policy
          </a>
          , which explains how we handle your personal data more broadly.
        </p>
      </section>

      {/* Summary table */}
      <section>
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Cookie className="h-5 w-5 text-primary" aria-hidden="true" />
          1. Cookies we use — summary
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                <th className="px-3 py-2 font-semibold">Cookie</th>
                <th className="px-3 py-2 font-semibold">Purpose</th>
                <th className="px-3 py-2 font-semibold">Type</th>
                <th className="px-3 py-2 font-semibold">Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/60 align-top">
                <td className="px-3 py-2">
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                    sb-&lt;project-ref&gt;-auth-token
                  </code>
                </td>
                <td className="px-3 py-2">Supabase authentication session (JWT)</td>
                <td className="px-3 py-2">Essential</td>
                <td className="px-3 py-2">7 days (refreshed on each request)</td>
              </tr>
              <tr className="border-b border-border/60 align-top">
                <td className="px-3 py-2">
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">theme</code>
                </td>
                <td className="px-3 py-2">Stores your light/dark/system theme choice</td>
                <td className="px-3 py-2">Essential</td>
                <td className="px-3 py-2">1 year (persisted via Zustand)</td>
              </tr>
              <tr className="border-b border-border/60 align-top">
                <td className="px-3 py-2">
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">tabletop-prime-ui</code>
                </td>
                <td className="px-3 py-2">Stores UI state (locale, language preference)</td>
                <td className="px-3 py-2">Essential</td>
                <td className="px-3 py-2">Persisted (no expiry)</td>
              </tr>
              <tr className="border-b border-border/60 align-top">
                <td className="px-3 py-2">
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">_vercel_jwt</code>
                </td>
                <td className="px-3 py-2">Anonymous page-view analytics (Vercel Analytics)</td>
                <td className="px-3 py-2">Analytics</td>
                <td className="px-3 py-2">Session (cleared on browser close)</td>
              </tr>
              <tr className="border-b border-border/60 align-top">
                <td className="px-3 py-2">
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">__gads</code>
                </td>
                <td className="px-3 py-2">Google AdSense — advertising personalization</td>
                <td className="px-3 py-2">Advertising</td>
                <td className="px-3 py-2">13 months</td>
              </tr>
              <tr className="border-b border-border/60 align-top">
                <td className="px-3 py-2">
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">IDE</code>
                </td>
                <td className="px-3 py-2">Google DoubleClick — ad delivery and measurement</td>
                <td className="px-3 py-2">Advertising</td>
                <td className="px-3 py-2">2 years</td>
              </tr>
              <tr className="align-top">
                <td className="px-3 py-2">
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">NID</code>
                </td>
                <td className="px-3 py-2">Google — ad preferences and user analytics</td>
                <td className="px-3 py-2">Advertising</td>
                <td className="px-3 py-2">6 months</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Note: the exact Supabase cookie name includes your project reference, e.g.
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
            sb-abcdefghijklmnopqrstuvwxyz-auth-token
          </code>
          .
        </p>
      </section>

      {/* Essential cookies */}
      <section>
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Shield className="h-5 w-5 text-primary" aria-hidden="true" />
          2. Essential cookies
        </h2>
        <p className="mt-2 leading-relaxed">
          These cookies are strictly necessary for the service to function. Without them, you
          could not sign in, stay signed in between page loads, or use your preferred language
          and theme. Because they are essential, they cannot be disabled — doing so would break
          core functionality.
        </p>
        <ul className="mt-3 list-disc space-y-1.5 pl-6">
          <li>
            <strong>Supabase session JWT</strong> — issued when you sign in. Contains your
            user ID and a signed token that proves to our API routes that you are
            authenticated. HttpOnly (not readable by JavaScript), Secure (HTTPS only),
            SameSite=Lax (prevents most CSRF attacks). Refreshed automatically by the Next.js
            proxy on every request, so you stay signed in until you explicitly sign out.
          </li>
          <li>
            <strong>Theme preference</strong> — stores <code className="rounded bg-muted px-1.5 py-0.5 text-xs">light</code>,
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">dark</code>, or
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">system</code>. Without
            it, the site would flicker between themes on each page load.
          </li>
          <li>
            <strong>UI state</strong> — persists your selected language (English or Spanish)
            and any in-progress tournament context (such as the active event ID) so that
            navigating away and back does not lose your place.
          </li>
        </ul>
      </section>

      {/* Analytics cookies */}
      <section>
        <h2 className="text-xl font-semibold">3. Analytics cookies</h2>
        <p className="mt-2 leading-relaxed">
          We use Vercel Analytics to collect anonymous page-view statistics. This helps us
          understand which features are used most and where users get stuck, so we can
          improve the product.
        </p>
        <ul className="mt-3 list-disc space-y-1.5 pl-6">
          <li>
            <strong>What is collected:</strong> page URL, referrer, country (derived from IP
            address, then discarded), browser and operating system, and an anonymous session
            identifier.
          </li>
          <li>
            <strong>What is NOT collected:</strong> your email, name, user ID, IP address
            (retained), cross-site browsing history, or any data that could identify you
            personally.
          </li>
          <li>
            <strong>No advertising:</strong> Vercel Analytics does not share data with
            advertising networks. Google AdSense cookies are loaded only after you
            accept &ldquo;all cookies&rdquo; in our consent banner. There are no Facebook Pixel or similar
            trackers on TableTop Prime.
          </li>
        </ul>
        <p className="mt-3 leading-relaxed">
          Analytics cookies are not strictly necessary — the site would function without them
          — but they help us improve the service. If you wish to opt out, you can use a
          browser extension that blocks analytics scripts (such as uBlock Origin), enable
          &ldquo;Do Not Track&rdquo; in your browser, or use a privacy-focused browser like
          Brave or Firefox with Strict tracking protection.
        </p>
      </section>

      {/* What we do NOT use */}
      <Card className="border-destructive/20 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-base">Cookies we do NOT use</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed">
          <ul className="list-disc space-y-1.5 pl-6">
            <li>
              <strong>No cross-site tracking cookies</strong> — no third-party
              cookies that follow you across websites.
            </li>
            <li>
              <strong>No social media cookies</strong> — no Facebook Pixel,
              LinkedIn Insight Tag, Twitter Pixel, or any social-share buttons
              that set tracking cookies.
            </li>
            <li>
              <strong>No session-replay cookies</strong> — no Hotjar, FullStory,
              or LogRocket.
            </li>
            <li>
              <strong>No chat-widget cookies</strong> — no Intercom, Drift, or
              Zendesk widget.
            </li>
            <li>
              <strong>No data-broker sharing</strong> — we never sell or share
              cookie-derived data with data brokers or advertising networks other
              than Google AdSense (which is disclosed above).
            </li>
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            <strong>Note on Google AdSense:</strong> the only advertising cookies
            used are those set by Google AdSense (<code className="rounded bg-muted px-1 py-0.5 text-xs">__gads</code>,
            <code className="rounded bg-muted px-1 py-0.5 text-xs">IDE</code>,
            <code className="rounded bg-muted px-1 py-0.5 text-xs">NID</code>).
            These are loaded <strong>only</strong> after you accept
            &ldquo;all cookies&rdquo; in our consent banner. Choose
            &ldquo;essential only&rdquo; to block all advertising cookies.
          </p>
        </CardContent>
      </Card>

      {/* Managing cookies */}
      <section>
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Settings className="h-5 w-5 text-primary" aria-hidden="true" />
          4. Managing and deleting cookies
        </h2>
        <p className="mt-2 leading-relaxed">
          You can view, block, or delete cookies at any time through your browser settings.
          Here are the relevant settings pages for major browsers:
        </p>
        <ul className="mt-3 list-disc space-y-1.5 pl-6">
          <li>
            <a
              href="https://support.google.com/chrome/answer/95647"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            >
              Google Chrome — Manage cookies
            </a>
          </li>
          <li>
            <a
              href="https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            >
              Firefox — Enhanced Tracking Protection
            </a>
          </li>
          <li>
            <a
              href="https://support.apple.com/guide/safari/sfri11471/mac"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            >
              Safari — Manage cookies and website data
            </a>
          </li>
          <li>
            <a
              href="https://www.microsoft.com/en-us/edge/help-and-settings"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            >
              Microsoft Edge — Privacy settings
            </a>
          </li>
        </ul>
        <p className="mt-3 leading-relaxed">
          <strong>Note:</strong> if you block the Supabase session cookie, you will not be
          able to sign in. The site&apos;s public pages (landing, privacy policy, terms,
          cookies, and event share pages) will still work without any cookies — they are
          fully readable without authentication.
        </p>
      </section>

      {/* Third-party cookies */}
      <section>
        <h2 className="text-xl font-semibold">5. Third-party cookies</h2>
        <p className="mt-2 leading-relaxed">
          During sign-in with Google, Google may set its own cookies on
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">accounts.google.com</code>
          to manage the OAuth flow. These cookies are set by Google directly and are governed
          by{' '}
          <a
            href="https://policies.google.com/technologies/cookies"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2"
          >
            Google&apos;s Cookie Policy
          </a>
          . TableTop Prime does not control, read, or have access to Google&apos;s cookies —
          they live on Google&apos;s domain, not ours.
        </p>
        <p className="mt-3 leading-relaxed">
          After Google redirects you back to TableTop Prime, we receive only an authorization
          code which we exchange for a Supabase session. Google&apos;s cookies are not sent to
          our servers.
        </p>
      </section>

      {/* Changes */}
      <section>
        <h2 className="text-xl font-semibold">6. Changes to this policy</h2>
        <p className="mt-2 leading-relaxed">
          If we add, remove, or change any cookie, we will update this page and revise the
          &ldquo;Last updated&rdquo; date at the top. For material changes (e.g. adding a new
          analytics cookie), we will notify you by email and require renewed consent where
          required by law.
        </p>
      </section>

      {/* Consent manager — shows current choice + reset button */}
      <CookieConsentManager />

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
            For any questions about this Cookie Policy or to request details about the
            cookies set on your device, contact us at:
          </p>
          <p className="mt-2">
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-medium text-primary underline underline-offset-2"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        </CardContent>
      </Card>
    </>
  )
}
