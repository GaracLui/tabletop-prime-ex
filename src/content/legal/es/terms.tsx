/**
 * Contenido de los Términos de Servicio — Español.
 *
 * Este es el contenido del cuerpo (secciones) para /terms. La estructura
 * de la página (encabezado, título, selector de idioma, pie) es manejada por <LegalPage>.
 *
 * Importado por: src/app/terms/page.tsx
 */
import { AlertTriangle, Scale, Mail } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const CONTACT_EMAIL = 'legal@tabletopprime.com'

export function TermsContentEs() {
  return (
    <>
      {/* Intro */}
      <section>
        <p className="leading-relaxed">
          Bienvenido a TableTop Prime. Al crear una cuenta, iniciar sesión con Google o
          con un correo/contraseña, o utilizar cualquier función de la aplicación, usted
          acepta quedar vinculado por estos Términos de Servicio. Si no está de acuerdo,
          no cree una cuenta ni utilice la aplicación.
        </p>
      </section>

      {/* About */}
      <section>
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Scale className="h-5 w-5 text-primary" aria-hidden="true" />
          1. Sobre TableTop Prime
        </h2>
        <p className="mt-2 leading-relaxed">
          TableTop Prime es una plataforma SaaS para organizar y ejecutar torneos, ligas y
          convenciones de juegos de mesa. Brinda generación de emparejamientos (Social
          Golfer / Suizo / Round Robin), verificación de puntaje dual, despacho de jueces
          en tiempo real, reglas de puntaje personalizadas, exportación a CSV y páginas
          públicas de compartir para resultados. El servicio se opera desde{' '}
          <strong>tabletopprime.com</strong>.
        </p>
      </section>

      {/* Eligibility */}
      <section>
        <h2 className="text-xl font-semibold">2. Elegibilidad</h2>
        <p className="mt-2 leading-relaxed">
          Debe tener al menos 13 años (o la edad mínima de consentimiento digital en su
          jurisdicción) para crear una cuenta. Al utilizar el servicio, usted declara que
          cumple con este requisito y que está legalmente facultado para celebrar un
          acuerdo vinculante.
        </p>
      </section>

      {/* Accounts */}
      <section>
        <h2 className="text-xl font-semibold">3. Cuentas</h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-6">
          <li>
            Puede iniciar sesión con Google OAuth o con un correo electrónico y
            contraseña. Ambos métodos crean el mismo tipo de cuenta.
          </li>
          <li>
            Usted es responsable de mantener la confidencialidad de las credenciales de su
            cuenta y de toda la actividad que ocurra bajo su cuenta.
          </li>
          <li>
            Usted acepta proporcionar información precisa (una dirección de correo real
            y un nombre para mostrar reconocible) para que otros participantes en sus
            eventos puedan identificarlo.
          </li>
          <li>
            Puede eliminar su cuenta en cualquier momento desde la página de Cuenta. La
            eliminación anonimiza sus datos personales dentro de los 30 días, según
            nuestra{' '}
            <a href="/privacy" className="text-primary underline underline-offset-2">
              Política de Privacidad
            </a>
            .
          </li>
        </ul>
      </section>

      {/* Organizer responsibilities */}
      <section>
        <h2 className="text-xl font-semibold">4. Responsabilidades del organizador</h2>
        <p className="mt-2 leading-relaxed">
          Si usted crea un evento, se convierte en su organizador. Como organizador, usted
          acepta:
        </p>
        <ul className="mt-2 list-disc space-y-1.5 pl-6">
          <li>
            Ejecutar eventos de acuerdo con las reglas de su asociación, convención o
            sede.
          </li>
          <li>
            Agregar únicamente participantes reales (o nombres sustitutos a los que hayan
            consentido) y eliminar a los jugadores que pidan ser eliminados.
          </li>
          <li>
            Usar el sistema de verificación de puntaje dual de manera honesta — no
            presionar a los jugadores para que confirmen puntajes que no verificaron.
          </li>
          <li>
            No publicar la página pública de compartir del evento (en{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/share/&lt;eventCode&gt;</code>)
            si algún participante se ha opuesto a que su nombre sea visible públicamente.
          </li>
          <li>
            Ser el punto de contacto para los participantes en su evento. TableTop Prime
            no media en disputas entre organizador y jugadores.
          </li>
        </ul>
      </section>

      {/* Player responsibilities */}
      <section>
        <h2 className="text-xl font-semibold">5. Responsabilidades del jugador</h2>
        <p className="mt-2 leading-relaxed">
          Como jugador o juez en un evento, usted acepta:
        </p>
        <ul className="mt-2 list-disc space-y-1.5 pl-6">
          <li>
            Enviar puntajes veraces. El sistema de puntaje dual existe precisamente para
            evitar errores tipográficos y entradas de mala fe — enviar deliberadamente
            puntajes falsos constituye una violación de estos Términos.
          </li>
          <li>
            Usar la función &ldquo;Llamar al juez&rdquo; únicamente para consultas
            genuinas sobre reglas, disputas de puntaje o problemas de mesa. Hacer un uso
            abusivo de los llamados al juez puede derivar en la suspensión de la cuenta.
          </li>
          <li>
            Tratar a otros participantes con respeto. TableTop Prime es una herramienta
            para ejecutar torneos amistosos, no un ámbito para el acoso.
          </li>
        </ul>
      </section>

      {/* Prohibited conduct */}
      <section>
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <AlertTriangle className="h-5 w-5 text-primary" aria-hidden="true" />
          6. Conducta prohibida
        </h2>
        <p className="mt-2 leading-relaxed">Usted acepta no:</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-6">
          <li>Usar el servicio para acosar, amenazar o suplantar a otra persona.</li>
          <li>Enviar puntajes, emparejamientos o llamados al juez que usted sepa que son falsos.</li>
          <li>Intentar acceder a la cuenta de otro usuario, datos de eventos o tokens de autenticación.</li>
          <li>
            Hacer scraping, crawling o de otro modo descargas masivas de datos de las
            páginas públicas de compartir con fines distintos al seguimiento personal de
            un evento.
          </li>
          <li>
            Usar el servicio para ejecutar juegos de azar, apuestas con dinero real o
            cualquier actividad prohibida por la legislación local aplicable.
          </li>
          <li>
            Realizar ingeniería inversa, descompilar o intentar extraer el código fuente
            de la aplicación.
          </li>
          <li>Usar el servicio para transmitir malware o intentos de explotación.</li>
        </ul>
        <p className="mt-3 leading-relaxed">
          Las violaciones pueden derivar en la suspensión inmediata de la cuenta y, cuando
          corresponda, en su denuncia a las autoridades.
        </p>
      </section>

      {/* Advertising */}
      <section>
        <h2 className="text-xl font-semibold">6a. Publicidad</h2>
        <p className="mt-2 leading-relaxed">
          TableTop Prime muestra anuncios servidos por Google AdSense. Estos anuncios son
          contenido de terceros proporcionado por Google y se rigen por los términos de
          servicio de Google. TableTop Prime no controla qué anuncios específicos se
          muestran y no es responsable del contenido de los anuncios.
        </p>
        <ul className="mt-2 list-disc space-y-1.5 pl-6">
          <li>
            Las cookies publicitarias se cargan únicamente después de que usted acepta
            &ldquo;todas las cookies&rdquo; en nuestro banner de consentimiento. Puede
            elegir &ldquo;solo esenciales&rdquo; para usar el sitio sin anuncios ni
            cookies publicitarias.
          </li>
          <li>
            Puede excluirse de la publicidad personalizada en{' '}
            <a
              href="https://www.google.com/settings/ads"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            >
              la Configuración de anuncios de Google
            </a>{' '}
            o{' '}
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
            Hacer clic en un anuncio puede llevarlo a un sitio web de terceros. TableTop
            Prime no es responsable del contenido ni de las prácticas de los sitios web de
            terceros.
          </li>
          <li>
            Los organizadores que ejecuten eventos en el plan gratuito verán anuncios en el
            panel y en las páginas de compartir. Los futuros planes de pago podrían
            eliminar anuncios para los suscriptores.
          </li>
        </ul>
      </section>

      {/* Prime tiers and pricing */}
      <section>
        <h2 className="text-xl font-semibold">7. Planes Prime y precios</h2>
        <p className="mt-2 leading-relaxed">
          TableTop Prime ofrece cuatro planes: Gratuito, Nivel 1, Nivel 2 y Nivel 3,
          diferenciados por la cantidad máxima de jugadores por evento. Los límites de
          cada nivel se muestran actualmente a modo de referencia pero no se aplican — los
          planes de pago aún no están disponibles. Cuando se lancen los planes de pago, esta
          sección se actualizará con los términos de facturación, la política de
          reembolsos y los términos de renovación automática.
        </p>
      </section>

      {/* Intellectual property */}
      <section>
        <h2 className="text-xl font-semibold">8. Propiedad intelectual</h2>
        <p className="mt-2 leading-relaxed">
          El software, el diseño, la marca y la documentación de TableTop Prime son
          propiedad intelectual de los mantenedores del proyecto. Los datos de los torneos
          (eventos, emparejamientos, puntajes) que usted crea siguen siendo suyos — puede
          exportarlos como CSV en cualquier momento. Al utilizar el servicio, usted otorga
          a TableTop Prime una licencia no exclusiva para mostrar sus datos de torneos
          dentro de la aplicación y en las páginas públicas de compartir que usted publique.
        </p>
      </section>

      {/* Service availability */}
      <section>
        <h2 className="text-xl font-semibold">9. Disponibilidad del servicio</h2>
        <p className="mt-2 leading-relaxed">
          TableTop Prime se proporciona &ldquo;tal como está disponible&rdquo;. No
          garantizamos un acceso ininterrumpido. Las ventanas de mantenimiento, las
          interrupciones de infraestructura y las fallas de terceros (Supabase, Vercel,
          Google OAuth) pueden causar tiempos de inactividad. No somos responsables de
          ninguna pérdida derivada de la indisponibilidad del servicio, incluida la
          pérdida de datos de torneos — aunque realizamos copias de respaldo
          automatizadas con regularidad y diseñamos el esquema de modo que los puntajes
          históricos se conserven.
        </p>
      </section>

      {/* Limitation of liability */}
      <section>
        <h2 className="text-xl font-semibold">10. Limitación de responsabilidad</h2>
        <p className="mt-2 leading-relaxed">
          En la máxima medida permitida por la ley, TableTop Prime y sus mantenedores no
          serán responsables de ningún daño indirecto, incidental, especial, consecuente o
          punitivo, incluida la pérdida de ganancias, datos o fondo de comercio, que surja
          de o en relación con su uso del servicio. Nuestra responsabilidad total por
          cualquier reclamación derivada de estos Términos no excederá el monto que usted
          nos haya pagado en los doce meses previos a la reclamación (actualmente cero,
          dado que los planes de pago aún no están disponibles).
        </p>
      </section>

      {/* Termination */}
      <section>
        <h2 className="text-xl font-semibold">11. Resolución</h2>
        <p className="mt-2 leading-relaxed">
          Puede resolver su cuenta en cualquier momento desde la página de Cuenta. Podemos
          suspender o resolver su cuenta si usted infringe estos Términos, si lo exige la
          ley o si descontinuamos el servicio. Al resolverse, sus datos personales se
          tratan según nuestra{' '}
          <a href="/privacy" className="text-primary underline underline-offset-2">
            Política de Privacidad
          </a>
          .
        </p>
      </section>

      {/* Changes to these Terms */}
      <section>
        <h2 className="text-xl font-semibold">12. Cambios a estos Términos</h2>
        <p className="mt-2 leading-relaxed">
          Podemos actualizar estos Términos de vez en cuando. Cuando lo hagamos, revisaremos
          la fecha de &ldquo;Última actualización&rdquo; en la parte superior de esta
          página. Para cambios materiales, le notificaremos por correo electrónico y
          requeriremos un nuevo acuerdo antes de que los cambios entren en vigencia.
        </p>
      </section>

      {/* Governing law */}
      <section>
        <h2 className="text-xl font-semibold">13. Ley aplicable</h2>
        <p className="mt-2 leading-relaxed">
          Estos Términos se rigen por las leyes de Argentina, sin tener en cuenta los
          principios de conflicto de leyes. Toda disputa derivada de estos Términos se
          resolverá en los tribunales de Buenos Aires, Argentina — salvo que usted pueda
          presentar una reclamación en su tribunal local de reclamos de menor cuantía si
          tiene jurisdicción.
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
          <p>Para cualquier consulta legal o notificación, contáctenos en:</p>
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
