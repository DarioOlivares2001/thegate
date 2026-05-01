"use client";

import { CheckCircle2, ClipboardList, PackageSearch, Truck, Home } from "lucide-react";

type TimelineVisualState = "completed" | "current" | "pending";

interface Step {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STEPS: Step[] = [
  {
    title: "Pedido recibido",
    description: "Pago registrado y orden creada.",
    icon: ClipboardList,
  },
  {
    title: "Preparando",
    description: "Estamos alistando tus productos.",
    icon: PackageSearch,
  },
  {
    title: "En despacho",
    description: "Pedido en camino al destino.",
    icon: Truck,
  },
  {
    title: "Entregado",
    description: "Pedido recibido por el cliente.",
    icon: Home,
  },
];

function getCurrentStep(status: string): number | null {
  const normalized = status === "ready_to_ship" ? "shipped" : status;
  if (normalized === "cancelled") return null;
  if (normalized === "pending" || normalized === "paid") return 0;
  if (normalized === "preparing") return 1;
  if (normalized === "shipped") return 2;
  if (normalized === "delivered") return 3;
  return 0;
}

function getStepState(stepIndex: number, currentStep: number): TimelineVisualState {
  if (stepIndex < currentStep) return "completed";
  if (stepIndex === currentStep) return "current";
  return "pending";
}

function clsByState(state: TimelineVisualState) {
  if (state === "completed") {
    return {
      node: "border-green-500 bg-green-500 text-white",
      icon: "text-white",
      line: "bg-green-500",
      title: "text-zinc-900",
      desc: "text-zinc-600",
    };
  }
  if (state === "current") {
    return {
      node: "border-zinc-900 bg-zinc-900 text-white ring-4 ring-zinc-200",
      icon: "text-white",
      line: "bg-zinc-200",
      title: "text-zinc-900",
      desc: "text-zinc-600",
    };
  }
  return {
    node: "border-zinc-200 bg-white text-zinc-400",
    icon: "text-zinc-400",
    line: "bg-zinc-200",
    title: "text-zinc-500",
    desc: "text-zinc-400",
  };
}

export function OrderTimeline({ status }: { status: string }) {
  const currentStep = getCurrentStep(status);
  const isDelivered = currentStep === 3;

  if (currentStep === null) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
        <div className="flex items-start gap-2.5">
          <CheckCircle2 className="mt-0.5 h-4 w-4 text-red-600" />
          <div>
            <p className="text-sm font-semibold text-red-700">Pedido cancelado</p>
            <p className="mt-0.5 text-xs text-red-600">
              Este pedido fue cancelado y no sigue el flujo de tracking.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="overflow-x-auto">
        <div className="grid min-w-[760px] grid-cols-4 gap-0">
          {STEPS.map((step, idx) => {
            const visualState = getStepState(idx, currentStep);
            const cls = clsByState(visualState);
            const Icon = step.icon;
            const isDone = visualState === "completed";
            const isDeliveredMilestone = isDelivered && idx === STEPS.length - 1;

            return (
              <div key={step.title} className="relative px-2">
                {idx < STEPS.length - 1 && (
                  <div className="absolute left-[calc(50%+1.5rem)] right-[-50%] top-5 h-0.5">
                    <div className={`h-full w-full ${idx < currentStep ? "bg-green-500" : cls.line}`} />
                  </div>
                )}

                <div className="flex flex-col items-center text-center">
                  <div
                    className={`relative z-10 flex items-center justify-center rounded-full border ${cls.node} ${
                      isDeliveredMilestone
                        ? "h-12 w-12 border-emerald-500 bg-emerald-500 text-white shadow-[0_0_0_6px_rgba(16,185,129,0.2),0_0_26px_rgba(16,185,129,0.55)] animate-[pulse_2s_ease-in-out_infinite]"
                        : "h-10 w-10"
                    }`}
                    aria-current={visualState === "current" ? "step" : undefined}
                  >
                    {isDeliveredMilestone && (
                      <span className="absolute -top-3 text-sm leading-none" aria-hidden>
                        👑
                      </span>
                    )}
                    <Icon className={`h-4 w-4 ${cls.icon}`} />
                  </div>

                  <p className={`mt-3 text-sm font-semibold ${cls.title}`}>
                    {step.title}
                    {isDone ? " ✓" : ""}
                  </p>
                  <p className={`mt-1 max-w-[160px] text-xs leading-relaxed ${cls.desc}`}>
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
