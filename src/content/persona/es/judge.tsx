/**
 * Contenido de la página de persona del juez — Español.
 *
 * Palabra clave objetivo: "sistema de aviso de jueces para torneos"
 * Esta es una página SEO renderizada en el servidor. Sin interactividad del lado
 * del cliente — los CTA son enlaces <a> simples a /#auth que la página de
 * inicio maneja.
 */
import { ListChecks, Smartphone, ClipboardCheck, BarChart3, Layers, CheckCheck } from 'lucide-react'
import { ArrowRight } from 'lucide-react'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const FEATURES = [
  {
    icon: ListChecks,
    title: 'Cola de llamados en vivo',
    desc: 'Los jugadores tocan "Llamar juez" con su número de mesa y la categoría del problema. Los jueces ven una cola en vivo, optimizada para móviles, ordenada por hora. El aviso con un toque evita respuestas duplicadas.',
  },
  {
    icon: Smartphone,
    title: 'Optimizado para móviles',
    desc: 'La cola de jueces funciona en cualquier navegador móvil — sin instalar nada. Los jueces ven el número de mesa, la categoría del problema (disputa de puntaje, consulta de reglas, otro) y quién hizo el llamado.',
  },
  {
    icon: ClipboardCheck,
    title: 'Resolución de disputas de puntaje',
    desc: 'Los jueces pueden editar puntajes disputados directamente desde su teléfono. Los cambios se registran con una nota que explica el ajuste. El sistema de puntaje dual garantiza la transparencia.',
  },
  {
    icon: BarChart3,
    title: 'Clasificaciones en tiempo real',
    desc: 'A medida que los puntajes se bloquean y confirman, las clasificaciones se actualizan al instante en la página pública para compartir. Padres y amigos pueden seguirlas desde su casa.',
  },
  {
    icon: Layers,
    title: 'Soporte para múltiples eventos',
    desc: 'Los jueces pueden ser asignados a múltiples eventos. Cambie entre eventos con un toque. La cola de llamados de cada evento es independiente.',
  },
  {
    icon: CheckCheck,
    title: 'Avisar y resolver',
    desc: 'Flujo de dos pasos: avisar (le indica al jugador que la ayuda va en camino) → resolver (marca el llamado como atendido con una nota opcional). Se acabó la confusión de "¿alguien viene?".',
  },
]

export function JudgeContentEs() {
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
            Sistema de aviso de jueces para torneos
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
            Atienda los llamados de los jugadores desde su teléfono. Vea una cola en vivo
            optimizada para móviles, resuelva disputas de puntaje en el acto y mantenga las
            clasificaciones actualizadas en tiempo real — todo desde el navegador, sin instalar
            nada, pensado para jueces de clubes y convenciones.
          </p>
          <div className="mt-8">
            <a
              href="/#auth"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Empezar a arbitrar
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      {/* Stats row */}
      <section className="mx-auto max-w-3xl px-4 sm:px-6">
        <dl className="grid grid-cols-3 gap-4 text-center">
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">Llamados</dt>
            <dd className="mt-1 text-2xl font-semibold">Ilimitados</dd>
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
            Todo lo que necesita para arbitrar un torneo
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-pretty text-sm text-muted-foreground sm:text-base">
            Desde el primer llamado hasta el puntaje confirmado — TableTop Prime mantiene a los
            jueces sincronizados para que los jugadores vuelvan a la mesa lo antes posible.
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
              <strong className="text-foreground">1. Abra la cola.</strong> Acceda a la cola
              de llamados desde cualquier navegador móvil con el enlace del evento. Sin app, sin
              configuración.
            </li>
            <li>
              <strong className="text-foreground">2. Avise los llamados.</strong> Toque
              "Avisar" para indicar al jugador que la ayuda va en camino. Los demás jueces ven
              el llamado como atendido, sin respuestas duplicadas.
            </li>
            <li>
              <strong className="text-foreground">3. Resuelva en el acto.</strong> Edite
              puntajes disputados directamente desde su teléfono. Cada cambio queda registrado
              con una nota que explica el ajuste.
            </li>
            <li>
              <strong className="text-foreground">4. Clasificaciones en vivo.</strong> A medida
              que se bloquean y confirman los puntajes, las clasificaciones se actualizan al
              instante en la página pública para compartir.
            </li>
            <li>
              <strong className="text-foreground">5. Cambie de evento.</strong> Si está
              asignado a varios eventos, cambie con un toque. La cola de llamados de cada
              evento es independiente.
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
            ¿Listo para que las mesas no se detengan?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-pretty text-sm text-muted-foreground sm:text-base">
            Cola en vivo, edición de puntajes en el acto y clasificaciones en tiempo real —
            todo desde su teléfono.
          </p>
          <div className="mt-6 flex justify-center">
            <a
              href="/#auth"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Empiece a arbitrar
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
