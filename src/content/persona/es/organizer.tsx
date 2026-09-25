/**
 * Contenido de la página de persona del organizador — Español.
 *
 * Palabra clave objetivo: "software para organizar torneos de juegos de mesa"
 * Esta es una página SEO renderizada en el servidor. Sin interactividad del lado
 * del cliente — los CTA son enlaces <a> simples a /#auth que la página de
 * inicio maneja.
 */
import { Dices, ShieldCheck, SlidersHorizontal, Gavel, FileSpreadsheet, Repeat } from 'lucide-react'
import { ArrowRight } from 'lucide-react'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const FEATURES = [
  {
    icon: Dices,
    title: 'Motor de emparejamiento multijugador',
    desc: 'Genere emparejamientos para 2 a 6 jugadores por mesa. Elija Round Robin (maximiza rivales nuevos), Swiss (se enfrentan los de récord similar), Single Elimination (llave de eliminación) o Adjacent Swiss (estilo llave, finales TFT / Commander). Las revanchas se minimizan automáticamente con un algoritmo de búsqueda de mínimos conflictos.',
  },
  {
    icon: ShieldCheck,
    title: 'Verificación de puntaje dual',
    desc: 'Cada puntaje de mesa lo envía un jugador y lo confirma otro. Los errores de tipeo, los clics equivocados y las cargas de mala fe se detectan en el origen: se acabaron las discusiones sobre quién ganó o cuántos puntos de juego hubo.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Reglas de puntaje personalizadas',
    desc: 'Configure puntos de ubicación (1.º, 2.º, 3.º, …), acumule bonos por asistencia, multiplicadores por ronda y modificadores de liga. Cinco métodos de desempate (puntos de juego, primeros lugares, mejor ubicación, fortaleza de mesa, descartar peor ronda) garantizan clasificaciones justas incluso cuando los puntos están empatados.',
  },
  {
    icon: Gavel,
    title: 'Aviso de jueces',
    desc: 'Los jugadores tocan "Llamar juez" desde su teléfono con su número de mesa y la categoría del problema. Los jueces ven una cola en vivo, optimizada para móviles, con aviso y resolución con un toque. Se acabaron los gritos de un lado a otro del salón.',
  },
  {
    icon: FileSpreadsheet,
    title: 'Exportación CSV y plantillas',
    desc: 'Exporte las clasificaciones y el historial completo de partidas (cada mesa, cada ronda, cada ubicación) como CSV en cualquier momento. Guarde plantillas de eventos para ligas semanales recurrentes: póngalas en marcha en segundos, no en minutos.',
  },
  {
    icon: Repeat,
    title: 'Rotación de asientos',
    desc: 'Rote la posición del primer jugador en cada ronda para juegos con ventaja de asiento (Catan, Carcassonne, Ticket to Ride). Elija rotación horaria o equilibrada por ronda: cada jugador pasa por cada asiento exactamente una vez a lo largo de N rondas.',
  },
]

export function OrganizerContentEs() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden py-16 sm:py-24">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        </div>
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <span className="inline-block rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            Gratis para clubes y convenciones
          </span>
          <h1 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Software para organizar torneos de juegos de mesa
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
            Organice torneos de juegos de mesa desde su teléfono. Genere emparejamientos
            multijugador (Swiss, Round Robin, Adjacent Swiss, Single Elimination), configure
            reglas de puntaje personalizadas con desempates, avise a los jueces en tiempo real y
            exporte los resultados como CSV — todo en una sola plataforma centrada en el móvil,
            pensada para asociaciones locales y convenciones.
          </p>
          <div className="mt-8">
            <a
              href="/#auth"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Empezar a organizar
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      {/* Stats row */}
      <section className="mx-auto max-w-3xl px-4 sm:px-6">
        <dl className="grid grid-cols-3 gap-4 text-center">
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">Jugadores</dt>
            <dd className="mt-1 text-2xl font-semibold">2–200+</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">Configuración en</dt>
            <dd className="mt-1 text-2xl font-semibold">2 min</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">Precio</dt>
            <dd className="mt-1 text-2xl font-semibold">Gratis</dd>
          </div>
        </dl>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6" aria-labelledby="features-title">
        <div className="mb-10 text-center">
          <h2 id="features-title" className="text-3xl font-bold tracking-tight sm:text-4xl">
            Todo lo que necesita para organizar un torneo
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-pretty text-sm text-muted-foreground sm:text-base">
            Desde el primer check-in hasta la exportación final en CSV — TableTop Prime se
            encarga del caos operativo para que usted pueda concentrarse en el juego.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => {
            const Icon = f.icon
            return (
              <Card key={i} className="h-full">
                <CardHeader>
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <CardTitle className="text-lg">{f.title}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    {f.desc}
                  </CardDescription>
                </CardHeader>
              </Card>
            )
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-3xl px-4 sm:px-6" aria-labelledby="how-title">
        <div className="rounded-lg border border-border/60 bg-card p-6 sm:p-8">
          <h2 id="how-title" className="mb-4 text-2xl font-bold tracking-tight">
            Cómo funciona
          </h2>
          <ol className="space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
            <li>
              <strong className="text-foreground">1. Cree el evento.</strong> Defina el nombre
              del juego (con búsqueda en BGG), el tamaño de la mesa (2 a 6 jugadores), la cantidad
              total de rondas y las reglas de puntaje (puntos de ubicación + modificadores +
              desempates).
            </li>
            <li>
              <strong className="text-foreground">2. Agregue jugadores.</strong> Los jugadores
              hacen check-in desde su teléfono mediante un código QR o un enlace para
              compartir — sin instalar nada, sin necesidad de cuenta para los jugadores.
            </li>
            <li>
              <strong className="text-foreground">3. Genere los emparejamientos.</strong> Elija
              un formato por ronda (Round Robin, Swiss, Single Elimination o Adjacent Swiss). El
              motor minimiza las revanchas automáticamente y muestra diagnósticos de
              factibilidad.
            </li>
            <li>
              <strong className="text-foreground">4. Cargue el puntaje y confirme.</strong> Un
              jugador envía el puntaje de la mesa, un segundo lo confirma. Las clasificaciones
              se actualizan en vivo en la página pública para compartir, para que padres y
              amigos puedan seguirlas desde su casa.
            </li>
            <li>
              <strong className="text-foreground">5. Exporte y guarde.</strong> Descargue los
              resultados completos como CSV. Guarde el evento como plantilla para la noche de
              liga de la próxima semana.
            </li>
          </ol>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card p-8 text-center sm:p-12">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
          </div>
          <h2 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl">
            ¿Listo para organizar su próximo torneo?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-pretty text-sm text-muted-foreground sm:text-base">
            Emparejamientos, puntaje, aviso de jueces y clasificaciones en vivo — todo desde su
            teléfono.
          </p>
          <div className="mt-6 flex justify-center">
            <a
              href="/#auth"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Cree su primer evento
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Gratis · sin tarjeta de crédito · 2 minutos para configurar
          </p>
        </div>
      </section>
    </>
  )
}
