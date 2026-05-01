"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Settings,
  MessageSquareQuote,
  Menu,
  X,
  ExternalLink,
} from "lucide-react";
import type { StoreSettingsView } from "@/lib/store-settings/getStoreSettings";

const NAV = [
  { label: "Dashboard",    href: "/admin/dashboard",      icon: LayoutDashboard },
  { label: "Pedidos",      href: "/admin/pedidos",        icon: ShoppingBag },
  { label: "Productos",    href: "/admin/productos",      icon: Package },
  { label: "Reseñas",      href: "/admin/resenas",        icon: MessageSquareQuote },
  { label: "Configuración",href: "/admin/configuracion",  icon: Settings },
];

function SidebarContent({
  onClose,
  settings,
}: {
  onClose?: () => void;
  settings: StoreSettingsView;
}) {
  const pathname = usePathname();

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <aside className="flex h-full w-64 flex-col bg-zinc-950">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-zinc-800 px-6">
        <Link
          href="/admin"
          onClick={onClose}
          className="flex items-center gap-2 font-display text-xl font-bold tracking-wider text-white"
        >
          {settings.logo_square_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={settings.logo_square_url}
              alt={settings.store_name}
              className="h-7 w-7 rounded-md object-cover"
            />
          ) : null}
          <span className="bg-[var(--brand-gradient)] bg-clip-text text-transparent">
            {settings.store_name}
          </span>
        </Link>
        <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          Admin
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-0.5">
          {NAV.map(({ label, href, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                onClick={onClose}
                className={clsx(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive(href)
                    ? "bg-white text-zinc-950"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Store link */}
      <div className="border-t border-zinc-800 p-3">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-zinc-500 transition-colors hover:text-zinc-300"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Ver tienda
        </Link>
      </div>
    </aside>
  );
}

export function AdminSidebar({ settings }: { settings: StoreSettingsView }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop — fixed */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex">
        <SidebarContent settings={settings} />
      </div>

      {/* Mobile — hamburger */}
      <button
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-950 text-white shadow-lg lg:hidden"
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile — drawer */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden">
            <div className="relative h-full">
              <button
                onClick={() => setOpen(false)}
                className="absolute -right-10 top-4 flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-white"
                aria-label="Cerrar menú"
              >
                <X className="h-4 w-4" />
              </button>
              <SidebarContent settings={settings} onClose={() => setOpen(false)} />
            </div>
          </div>
        </>
      )}
    </>
  );
}
