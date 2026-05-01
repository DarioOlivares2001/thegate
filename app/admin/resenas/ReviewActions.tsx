"use client";

import { toast } from "@/components/ui/Toast";

type ReviewStatusTab = "pending" | "approved" | "rejected";

type ActionFn = (formData: FormData) => Promise<void>;

export function ReviewActions({
  reviewId,
  status,
  active,
  approveAction,
  rejectAction,
  hideAction,
}: {
  reviewId: string;
  status: ReviewStatusTab;
  active: boolean;
  approveAction: ActionFn;
  rejectAction: ActionFn;
  hideAction: ActionFn;
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {status !== "approved" ? (
        <form
          action={approveAction}
          onSubmit={() => {
            toast.success("Reseña aprobada");
          }}
        >
          <input type="hidden" name="id" value={reviewId} />
          <button
            type="submit"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-emerald-600/30 transition hover:scale-[1.02] hover:bg-emerald-700"
          >
            Aprobar rápido
          </button>
        </form>
      ) : null}

      {status !== "rejected" ? (
        <form
          action={rejectAction}
          onSubmit={(e) => {
            const ok = window.confirm("¿Seguro que quieres rechazar esta reseña?");
            if (!ok) {
              e.preventDefault();
              return;
            }
            toast.success("Reseña rechazada");
          }}
        >
          <input type="hidden" name="id" value={reviewId} />
          <button
            type="submit"
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
          >
            Rechazar
          </button>
        </form>
      ) : null}

      {status === "approved" && active ? (
        <form action={hideAction}>
          <input type="hidden" name="id" value={reviewId} />
          <button
            type="submit"
            className="rounded-lg bg-zinc-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            Ocultar aprobada
          </button>
        </form>
      ) : null}
    </div>
  );
}

