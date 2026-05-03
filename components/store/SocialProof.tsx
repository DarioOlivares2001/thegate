const TESTIMONIALS = [
  {
    name: "Camila Rojas",
    city: "Santiago",
    comment:
      "La arena sanitaria controla mejor el olor de lo que esperaba y el formato rinde bastante en casa con dos gatos.",
  },
  {
    name: "Matías Fuentes",
    city: "Valparaíso",
    comment:
      "Compré arenero con alfombra atrapa arena y de verdad se nota menos desorden alrededor. Fue una muy buena combinación.",
  },
  {
    name: "Valentina Mora",
    city: "Rancagua",
    comment:
      "El spray antiolor ayuda entre limpiezas y el pedido llegó rápido a Rancagua. Todo venía bien presentado.",
  },
];

function Stars() {
  return (
    <div className="flex gap-0.5" aria-label="5 estrellas">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} viewBox="0 0 20 20" className="h-4 w-4 fill-amber-400" aria-hidden>
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export function SocialProof() {
  return (
    <section className="bg-zinc-50">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="font-display text-2xl font-bold tracking-tight text-[var(--color-text)] sm:text-3xl text-center mb-10">
          Lo que dicen nuestros clientes
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {TESTIMONIALS.map(({ name, city, comment }) => (
            <figure
              key={name}
              className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-zinc-200 bg-white p-6 shadow-sm"
            >
              <Stars />
              <blockquote>
                <p className="text-[var(--color-text-muted)] leading-relaxed">
                  &ldquo;{comment}&rdquo;
                </p>
              </blockquote>
              <figcaption className="mt-auto">
                <p className="text-sm font-semibold text-[var(--color-text)]">{name}</p>
                <p className="text-xs text-[var(--color-text-muted)]">{city}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
