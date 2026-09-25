/**
 * Contenido de la página de persona del jugador — Español.
 *
 * Palabra clave objetivo: "app de acompañante para torneos de juegos de mesa"
 * Esta es una página SEO renderizada en el servidor. Sin interactividad del lado
 * del cliente — los CTA son enlaces <a> simples a /#auth que la página de
 * inicio maneja.
 */
import { QrCode, Users, ClipboardCheck, Gavel, BarChart3, Repeat } from 'lucide-react'
import { ArrowRight } from 'lucide-react'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const FEATURES = [
  {
    icon: QrCode,
    title: 'Check-in con código QR',
    desc: 'Sin app para instalar. Escanee un código QR en el evento o abra un enlace para compartir en su teléfono, ingrese su nombre y quedará registrado. El organizador verá su nombre aparecer en la lista de jugadores al instante.',
  },
  {
    icon: Users,
    title: 'Vea su mesa y a sus rivales',
    desc: 'En cuanto el organizador genere los emparejamientos, la asignación de mesa aparecerá en su teléfono. Verá su número de mesa, contra quién juega y — si el organizador activó la rotación de asientos — en qué asiento se encuentra.',
  },
  {
    icon: ClipboardCheck,
    title: 'Envíe y confirme los puntajes',
    desc: 'Cuando termine su partida, un jugador envía el puntaje y otro lo confirma. Ambos jugadores ven las ubicaciones, los puntos de juego y el total antes de que se bloquee — se acabaron las disputas de "yo creía que había quedado segundo".',
  },
  {
    icon: Gavel,
    title: 'Llame a un juez',
    desc: '¿Consulta de reglas? ¿Disputa de puntaje? Toque "Llamar juez" con su número de mesa y la categoría del problema. Un juez confirma su llamado al instante — verá que la ayuda va en camino sin abandonar su asiento.',
  },
  {
    icon: BarChart3,
    title: 'Clasificaciones en vivo',
    desc: 'Vea cómo se actualizan las clasificaciones en tiempo real a medida que otras mesas terminan y confirman sus puntajes. Vea su posición, sus puntos totales y cómo se compara — sin tener que caminar hasta el tablero de resultados.',
  },
  {
    icon: Repeat,
    title: 'Rotación de asientos',
    desc: 'Para juegos con ventaja del primer jugador (Catan, Carcassonne), el organizador puede rotar los asientos en cada ronda. Verá su número de asiento cambiar automáticamente — a lo largo de N rondas, pasará por cada asiento exactamente una vez.',
  },
]

export function PlayerContentEs() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden py-16 sm:py-24">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        </div>
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <span className="inline-block rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            Sin app que instalar — funciona en el navegador de su teléfono
          </span>
          <h1 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            App de acompañante para torneos de juegos de mesa
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
            Haga check-in con un código QR, vea su asignación de mesa, envíe y confirme los
            puntajes, llame a un juez y siga las clasificaciones en vivo — todo desde su
            teléfono. Sin app para descargar, sin cuenta que crear, sin configuración
            necesaria.
          </p>
          <div className="mt-8">
            <a
              href="/#auth"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Encontrar un torneo
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      {/* Stats row */}
      <section className="mx-auto max-w-3xl px-4 sm:px-6">
        <dl className="grid grid-cols-3 gap-4 text-center">
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">Check-in</dt>
            <dd className="mt-1 text-2xl font-semibold">Código QR</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">Configuración</dt>
            <dd className="mt-1 text-2xl font-semibold">Cero</dd>
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
            Todo lo que necesita en la mesa
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-pretty text-sm text-muted-foreground sm:text-base">
            Desde el check-in hasta las clasificaciones finales — su experiencia de torneo,
            directamente en su bolsillo.
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
              <strong className="text-foreground">1. Obtenga el enlace.</strong> Su organizador
              comparte un código QR o un enlace antes del evento. Escanéelo o tóquelo — la vista
              de acompañante se abre en el navegador de su teléfono. Sin descarga, sin cuenta.
            </li>
            <li>
              <strong className="text-foreground">2. Haga check-in.</strong> Ingrese su nombre
              (o confírmelo si el organizador lo preinscribió). Queda registrado — el
              organizador lo ve en la lista de jugadores.
            </li>
            <li>
              <strong className="text-foreground">3. Vea su mesa.</strong> Cuando se generan los
              emparejamientos, su número de mesa, sus rivales y su asiento (si está activado)
              aparecen en su pantalla. Camine a su mesa y empiece a jugar.
            </li>
            <li>
              <strong className="text-foreground">4. Envíe el puntaje.</strong> Cuando la partida
              termina, un jugador ingresa las ubicaciones y los puntos de juego. Un segundo
              jugador confirma. Ambos ven el desglose completo antes de que se bloquee.
            </li>
            <li>
              <strong className="text-foreground">5. Siga las clasificaciones.</strong> A medida
              que otras mesas terminan, las clasificaciones se actualizan en vivo en su teléfono.
              Vea su posición, sus puntos y cómo se están perfilando los emparejamientos de la
              próxima ronda — sin abandonar su asiento.
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
            ¿Listo para jugar?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-pretty text-sm text-muted-foreground sm:text-base">
            Haga check-in, vea su mesa, envíe los puntajes y siga las clasificaciones en vivo —
            todo desde su teléfono. Sin app que instalar, sin cuenta, sin costo.
          </p>
          <div className="mt-6 flex justify-center">
            <a
              href="/#auth"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Encontrar un torneo
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Gratis · sin instalación de app · funciona en cualquier navegador móvil
          </p>
        </div>
      </section>
    </>
  )
}
