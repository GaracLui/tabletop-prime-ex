/**
 * Contenido de la Política de Cookies — Español.
 *
 * Este es el contenido del cuerpo (secciones) para /cookies. La estructura
 * de la página (encabezado, título, selector de idioma, pie) es manejada por <LegalPage>.
 *
 * Importado por: src/app/cookies/page.tsx
 */
import { Cookie, Shield, Settings, Mail } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CookieConsentManager } from '@/components/cookie-consent-manager'

const CONTACT_EMAIL = 'privacy@tabletopprime.com'

export function CookiesContentEs() {
  return (
    <>
      {/* Intro */}
      <section>
        <p className="leading-relaxed">
          Esta Política de Cookies explica cómo TableTop Prime utiliza cookies y
          tecnologías similares (en conjunto, &ldquo;cookies&rdquo;) para operar el
          servicio. Las cookies son pequeños archivos de texto almacenados en su
          navegador. Utilizamos cookies esenciales para autenticación y preferencias,
          cookies de analítica para comprender cómo se usa el sitio y — si usted las
          acepta — cookies publicitarias servidas por Google AdSense.
        </p>
        <p className="mt-3 leading-relaxed">
          <strong>Usted tiene el control.</strong> Nuestro banner de consentimiento le
          permite elegir &ldquo;todas las cookies&rdquo; (esenciales + analítica +
          publicidad) o &ldquo;solo esenciales&rdquo; (sin analítica, sin publicidad).
          Puede cambiar su elección en cualquier momento utilizando el gestor de
          consentimiento en la parte inferior de esta página.
        </p>
        <p className="mt-3 leading-relaxed">
          No utilizamos cookies para seguimiento entre sitios, creación de perfiles
          de comportamiento ni intercambio de datos con corredores de datos. No{' '}
          utilizamos Facebook Pixel, LinkedIn Insight Tag ni ningún rastreador de
          redes sociales. Las únicas cookies publicitarias son las establecidas por
          Google AdSense, y únicamente después de que usted las acepte explícitamente.
        </p>
        <p className="mt-3 leading-relaxed">
          Esta política debe leerse junto con nuestra{' '}
          <a href="/privacy" className="text-primary underline underline-offset-2">
            Política de Privacidad
          </a>
          , que explica cómo manejamos sus datos personales de forma más amplia.
        </p>
      </section>

      {/* Summary table */}
      <section>
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Cookie className="h-5 w-5 text-primary" aria-hidden="true" />
          1. Cookies que utilizamos — resumen
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                <th className="px-3 py-2 font-semibold">Cookie</th>
                <th className="px-3 py-2 font-semibold">Propósito</th>
                <th className="px-3 py-2 font-semibold">Tipo</th>
                <th className="px-3 py-2 font-semibold">Duración</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/60 align-top">
                <td className="px-3 py-2">
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                    sb-&lt;project-ref&gt;-auth-token
                  </code>
                </td>
                <td className="px-3 py-2">Sesión de autenticación de Supabase (JWT)</td>
                <td className="px-3 py-2">Esencial</td>
                <td className="px-3 py-2">7 días (renovada en cada solicitud)</td>
              </tr>
              <tr className="border-b border-border/60 align-top">
                <td className="px-3 py-2">
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">theme</code>
                </td>
                <td className="px-3 py-2">Almacena su elección de tema claro/oscuro/sistema</td>
                <td className="px-3 py-2">Esencial</td>
                <td className="px-3 py-2">1 año (persistida vía Zustand)</td>
              </tr>
              <tr className="border-b border-border/60 align-top">
                <td className="px-3 py-2">
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">tabletop-prime-ui</code>
                </td>
                <td className="px-3 py-2">Almacena el estado de la interfaz (idioma, preferencia de idioma)</td>
                <td className="px-3 py-2">Esencial</td>
                <td className="px-3 py-2">Persistido (sin vencimiento)</td>
              </tr>
              <tr className="border-b border-border/60 align-top">
                <td className="px-3 py-2">
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">_vercel_jwt</code>
                </td>
                <td className="px-3 py-2">Analítica anónima de vistas de página (Vercel Analytics)</td>
                <td className="px-3 py-2">Analítica</td>
                <td className="px-3 py-2">Sesión (se borra al cerrar el navegador)</td>
              </tr>
              <tr className="border-b border-border/60 align-top">
                <td className="px-3 py-2">
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">__gads</code>
                </td>
                <td className="px-3 py-2">Google AdSense — personalización de publicidad</td>
                <td className="px-3 py-2">Publicidad</td>
                <td className="px-3 py-2">13 meses</td>
              </tr>
              <tr className="border-b border-border/60 align-top">
                <td className="px-3 py-2">
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">IDE</code>
                </td>
                <td className="px-3 py-2">Google DoubleClick — entrega y medición de anuncios</td>
                <td className="px-3 py-2">Publicidad</td>
                <td className="px-3 py-2">2 años</td>
              </tr>
              <tr className="align-top">
                <td className="px-3 py-2">
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">NID</code>
                </td>
                <td className="px-3 py-2">Google — preferencias de anuncios y analítica de usuario</td>
                <td className="px-3 py-2">Publicidad</td>
                <td className="px-3 py-2">6 meses</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Nota: el nombre exacto de la cookie de Supabase incluye la referencia de su
          proyecto, p. ej.{' '}
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
          2. Cookies esenciales
        </h2>
        <p className="mt-2 leading-relaxed">
          Estas cookies son estrictamente necesarias para que el servicio funcione. Sin
          ellas, usted no podría iniciar sesión, mantenerse identificado entre cargas de
          páginas ni utilizar su idioma y tema preferidos. Dado que son esenciales, no se
          pueden deshabilitar — hacerlo rompería la funcionalidad principal.
        </p>
        <ul className="mt-3 list-disc space-y-1.5 pl-6">
          <li>
            <strong>JWT de sesión de Supabase</strong> — se emite cuando usted inicia
            sesión. Contiene su identificador de usuario y un token firmado que demuestra a
            nuestras rutas API que usted está autenticado. HttpOnly (no legible por
            JavaScript), Secure (solo HTTPS), SameSite=Lax (evita la mayoría de los ataques
            CSRF). Se renueva automáticamente por el proxy de Next.js en cada solicitud, de
            modo que usted permanece identificado hasta que cierre sesión explícitamente.
          </li>
          <li>
            <strong>Preferencia de tema</strong> — almacena{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">light</code>,{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">dark</code> o{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">system</code>. Sin ella,
            el sitio parpadearía entre temas en cada carga de página.
          </li>
          <li>
            <strong>Estado de la interfaz</strong> — persiste su idioma seleccionado
            (inglés o español) y cualquier contexto de torneo en curso (como el
            identificador de evento activo) para que salir y volver no pierda su lugar.
          </li>
        </ul>
      </section>

      {/* Analytics cookies */}
      <section>
        <h2 className="text-xl font-semibold">3. Cookies de analítica</h2>
        <p className="mt-2 leading-relaxed">
          Utilizamos Vercel Analytics para recopilar estadísticas anónimas de vistas de
          página. Esto nos ayuda a comprender qué funciones se utilizan más y dónde los
          usuarios se quedan trabados, para que podamos mejorar el producto.
        </p>
        <ul className="mt-3 list-disc space-y-1.5 pl-6">
          <li>
            <strong>Qué se recopila:</strong> URL de la página, referente, país (derivado
            de la dirección IP, que luego se descarta), navegador y sistema operativo, y un
            identificador anónimo de sesión.
          </li>
          <li>
            <strong>Qué NO se recopila:</strong> su correo electrónico, nombre,
            identificador de usuario, dirección IP (retenida), historial de navegación entre
            sitios ni ningún dato que pueda identificarlo personalmente.
          </li>
          <li>
            <strong>Sin publicidad:</strong> Vercel Analytics no comparte datos con redes
            publicitarias. Las cookies de Google AdSense se cargan únicamente después de
            que usted acepta &ldquo;todas las cookies&rdquo; en nuestro banner de
            consentimiento. No hay Facebook Pixel ni rastreadores similares en TableTop
            Prime.
          </li>
        </ul>
        <p className="mt-3 leading-relaxed">
          Las cookies de analítica no son estrictamente necesarias — el sitio funcionaría
          sin ellas — pero nos ayudan a mejorar el servicio. Si desea excluirse, puede usar
          una extensión del navegador que bloquee scripts de analítica (como uBlock Origin),
          activar &ldquo;No Rastrear&rdquo; en su navegador o usar un navegador centrado en
          la privacidad como Brave o Firefox con la protección de seguimiento estricta.
        </p>
      </section>

      {/* What we do NOT use */}
      <Card className="border-destructive/20 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-base">Cookies que NO utilizamos</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed">
          <ul className="list-disc space-y-1.5 pl-6">
            <li>
              <strong>Sin cookies de seguimiento entre sitios</strong> — sin cookies de
              terceros que lo sigan entre sitios web.
            </li>
            <li>
              <strong>Sin cookies de redes sociales</strong> — sin Facebook Pixel,
              LinkedIn Insight Tag, Twitter Pixel ni botones de compartir en redes
              sociales que establezcan cookies de seguimiento.
            </li>
            <li>
              <strong>Sin cookies de repetición de sesión</strong> — sin Hotjar,
              FullStory ni LogRocket.
            </li>
            <li>
              <strong>Sin cookies de widget de chat</strong> — sin Intercom, Drift ni
              widget de Zendesk.
            </li>
            <li>
              <strong>Sin intercambio con corredores de datos</strong> — nunca vendemos ni
              compartimos datos derivados de cookies con corredores de datos ni redes
              publicitarias que no sean Google AdSense (que se menciona arriba).
            </li>
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            <strong>Nota sobre Google AdSense:</strong> las únicas cookies publicitarias
            utilizadas son las establecidas por Google AdSense
            (<code className="rounded bg-muted px-1 py-0.5 text-xs">__gads</code>,
            <code className="rounded bg-muted px-1 py-0.5 text-xs">IDE</code>,
            <code className="rounded bg-muted px-1 py-0.5 text-xs">NID</code>).
            Estas se cargan <strong>únicamente</strong> después de que usted acepta
            &ldquo;todas las cookies&rdquo; en nuestro banner de consentimiento. Elija
            &ldquo;solo esenciales&rdquo; para bloquear todas las cookies publicitarias.
          </p>
        </CardContent>
      </Card>

      {/* Managing cookies */}
      <section>
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Settings className="h-5 w-5 text-primary" aria-hidden="true" />
          4. Gestión y eliminación de cookies
        </h2>
        <p className="mt-2 leading-relaxed">
          Puede ver, bloquear o eliminar cookies en cualquier momento a través de la
          configuración de su navegador. A continuación se encuentran las páginas de
          configuración relevantes para los principales navegadores:
        </p>
        <ul className="mt-3 list-disc space-y-1.5 pl-6">
          <li>
            <a
              href="https://support.google.com/chrome/answer/95647"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            >
              Google Chrome — Administrar cookies
            </a>
          </li>
          <li>
            <a
              href="https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            >
              Firefox — Protección contra el seguimiento mejorada
            </a>
          </li>
          <li>
            <a
              href="https://support.apple.com/guide/safari/sfri11471/mac"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            >
              Safari — Administrar cookies y datos de sitios web
            </a>
          </li>
          <li>
            <a
              href="https://www.microsoft.com/en-us/edge/help-and-settings"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            >
              Microsoft Edge — Configuración de privacidad
            </a>
          </li>
        </ul>
        <p className="mt-3 leading-relaxed">
          <strong>Nota:</strong> si bloquea la cookie de sesión de Supabase, no podrá
          iniciar sesión. Las páginas públicas del sitio (inicio, política de privacidad,
          términos, cookies y páginas de compartir eventos) seguirán funcionando sin
          ninguna cookie — son totalmente legibles sin autenticación.
        </p>
      </section>

      {/* Third-party cookies */}
      <section>
        <h2 className="text-xl font-semibold">5. Cookies de terceros</h2>
        <p className="mt-2 leading-relaxed">
          Durante el inicio de sesión con Google, Google puede establecer sus propias
          cookies en{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">accounts.google.com</code>
          para gestionar el flujo OAuth. Estas cookies son establecidas directamente por
          Google y se rigen por{' '}
          <a
            href="https://policies.google.com/technologies/cookies"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2"
          >
            la Política de Cookies de Google
          </a>
          . TableTop Prime no controla, lee ni tiene acceso a las cookies de Google —
          viven en el dominio de Google, no en el nuestro.
        </p>
        <p className="mt-3 leading-relaxed">
          Después de que Google lo redirija de vuelta a TableTop Prime, recibimos únicamente
          un código de autorización que intercambiamos por una sesión de Supabase. Las
          cookies de Google no se envían a nuestros servidores.
        </p>
      </section>

      {/* Changes */}
      <section>
        <h2 className="text-xl font-semibold">6. Cambios a esta política</h2>
        <p className="mt-2 leading-relaxed">
          Si agregamos, eliminamos o modificamos alguna cookie, actualizaremos esta página
          y revisaremos la fecha de &ldquo;Última actualización&rdquo; en la parte superior.
          Para cambios materiales (p. ej. agregar una nueva cookie de analítica), le
          notificaremos por correo electrónico y requeriremos un nuevo consentimiento cuando
          lo exija la ley.
        </p>
      </section>

      {/* Consent manager — shows current choice + reset button */}
      <CookieConsentManager />

      {/* Contact */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4 text-primary" aria-hidden="true" />
            Contacto
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed">
          <p>
            Para cualquier consulta sobre esta Política de Cookies o para solicitar detalles
            sobre las cookies establecidas en su dispositivo, contáctenos en:
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
