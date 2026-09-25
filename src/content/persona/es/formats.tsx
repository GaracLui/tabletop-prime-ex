/**
 * Formats explainer page content — Spanish (es-AR, formal "usted" register).
 *
 * Target keyword: "Swiss vs Round Robin tournament format"
 * Server-rendered SEO landing page. CTAs are <a> links to /#auth.
 */
import { Dices, Trophy, Layers, Crown, Check, X, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const FORMATS = [
  {
    icon: Dices,
    name: 'Round Robin',
    what: 'Un formato social que maximiza nuevos oponentes. El motor utiliza un algoritmo de Social Golfer para mezclar las mesas en cada ronda, garantizando que dos jugadores no compartan mesa dos veces siempre que sea matemáticamente posible.',
    how: 'Los jugadores se reorganizan en cada ronda y se asignan a las mesas de forma aleatoria (con evitación de revanchas). Las posiciones se ignoran: todos siguen jugando sin importar los resultados. El algoritmo de búsqueda minimiza los emparejamientos repetidos a lo largo de todas las rondas.',
    whenToUse: 'Noches de juegos casuales, eventos sociales, cafés de juegos de mesa y ligas semanales donde el objetivo es conocer gente nueva y jugar contra oponentes distintos en cada ronda.',
    pros: [
      'Cada jugador juega en cada ronda — sin eliminación',
      'Maximiza oponentes nuevos (evita revanchas)',
      'Las posiciones no importan — juego puramente social',
      'Funciona con cualquier cantidad de jugadores (2–200+)',
    ],
    cons: [
      'Menos competitivo — los mejores jugadores no se enfrentan entre sí',
      'Las posiciones finales pueden parecer arbitrarias (sin narrativa de "campeón")',
      'No apto para eventos estilo eliminatoria',
    ],
  },
  {
    icon: Trophy,
    name: 'Swiss',
    what: 'El formato competitivo clásico utilizado en ajedrez, Magic: The Gathering y torneos competitivos de juegos de mesa. Los jugadores con registros similares se enfrentan: los ganadores juegan contra ganadores, los perdedores contra perdedores.',
    how: 'Después de cada ronda, los jugadores se ordenan por sus puntos totales del evento y se agrupan por puntaje. El grupo superior juega en la Mesa 1, el siguiente en la Mesa 2, etc. El motor también minimiza las revanchas dentro de cada grupo de puntaje sin romper la estructura de grupos.',
    whenToUse: 'Eventos competitivos sin eliminación, temporadas de liga y eventos donde cada jugador debe tener una experiencia completa de torneo sin importar las derrotas tempranas.',
    pros: [
      'Cada ronda es competitiva (oponentes de habilidad similar)',
      'Nadie es eliminado — todos los jugadores participan plenamente',
      'Los puntos se acumulan de forma natural entre rondas',
      'Evitación de revanchas dentro de los grupos de puntaje',
    ],
    cons: [
      'Puede generar revanchas en alta densidad (límite matemático)',
      'Los grupos de puntaje pueden volverse rígidos — difícil de ajustar a mitad del evento',
      'No es ideal para coronar a un único campeón mediante eliminación',
    ],
  },
  {
    icon: Crown,
    name: 'Single Elimination',
    what: 'Formato de eliminatoria donde solo la mitad superior de las posiciones avanza en cada ronda. El resto queda eliminado. Las mesas se ordenan para que los jugadores más fuertes no se enfrenten temprano: el sembrado 1 juega contra el 8, el 2 contra el 7, etc.',
    how: 'Los jugadores se ordenan por sus posiciones y la mitad superior avanza. El bracket utiliza serpentine seeding (1 vs 8, 4 vs 5, 2 vs 7, 3 vs 6) para que los mejores sembrados se distribuyan a lo largo del bracket. Se otorgan byes a los mejores sembrados cuando el campo no tiene un tamaño exacto de bracket.',
    whenToUse: 'Eventos de campeonato, brackets clasificatorios y cualquier evento que deba producir un único campeón indiscutido mediante eliminatorias directas.',
    pros: [
      'Produce un campeón claro',
      'Mucho en juego — cada partida importa',
      'El serpentine seeding protege a los mejores jugadores al principio',
      'El sistema de byes maneja campos que no son potencia de 2',
    ],
    cons: [
      'Los jugadores eliminados terminan — no hay segunda oportunidad',
      'Menos tiempo total de juego para los jugadores eliminados',
      'Una sola mala partida puede terminar el torneo de un jugador',
    ],
  },
  {
    icon: Layers,
    name: 'Adjacent Swiss',
    what: 'Swiss estilo bracket utilizado en lobbies de TFT, finales de Commander de MTG y mesas finales de póker. Los jugadores se agrupan estrictamente por su posición exacta y consecutiva en las posiciones — la Mesa 1 es siempre la mesa superior.',
    how: 'Los jugadores se ordenan estrictamente por sus posiciones (con desempates) y se dividen de forma consecutiva en mesas. Mesa 1 = posiciones 1–K, Mesa 2 = posiciones K+1–2K, etc. Después de cada ronda, los jugadores suben o bajan de mesa según sus nuevos totales de puntos. Sin reordenamiento de revanchas — la estructura de niveles es sagrada.',
    whenToUse: 'Lobbies estilo TFT, torneos de pods de Commander, mesas finales de póker y cualquier evento donde la asignación de mesas deba reflejar directamente la tabla de posiciones actual.',
    pros: [
      'La Mesa 1 es siempre la "mesa principal" con los líderes',
      'Movimiento dinámico — suba en las posiciones, suba de mesa',
      'Totalmente determinístico — mismas posiciones, mismo emparejamiento',
      'Perfecto para mesas superiores dignas de transmisión',
    ],
    cons: [
      'Se aceptan revanchas cuando las posiciones lo dictan',
      'Menos optimización de emparejamientos (sin evitación de revanchas)',
      'Los jugadores del fondo siempre juegan entre sí',
    ],
  },
]

const COMPARISON_ROWS = [
  { feature: 'Ideal para', rr: 'Casual / social', swiss: 'Ligas competitivas', elim: 'Campeonatos', adjSwiss: 'Finales de TFT / Commander' },
  { feature: '¿Elimina jugadores?', rr: 'No', swiss: 'No', elim: 'Sí (avanza la mitad superior)', adjSwiss: 'No' },
  { feature: '¿Basado en posiciones?', rr: 'No (mezcla aleatoria)', swiss: 'Sí (grupos de puntaje)', elim: 'Sí (siembra de bracket)', adjSwiss: 'Sí (posiciones estrictas)' },
  { feature: 'Evitación de revanchas', rr: 'Máxima (algoritmo de búsqueda)', swiss: 'Dentro de grupos de puntaje', elim: 'No aplica', adjSwiss: 'No se aplica (la estructura de niveles es sagrada)' },
  { feature: '¿Produce un campeón?', rr: 'No (social)', swiss: 'Ganador por puntos', elim: 'Sí (ganador por eliminatoria)', adjSwiss: 'Ganador por puntos' },
  { feature: '¿Determinístico?', rr: 'No (RNG + búsqueda)', swiss: 'No (RNG + búsqueda)', elim: 'No (RNG + siembra)', adjSwiss: 'Sí (posiciones puras)' },
]

const FAQS = [
  {
    q: '¿Qué formato debo elegir?',
    a: 'Para una noche de juegos casual con amigos, utilice Round Robin — todos juegan contra todos y el foco está en la diversión. Para una temporada de liga competitiva, utilice Swiss — los jugadores de habilidad similar se enfrentan en cada ronda. Para un campeonato que deba producir un único ganador, utilice Single Elimination. Para un evento estilo TFT o de pod de Commander donde la asignación de mesas deba reflejar la tabla de posiciones, utilice Adjacent Swiss.',
  },
  {
    q: '¿Puedo cambiar de formato entre rondas?',
    a: 'Sí. TableTop Prime admite configuración de formato por ronda. Puede ejecutar las rondas 1–3 como Round Robin, la ronda 4 como Swiss y la ronda 5 como Single Elimination. Esto se llama "evento por fases" — las posiciones se transfieren automáticamente entre formatos.',
  },
  {
    q: '¿Cuál es la diferencia entre Swiss y Adjacent Swiss?',
    a: 'El Swiss clásico empareja a jugadores con registros similares, pero puede reordenar dentro de los grupos de puntaje para evitar revanchas. El Adjacent Swiss es más estricto: agrupa a los jugadores por su posición exacta y consecutiva en las posiciones (Mesa 1 = los K mejores jugadores, Mesa 2 = los K siguientes, etc.) y nunca se reordena, incluso si eso significa una revancha. El Adjacent Swiss es mejor para eventos estilo TFT donde la mesa superior siempre debe presentar a los líderes actuales.',
  },
  {
    q: '¿Cómo funciona la evitación de revanchas?',
    a: 'El motor utiliza un algoritmo de búsqueda local de min-conflicts con delta scoring (evaluando solo las mesas modificadas, no el campo completo) y un presupuesto de tiempo (por defecto 2 segundos). Construye un mapa de adyacencia de todos los emparejamientos previos y minimiza el peso total de revanchas. Los diagnósticos de factibilidad le indican cuándo no existe una solución sin conflictos.',
  },
  {
    q: '¿Qué son los byes en Single Elimination?',
    a: 'Cuando la cantidad de jugadores no es un tamaño exacto de bracket (por ejemplo, 6 jugadores en vez de 8), los mejores sembrados reciben byes: se saltan la ronda 1 y se reincorporan en la ronda 2. La cantidad de byes se calcula para completar el bracket hasta el siguiente tamaño válido. Los byes se otorgan a los sembrados de mayor ranking.',
  },
]

export function FormatsContentEs() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden py-16 sm:py-24">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        </div>
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <span className="inline-block rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            4 formatos · gratis para todos los eventos
          </span>
          <h1 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Formatos de torneo de juegos de mesa explicados
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
            Swiss vs Round Robin vs Single Elimination vs Adjacent Swiss — ¿qué formato de
            torneo es adecuado para su evento? Compare los cuatro, entienda las ventajas y
            desventajas, y elija con confianza.
          </p>
        </div>
      </section>

      {/* Detailed format sections */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6" aria-labelledby="formats-detail-title">
        <div className="mb-10 text-center">
          <h2 id="formats-detail-title" className="text-3xl font-bold tracking-tight sm:text-4xl">
            Los cuatro formatos en detalle
          </h2>
        </div>
        <div className="space-y-8">
          {FORMATS.map((fmt) => {
            const Icon = fmt.icon
            return (
              <Card key={fmt.name} id={fmt.name.toLowerCase().replace(/\s+/g, '-')}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <CardTitle className="text-2xl">{fmt.name}</CardTitle>
                  </div>
                  <CardDescription className="text-sm leading-relaxed">
                    {fmt.what}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground sm:text-base">
                  <div>
                    <h3 className="font-semibold text-foreground">Cómo funciona</h3>
                    <p className="mt-1 leading-relaxed">{fmt.how}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Cuándo utilizarlo</h3>
                    <p className="mt-1 leading-relaxed">{fmt.whenToUse}</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <h3 className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                        <Check className="h-4 w-4" aria-hidden="true" /> Pros
                      </h3>
                      <ul className="mt-1 space-y-1 pl-5">
                        {fmt.pros.map((pro) => (
                          <li key={pro} className="list-disc leading-relaxed">{pro}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400">
                        <X className="h-4 w-4" aria-hidden="true" /> Contras
                      </h3>
                      <ul className="mt-1 space-y-1 pl-5">
                        {fmt.cons.map((con) => (
                          <li key={con} className="list-disc leading-relaxed">{con}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      {/* Comparison table */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6" aria-labelledby="comparison-title">
        <div className="mb-8 text-center">
          <h2 id="comparison-title" className="text-3xl font-bold tracking-tight sm:text-4xl">
            Comparación de formatos
          </h2>
        </div>
        <div className="overflow-x-auto rounded-lg border border-border/60">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                <th className="px-4 py-3 font-semibold">Característica</th>
                <th className="px-4 py-3 font-semibold">Round Robin</th>
                <th className="px-4 py-3 font-semibold">Swiss</th>
                <th className="px-4 py-3 font-semibold">Single Elim</th>
                <th className="px-4 py-3 font-semibold">Adjacent Swiss</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row, i) => (
                <tr key={i} className={i < COMPARISON_ROWS.length - 1 ? 'border-b border-border/60' : ''}>
                  <td className="px-4 py-3 font-medium text-foreground">{row.feature}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.rr}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.swiss}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.elim}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.adjSwiss}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 sm:px-6" aria-labelledby="faq-title">
        <div className="mb-8 text-center">
          <h2 id="faq-title" className="text-3xl font-bold tracking-tight sm:text-4xl">
            Preguntas frecuentes
          </h2>
        </div>
        <div className="space-y-4">
          {FAQS.map((faq, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <h3 className="font-semibold text-foreground">{faq.q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card p-8 text-center sm:p-12">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
          </div>
          <h2 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl">
            Prueba los cuatro formatos — gratis
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-pretty text-sm text-muted-foreground sm:text-base">
            Cambie de formato por ronda, compare resultados y encuentre el formato que se ajuste a su evento.
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
