"use client";

import { useState } from "react";
import { clsx } from "clsx";

type TabKey = "identidad" | "contacto" | "ventas";

const TABS: { key: TabKey; label: string }[] = [
  { key: "identidad", label: "Identidad y marca" },
  { key: "contacto", label: "Contacto" },
  { key: "ventas", label: "Ventas y envío" },
];

export function ConfigTabs({
  identidad,
  contacto,
  ventas,
}: {
  identidad: React.ReactNode;
  contacto: React.ReactNode;
  ventas: React.ReactNode;
}) {
  const [active, setActive] = useState<TabKey>("identidad");

  return (
    <div>
      <div className="mb-5 flex gap-1 border-b border-zinc-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActive(t.key)}
            className={clsx(
              "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              active === t.key
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/*
        Los 3 paneles quedan siempre montados (solo se ocultan con `hidden`).
        Es un único <form> con un único submit: si un panel se desmontara al
        cambiar de tab, sus inputs desaparecerían de FormData y guardar desde
        otra pestaña borraría esos campos.
      */}
      <div className={active === "identidad" ? undefined : "hidden"}>{identidad}</div>
      <div className={active === "contacto" ? undefined : "hidden"}>{contacto}</div>
      <div className={active === "ventas" ? undefined : "hidden"}>{ventas}</div>
    </div>
  );
}
