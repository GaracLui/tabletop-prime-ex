/**
 * Contenido de la Política de Privacidad — Español.
 *
 * Este es el contenido del cuerpo (secciones) para /privacy. La estructura
 * de la página (encabezado, título, selector de idioma, pie) es manejada por <LegalPage>.
 *
 * Importado por: src/app/privacy/page.tsx
 */
import { Shield, Cookie, Database, Mail, Trash2, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const CONTACT_EMAIL = 'privacy@tabletopprime.com'

export function PrivacyContentEs() {
  return (
    <>
      {/* Intro */}
      <section>
        <p className="leading-relaxed">
          TableTop Prime (&ldquo;nosotros&rdquo;, &ldquo;nos&rdquo; o &ldquo;la
          aplicación&rdquo;) es una plataforma de gestión de torneos y ligas para
          asociaciones de juegos de mesa, convenciones y comunidades locales de juego. Esta
          Política de Privacidad explica qué datos recopilamos, por qué los recopilamos, cómo
          se almacenan y qué opciones tiene sobre su información.
        </p>
        <p className="mt-3 leading-relaxed">
          Al crear una cuenta o utilizar cualquier función de TableTop Prime, usted acepta
          las prácticas descriptas en esta política. Si no está de acuerdo, no cree una
          cuenta.
        </p>
      </section>

      {/* What we collect */}
      <section>
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Database className="h-5 w-5 text-primary" aria-hidden="true" />
          1. Datos que recopilamos
        </h2>
        <h3 className="mt-4 font-semibold">Datos que usted proporciona directamente</h3>
        <ul className="mt-2 list-disc space-y-1.5 pl-6">
          <li>
            <strong>Correo electrónico</strong> — se utiliza como identificador único de su
            cuenta y para invitaciones a eventos, restablecimiento de contraseña y
            confirmaciones de eliminación de cuenta.
          </li>
          <li>
            <strong>Nombre para mostrar</strong> — se muestra a otros participantes en los
            eventos a los que se une (organizadores, jueces y compañeros jugadores).
          </li>
          <li>
            <strong>Datos de torneos</strong> — eventos que organiza o en los que participa,
            jugadores que agrega, emparejamientos generados, puntajes que envía o confirma y
            llamados a jueces que realiza. Estos datos son visibles para otros participantes
            del mismo evento.
          </li>
        </ul>

        <h3 className="mt-4 font-semibold">Datos recibidos de Google OAuth</h3>
        <p className="mt-2 leading-relaxed">
          Cuando inicia sesión con Google, solicitamos acceso a los siguientes ámbitos:
        </p>
        <ul className="mt-2 list-disc space-y-1.5 pl-6">
          <li>
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">openid</code> — verifica
            su identidad de Google durante el inicio de sesión.
          </li>
          <li>
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">email</code> — su
            dirección de correo electrónico de Google, utilizada como identificador de su
            cuenta.
          </li>
          <li>
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">profile</code> — su
            nombre para mostrar de Google, utilizado para completar previamente su perfil de
            TableTop Prime.
          </li>
        </ul>
        <p className="mt-3 leading-relaxed">
          <strong>No solicitamos</strong> acceso a su Google Drive, Gmail, Contactos,
          Calendario, YouTube ni ningún otro servicio de Google. No leemos sus correos
          electrónicos, no publicamos en su nombre ni compartimos sus datos de Google con
          terceros.
        </p>

        <h3 className="mt-4 font-semibold">Datos recopilados automáticamente</h3>
        <ul className="mt-2 list-disc space-y-1.5 pl-6">
          <li>
            <strong>Cookies de autenticación</strong> — un JWT de sesión de Supabase
            (<code className="rounded bg-muted px-1.5 py-0.5 text-xs">sb-&lt;project-ref&gt;-auth-token</code>)
            mantiene su sesión iniciada. Se renueva automáticamente en cada solicitud.
          </li>
          <li>
            <strong>Preferencia de tema</strong> — una cookie que almacena su elección de
            tema claro/oscuro/sistema.
          </li>
          <li>
            <strong>Analítica anónima de vistas de página</strong> — recopilada por Vercel
            Analytics. Incluye URL de la página, referente, país (derivado de la IP) y
            navegador/sistema operativo. Sin identificadores de usuario, sin seguimiento
            entre sitios, sin identificadores publicitarios.
          </li>
          <li>
            <strong>Registros del servidor</strong> — registros de solicitudes estándar (IP,
            marca de tiempo, user agent) retenidos por Vercel y Supabase para seguridad y
            prevención de abusos. Se eliminan automáticamente según sus respectivas políticas
            de retención.
          </li>
        </ul>
      </section>

      {/* Why we request Google data */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ExternalLink className="h-4 w-4 text-primary" aria-hidden="true" />
            Por qué solicitamos sus datos de Google
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed">
          <p>
            Utilizamos Google Sign-In únicamente para autenticarlo — para verificar que
            usted es quien dice ser al crear una cuenta de TableTop Prime. Específicamente:
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-6">
            <li>
              <strong>El correo electrónico</strong> se convierte en el identificador de su
              cuenta. Sin él, no podemos crear una cuenta única ni enviarle invitaciones a
              eventos, correos de restablecimiento de contraseña ni confirmaciones de
              eliminación de GDPR.
            </li>
            <li>
              <strong>El nombre</strong> completa previamente su perfil para que otros
              participantes de sus eventos puedan reconocerlo. Puede cambiar este nombre en
              cualquier momento desde su página de Cuenta.
            </li>
          </ul>
          <p className="mt-3">
            No utilizamos sus datos de Google para publicidad, marketing ni venta a
            terceros. No publicamos en Google en su nombre ni accedemos a ningún
            otro servicio de Google.
          </p>
        </CardContent>
      </Card>

      {/* How we store data */}
      <section>
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Shield className="h-5 w-5 text-primary" aria-hidden="true" />
          2. Cómo almacenamos y protegemos los datos
        </h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-6">
          <li>
            <strong>Base de datos:</strong> Supabase (PostgreSQL) alojada en Canadá
            (ca-central-1). Los datos están cifrados en reposo y en tránsito (TLS 1.2+).
          </li>
          <li>
            <strong>Autenticación:</strong> Supabase Auth gestiona el hash de contraseñas,
            el intercambio de tokens OAuth y los JWT de sesión. Nosotros nunca vemos ni
            almacenamos su contraseña de Google — Google lo autentica en sus propios
            servidores y nos envía únicamente el correo electrónico y el nombre mencionados
            arriba.
          </li>
          <li>
            <strong>Funciones en tiempo real:</strong> los llamados a jueces utilizan
            Supabase Realtime (WebSocket). El WebSocket transporta únicamente los datos del
            llamado a juez que usted envía — sin datos personales adicionales.
          </li>
          <li>
            <strong>Alojamiento:</strong> Vercel (Next.js). Vercel tiene acceso únicamente a
            los registros de solicitudes y a los datos de analítica; no tiene acceso a su
            base de datos.
          </li>
          <li>
            <strong>Seguridad a Nivel de Filas (RLS):</strong> todas las tablas de la base
            de datos tienen políticas de RLS que impiden que cualquier usuario lea o escriba
            los datos de otro usuario fuera de los eventos en los que participa.
          </li>
        </ul>
      </section>

      {/* How we use data */}
      <section>
        <h2 className="text-xl font-semibold">3. Cómo utilizamos sus datos</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-6">
          <li>Para crear y mantener su cuenta de TableTop Prime.</li>
          <li>
            Para identificarlo ante otros participantes en los eventos a los que se une
            (únicamente nombre para mostrar y correo del organizador — nunca su contraseña
            ni tokens de autenticación).
          </li>
          <li>Para generar emparejamientos, calcular clasificaciones y mostrar resultados en tiempo real.</li>
          <li>
            Para enviarle correos transaccionales: invitaciones a eventos, restablecimientos
            de contraseña y confirmaciones de eliminación de cuenta.
          </li>
          <li>
            Para producir estadísticas agregadas anonimizadas (p. ej., &ldquo;total de
            eventos ejecutados en la plataforma&rdquo;) para mejorar el producto. Estas
            estadísticas nunca incluyen información de identificación personal.
          </li>
          <li>
            Para exportar resultados de torneos como archivos CSV cuando un organizador los
            solicita.
          </li>
        </ul>
        <p className="mt-3 leading-relaxed">
          No vendemos sus datos personales a terceros ni los compartimos con
          corredores de datos. Sí utilizamos Google AdSense para mostrar anuncios en el
          sitio (consulte la sección 3a más abajo).
        </p>

        {/* Advertising */}
        <h3 className="mt-4 font-semibold">3a. Publicidad (Google AdSense)</h3>
        <p className="mt-2 leading-relaxed">
          TableTop Prime utiliza Google AdSense para mostrar anuncios. AdSense
          utiliza cookies (incluidas las cookies <code className="rounded bg-muted px-1.5 py-0.5 text-xs">__gads</code>,
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">IDE</code> y
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">NID</code>) e identificadores
          de dispositivo para mostrar anuncios basados en sus visitas previas a este y otros
          sitios web. El uso que Google hace de las cookies publicitarias le permite, a él y
          a sus socios, mostrarle anuncios basados en su visita a nuestro sitio y/o a otros
          sitios en internet.
        </p>
        {/* Required by Google: prominent link to "How Google uses data" */}
        <Card className="mt-3 border-primary/30 bg-primary/5">
          <CardContent className="p-3 text-sm leading-relaxed">
            <p>
              <strong>Cómo utiliza Google los datos cuando usted usa los sitios de nuestros socios:</strong>{' '}
              Conozca cómo Google y sus socios utilizan las cookies y los datos{' '}
              <a
                href="https://policies.google.com/technologies/partner-sites"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 font-medium"
              >
                en distintos sitios y aplicaciones
              </a>
              .
            </p>
          </CardContent>
        </Card>
        <ul className="mt-3 list-disc space-y-1.5 pl-6">
          <li>
            Puede excluirse de la publicidad personalizada visitando{' '}
            <a
              href="https://www.google.com/settings/ads"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            >
              la Configuración de anuncios de Google
            </a>
            .
          </li>
          <li>
            Puede excluirse del uso de cookies por parte de proveedores de terceros para
            publicidad personalizada visitando{' '}
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
            Las cookies de AdSense son <strong>no esenciales</strong> y solo se cargan
            después de que usted acepta &ldquo;todas las cookies&rdquo; en nuestro banner de
            consentimiento. Si elige &ldquo;solo esenciales&rdquo;, no se establecen
            cookies publicitarias.
          </li>
          <li>
            El uso que Google hace de las cookies publicitarias se rige por{' '}
            <a
              href="https://policies.google.com/technologies/ads"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            >
              la política de Cookies publicitarias de Google
            </a>
            .
          </li>
        </ul>
      </section>

      {/* Third-party processors */}
      <section>
        <h2 className="text-xl font-semibold">4. Procesadores de terceros</h2>
        <p className="mt-2 leading-relaxed">
          Dependemos de los siguientes servicios para operar TableTop Prime. Cada uno es un
          subprocesador con acceso a los datos enumerados:
        </p>
        <ul className="mt-3 list-disc space-y-1.5 pl-6">
          <li>
            <strong>Supabase Inc.</strong> — alojamiento de base de datos, autenticación,
            infraestructura WebSocket en tiempo real. Acceso: correo electrónico, hash de
            contraseña (si estableció una), nombre para mostrar y todos los datos de
            torneos. Regiones: Canadá (ca-central-1).
          </li>
          <li>
            <strong>Vercel Inc.</strong> — alojamiento web, CDN perimetral y analítica.
            Acceso: registros de solicitudes (IP, user agent, marcas de tiempo) y analítica
            anónima de vistas de página.
          </li>
          <li>
            <strong>Google LLC</strong> — proveedor de identidad OAuth Y publicidad
            (Google AdSense). Acceso para autenticación: únicamente el correo y el nombre de
            perfil que Google nos envía durante el inicio de sesión. Acceso para anuncios:
            Google AdSense establece cookies (<code className="rounded bg-muted px-1.5 py-0.5 text-xs">__gads</code>,
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">IDE</code>,
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">NID</code>) en su navegador
            para mostrar anuncios personalizados, pero solo después de que usted acepta &ldquo;todas
            las cookies&rdquo; en nuestro banner de consentimiento. El uso que Google hace de sus
            datos se rige por{' '}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            >
              la Política de Privacidad de Google
            </a>
            .
          </li>
        </ul>
      </section>

      {/* Data sharing */}
      <section>
        <h2 className="text-xl font-semibold">5. Cuándo compartimos sus datos</h2>
        <p className="mt-2 leading-relaxed">
          Compartimos sus datos únicamente en estas situaciones específicas:
        </p>
        <ul className="mt-3 list-disc space-y-1.5 pl-6">
          <li>
            <strong>Dentro de los eventos a los que se une:</strong> su nombre para mostrar
            es visible para otros participantes del mismo evento (organizadores, jueces,
            jugadores). Su correo electrónico es visible únicamente para el organizador del
            evento.
          </li>
          <li>
            <strong>Páginas públicas de compartir:</strong> cuando un organizador publica un
            evento, una página pública en <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/share/&lt;eventCode&gt;</code> muestra
            nombres de jugadores, colores y puntajes. <strong>Nunca se muestran correos
            electrónicos ni identificadores de usuario</strong> en las páginas públicas.
          </li>
          <li>
            <strong>Cumplimiento legal:</strong> si lo exige la ley, una orden judicial o
            para proteger los derechos, la propiedad o la seguridad de TableTop Prime,
            nuestros usuarios o el público.
          </li>
          <li>
            <strong>Transferencia empresarial:</strong> en caso de fusión, adquisición o
            venta de activos, los datos de los usuarios pueden ser transferidos. Le
            notificaremos por correo electrónico antes de cualquier transferencia de este
            tipo.
          </li>
        </ul>
      </section>

      {/* Data retention */}
      <section>
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Cookie className="h-5 w-5 text-primary" aria-hidden="true" />
          6. Retención de datos
        </h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-6">
          <li>
            <strong>Cuentas activas:</strong> sus datos se conservan mientras su cuenta esté
            activa.
          </li>
          <li>
            <strong>Solicitudes de eliminación de cuenta:</strong> cuando usted solicita la
            eliminación desde su página de Cuenta, su correo electrónico se anonimiza, su
            contraseña se borra, su entrada en auth.users se bloquea y sus filas
            EventParticipant se eliminan dentro de los 30 días. Los resultados históricos
            del torneo (nombres de jugadores, puntajes, emparejamientos) se conservan por
            integridad de archivo — a las filas Player se les anula el{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">userId</code> para que
            ya no estén vinculadas a su cuenta.
          </li>
          <li>
            <strong>Datos de eventos:</strong> los emparejamientos, puntajes y posiciones se
            conservan indefinidamente como registros de archivo de torneos pasados, incluso
            después de que el organizador se retire o el evento sea eliminado.
          </li>
          <li>
            <strong>Registros del servidor:</strong> Vercel y Supabase conservan los
            registros de solicitudes según sus propias políticas (típicamente 30–90 días).
          </li>
        </ul>
      </section>

      {/* Your rights */}
      <section>
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Trash2 className="h-5 w-5 text-primary" aria-hidden="true" />
          7. Sus derechos (GDPR / CCPA / LGPD)
        </h2>
        <p className="mt-2 leading-relaxed">
          Según su jurisdicción, usted puede tener los siguientes derechos sobre sus datos
          personales:
        </p>
        <ul className="mt-3 list-disc space-y-1.5 pl-6">
          <li><strong>Acceso</strong> — solicitar una copia de los datos que tenemos sobre usted.</li>
          <li><strong>Rectificación</strong> — corregir datos inexactos o incompletos.</li>
          <li>
            <strong>Supresión</strong> — solicitar la eliminación de su cuenta y datos
            personales (el &ldquo;Derecho al Olvido&rdquo;, GDPR Artículo 17).
          </li>
          <li>
            <strong>Limitación</strong> — pedirnos que limitemos cómo usamos sus datos
            mientras se resuelve una reclamación.
          </li>
          <li>
            <strong>Portabilidad</strong> — recibir sus datos en un formato legible por
            máquina.
          </li>
          <li>
            <strong>Oposición</strong> — oponerse al tratamiento basado en intereses
            legítimos.
          </li>
        </ul>
        <p className="mt-3 leading-relaxed">
          Para ejercer cualquiera de estos derechos,{' '}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-primary underline underline-offset-2"
          >
            escríbanos por correo electrónico
          </a>{' '}
          o visite su página de Cuenta y haga clic en &ldquo;Solicitar eliminación&rdquo;.
          Respondemos a todas las solicitudes verificables dentro de los 30 días.
        </p>
      </section>

      {/* Cookies */}
      <section>
        <h2 className="text-xl font-semibold">8. Cookies</h2>
        <p className="mt-2 leading-relaxed">
          Utilizamos una combinación de cookies esenciales, de analítica y publicitarias.
          La tabla a continuación resume cada cookie; nuestra{' '}
          <a href="/cookies" className="text-primary underline underline-offset-2">
            Política de Cookies
          </a>{' '}
          completa tiene la lista completa con duraciones y propósitos.
        </p>
        <ul className="mt-3 list-disc space-y-1.5 pl-6">
          <li>
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">sb-&lt;project-ref&gt;-auth-token</code> —
            JWT de sesión de Supabase. Necesario para la autenticación. HttpOnly, Secure,
            SameSite=Lax. <strong>Esencial.</strong>
          </li>
          <li>
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">theme</code> — almacena
            su preferencia claro/oscuro/sistema. <strong>Esencial.</strong>
          </li>
          <li>
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">tabletop-prime-ui</code> —
            almacena el estado de la interfaz (idioma, evento activo).{' '}
            <strong>Esencial.</strong>
          </li>
          <li>
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">_vercel_jwt</code> —
            cookie de Vercel Analytics para vistas de página anónimas.{' '}
            <strong>Analítica.</strong> Se carga únicamente después de que usted acepta
            &ldquo;todas las cookies&rdquo;.
          </li>
          <li>
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">__gads</code>,{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">IDE</code>,{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">NID</code> — cookies de
            Google AdSense para personalización, entrega y medición de anuncios.{' '}
            <strong>Publicidad.</strong> Se cargan únicamente después de que usted acepta
            &ldquo;todas las cookies&rdquo;. Consulte la sección 3a más arriba para los
            enlaces de exclusión.
          </li>
        </ul>
        <p className="mt-3 leading-relaxed">
          Puede controlar qué cookies se establecen utilizando nuestro{' '}
          <a href="/cookies" className="text-primary underline underline-offset-2">
            gestor de consentimiento
          </a>
          . Elija &ldquo;solo esenciales&rdquo; para bloquear todas las cookies de
          analítica y publicitarias.
        </p>
      </section>

      {/* Children */}
      <section>
        <h2 className="text-xl font-semibold">9. Privacidad de los menores</h2>
        <p className="mt-2 leading-relaxed">
          TableTop Prime no está dirigido a menores de 13 años (o la edad mínima equivalente
          en su jurisdicción). No recopilamos conscientemente datos personales de menores. Si
          usted cree que un menor nos ha proporcionado datos personales, por favor{' '}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-primary underline underline-offset-2"
          >
            contáctenos
          </a>{' '}
          y los eliminaremos de inmediato.
        </p>
      </section>

      {/* Changes */}
      <section>
        <h2 className="text-xl font-semibold">10. Cambios a esta política</h2>
        <p className="mt-2 leading-relaxed">
          Podemos actualizar esta Política de Privacidad de vez en cuando. Cuando lo
          hagamos, revisaremos la fecha de &ldquo;Última actualización&rdquo; en la parte
          superior de esta página. Para cambios materiales que afecten la forma en que usamos
          sus datos, le notificaremos por correo electrónico y requeriremos un nuevo
          consentimiento antes de aplicar los cambios.
        </p>
      </section>

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
            Para cualquier consulta de privacidad, solicitud de datos o para informar sobre
            una preocupación de privacidad, contacte a nuestro Oficial de Protección de Datos
            en:
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
            Si usted no está conforme con nuestra respuesta, tiene derecho a presentar una
            reclamación ante la autoridad local de protección de datos. En la UE, se trata
            de su Autoridad Nacional de Protección de Datos; en Argentina, la AAIP; en
            California, el Fiscal General.
          </p>
        </CardContent>
      </Card>
    </>
  )
}
