"use client";

import { useTransition } from "react";
import { toast } from "@/components/ui/Toast";

type SaveResult = { error?: string; success?: boolean };

export function SaveSettingsForm({
  action,
  children,
}: {
  action: (formData: FormData) => Promise<SaveResult>;
  children: React.ReactNode;
}) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await action(formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Configuración guardada correctamente.");
      }
    });
  }

  return (
    <form
      id="store-settings-form"
      onSubmit={handleSubmit}
      className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
    >
      {children}

      <div className="mt-5 flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Guardando…" : "Guardar configuración"}
        </button>
      </div>
    </form>
  );
}
