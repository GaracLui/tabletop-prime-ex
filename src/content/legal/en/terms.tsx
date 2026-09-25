/**
 * Terms of Service content — English.
 *
 * This is the body content (sections) for /terms. The page shell
 * (header, title, language toggle, footer) is handled by <LegalPage>.
 *
 * Imported by: src/app/terms/page.tsx
 */
import { AlertTriangle, Scale, Mail } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const CONTACT_EMAIL = 'legal@tabletopprime.com'

export function TermsContentEn() {
  return (
    <>
      <section>
        <p className="leading-relaxed">
          Welcome to TableTop Prime. By creating an account, signing in with Google or an
          email/password, or using any feature of the application, you agree to be bound by
          these Terms of Service. If you do not agree, do not create an account or use the
          application.
        </p>
      </section>

      <section>
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Scale className="h-5 w-5 text-primary" aria-hidden="true" />
          1. About TableTop Prime
        </h2>
        <p className="mt-2 leading-relaxed">
          TableTop Prime is a SaaS platform for organizing and running board game
          tournaments, leagues, and conventions. It provides pairing generation (Social Golfer
          / Swiss / Round Robin), dual-score verification, real-time judge dispatch, custom
          scoring rules, CSV export, and public share pages for results. The service is
          operated from <strong>tabletopprime.com</strong>.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">2. Eligibility</h2>
        <p className="mt-2 leading-relaxed">
          You must be at least 13 years old (or the minimum age for digital consent in your
          jurisdiction) to create an account. By using the service, you represent that you
          meet this requirement and are legally able to enter into a binding agreement.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">3. Accounts</h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-6">
          <li>
            You can sign in with Google OAuth or with an email and password. Both methods
            create the same kind of account.
          </li>
          <li>
            You are responsible for keeping your account credentials confidential and for all
            activity that occurs under your account.
          </li>
          <li>
            You agree to provide accurate information (a real email address and a recognizable
            display name) so other participants in your events can identify you.
          </li>
          <li>
            You can delete your account at any time from the Account page. Deletion
            anonymizes your personal data within 30 days, per our{' '}
            <a href="/privacy" className="text-primary underline underline-offset-2">
              Privacy Policy
            </a>
            .
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">4. Organizer responsibilities</h2>
        <p className="mt-2 leading-relaxed">If you create an event, you become its organizer. As an organizer, you agree to:</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-6">
          <li>Run events in accordance with the rules of your association, convention, or venue.</li>
          <li>
            Add only real participants (or placeholder names they have consented to) and
            remove players who ask to be removed.
          </li>
          <li>
            Use the dual-score verification system honestly — do not coerce players into
            confirming scores they did not verify.
          </li>
          <li>
            Not publish an event&apos;s public share page (at{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/share/&lt;eventCode&gt;</code>)
            if any participant has objected to their name being publicly visible.
          </li>
          <li>
            Be the point of contact for participants in your event. TableTop Prime does not
            mediate organizer–player disputes.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">5. Player responsibilities</h2>
        <p className="mt-2 leading-relaxed">As a player or judge in an event, you agree to:</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-6">
          <li>
            Submit truthful scores. The dual-score system exists precisely to prevent typos
            and bad-faith entries — deliberately submitting false scores is a violation of
            these Terms.
          </li>
          <li>
            Use the &ldquo;Call Judge&rdquo; feature only for genuine rules questions, score
            disputes, or table issues. Spamming judge calls may result in account suspension.
          </li>
          <li>
            Treat other participants with respect. TableTop Prime is a tool for running
            friendly tournaments, not a venue for harassment.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <AlertTriangle className="h-5 w-5 text-primary" aria-hidden="true" />
          6. Prohibited conduct
        </h2>
        <p className="mt-2 leading-relaxed">You agree not to:</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-6">
          <li>Use the service to harass, threaten, or impersonate another person.</li>
          <li>Submit scores, pairings, or judge calls you know to be false.</li>
          <li>Attempt to access another user&apos;s account, event data, or auth tokens.</li>
          <li>
            Scrape, crawl, or otherwise bulk-download data from the public share pages for
            purposes other than personal event follow-up.
          </li>
          <li>
            Use the service to run gambling, real-money wagering, or any activity prohibited
            by your local law.
          </li>
          <li>
            Reverse-engineer, decompile, or attempt to extract the source code of the
            application.
          </li>
          <li>Use the service to transmit malware or exploit attempts.</li>
        </ul>
        <p className="mt-3 leading-relaxed">
          Violations may result in immediate account suspension and, where applicable,
          referral to law enforcement.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">6a. Advertising</h2>
        <p className="mt-2 leading-relaxed">
          TableTop Prime displays advertisements served by Google AdSense.
          These ads are third-party content provided by Google and are
          governed by Google&apos;s terms of service. TableTop Prime does
          not control which specific ads are displayed and is not
          responsible for the content of advertisements.
        </p>
        <ul className="mt-2 list-disc space-y-1.5 pl-6">
          <li>
            Advertising cookies are only loaded after you accept
            &ldquo;all cookies&rdquo; in our consent banner. You may
            choose &ldquo;essential only&rdquo; to use the site without
            ads or advertising cookies.
          </li>
          <li>
            You may opt out of personalized advertising at{' '}
            <a
              href="https://www.google.com/settings/ads"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            >
              Google Ads Settings
            </a>{' '}
            or{' '}
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
            Clicking on an advertisement may take you to a third-party
            website. TableTop Prime is not responsible for the content
            or practices of third-party websites.
          </li>
          <li>
            Organizers who run events on the free tier will see ads on
            the dashboard and share pages. Future paid tiers may remove
            ads for subscribers.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">7. Prime tiers and pricing</h2>
        <p className="mt-2 leading-relaxed">
          TableTop Prime offers four tiers: Free, Tier 1, Tier 2, and Tier 3, distinguished
          by the maximum number of players per event. Tier limits are currently displayed for
          reference but not enforced — paid tiers are not yet available. When paid tiers
          launch, this section will be updated with billing terms, refund policy, and
          auto-renewal terms.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">8. Intellectual property</h2>
        <p className="mt-2 leading-relaxed">
          The TableTop Prime software, design, branding, and documentation are the
          intellectual property of the project maintainers. Tournament data (events,
          pairings, scores) you create remains yours — you may export it as CSV at any time.
          By using the service, you grant TableTop Prime a non-exclusive license to display
          your tournament data within the application and on public share pages you publish.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">9. Service availability</h2>
        <p className="mt-2 leading-relaxed">
          TableTop Prime is provided on an &ldquo;as available&rdquo; basis. We do not
          guarantee uninterrupted access. Maintenance windows, infrastructure outages, and
          third-party failures (Supabase, Vercel, Google OAuth) may cause downtime. We are
          not liable for any loss arising from service unavailability, including loss of
          tournament data — though we take regular automated backups and design the schema so
          that historical scores are preserved.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">10. Limitation of liability</h2>
        <p className="mt-2 leading-relaxed">
          To the maximum extent permitted by law, TableTop Prime and its maintainers shall
          not be liable for any indirect, incidental, special, consequential, or punitive
          damages, including loss of profits, data, or goodwill, arising out of or related to
          your use of the service. Our total liability for any claim arising from these Terms
          shall not exceed the amount you have paid us in the twelve months preceding the
          claim (currently zero, as paid tiers are not yet available).
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">11. Termination</h2>
        <p className="mt-2 leading-relaxed">
          You may terminate your account at any time from the Account page. We may suspend or
          terminate your account if you violate these Terms, if we are required to by law, or
          if we discontinue the service. Upon termination, your personal data is handled per
          our{' '}
          <a href="/privacy" className="text-primary underline underline-offset-2">
            Privacy Policy
          </a>
          .
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">12. Changes to these Terms</h2>
        <p className="mt-2 leading-relaxed">
          We may update these Terms from time to time. When we do, we will revise the
          &ldquo;Last updated&rdquo; date at the top of this page. For material changes, we
          will notify you by email and require renewed agreement before the changes take
          effect.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">13. Governing law</h2>
        <p className="mt-2 leading-relaxed">
          These Terms are governed by the laws of Argentina, without regard to conflict-of-law
          principles. Any dispute arising from these Terms shall be resolved in the courts of
          Buenos Aires, Argentina — except that you may bring a claim in your local
          small-claims court if it has jurisdiction.
        </p>
      </section>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4 text-primary" aria-hidden="true" />
            Contact
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed">
          <p>For any legal questions or notices, contact us at:</p>
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
