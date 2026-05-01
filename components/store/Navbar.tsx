"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, ShoppingBag, X } from "lucide-react";
import { useCartStore } from "@/lib/cart/store";
import type { StoreSettingsView } from "@/lib/store-settings/getStoreSettings";

type Slot = "left" | "center" | "right";

const NAV_ITEMS = [
  { href: "/productos", label: "Productos" },
  { href: "/nosotros", label: "Nosotros" },
];

function slotClass(slot: Slot) {
  if (slot === "left") return "justify-self-start";
  if (slot === "center") return "justify-self-center";
  return "justify-self-end";
}

function placeSlots(
  brandPosition: Slot,
  menuPosition: Slot
): { brandSlot: Slot; menuSlot: Slot; cartSlot: Slot } {
  const allSlots: Slot[] = ["left", "center", "right"];
  const used = new Set<Slot>();

  const brandSlot = allSlots.includes(brandPosition)
    ? brandPosition
    : "left";
  used.add(brandSlot);

  const desiredMenu = allSlots.includes(menuPosition) ? menuPosition : "center";
  const menuSlot = used.has(desiredMenu)
    ? allSlots.find((s) => !used.has(s)) ?? "center"
    : desiredMenu;
  used.add(menuSlot);

  const desiredCart: Slot = "right";
  const cartSlot = used.has(desiredCart)
    ? allSlots.find((s) => !used.has(s)) ?? "right"
    : desiredCart;

  return { brandSlot, menuSlot, cartSlot };
}

export function Navbar({ settings }: { settings: StoreSettingsView }) {
  const itemCount = useCartStore((s) => s.itemCount());
  const openDrawer = useCartStore((s) => s.openDrawer);
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => setMounted(true), []);

  const mode = settings.branding_mode ?? "logo_and_text";
  const logoSrc = settings.logo_url || settings.logo_square_url;
  const showLogo = mode === "logo" || mode === "logo_and_text";
  const hasLogo = Boolean(logoSrc);
  const showText = mode === "text" || mode === "logo_and_text" || !hasLogo;
  const brandTextSize = "calc(1.25rem * var(--brand-scale, 1))";
  const navbarBgColor = settings.navbar_background_color || "var(--color-surface)";
  const navbarTextColor = settings.navbar_text_color || "var(--color-text)";
  const brandTextColor = settings.brand_text_color || "var(--brand-primary)";

  const brand = (
    <Link
      href="/"
      className="flex min-w-0 items-center gap-2 transition-opacity hover:opacity-80"
      aria-label={`Ir a inicio - ${settings.store_name}`}
      style={{ color: navbarTextColor }}
    >
      {showLogo && hasLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoSrc}
          alt={settings.store_name}
          className="h-[var(--logo-size-mobile)] w-auto rounded-md object-contain md:h-[var(--logo-size-desktop)]"
        />
      ) : null}
      {showText ? (
        <span
          className="block min-w-0 max-w-full truncate"
          style={{
            fontFamily: "var(--font-heading)",
            fontWeight: 800,
            letterSpacing: "-0.04em",
            fontSize: "calc(1.25rem * var(--brand-scale))",
            lineHeight: 1,
            color: brandTextColor,
          }}
        >
          {settings.store_name}
        </span>
      ) : null}
      {!showLogo && !showText ? (
        <span style={{ fontSize: brandTextSize }}>{settings.store_name}</span>
      ) : null}
    </Link>
  );

  const menu = (
    <nav className="hidden items-center gap-8 md:flex" aria-label="Navegación principal">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="text-sm transition-colors duration-[var(--transition-fast)] hover:opacity-80"
          style={{ color: navbarTextColor }}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );

  const cart = (
    <button
      onClick={openDrawer}
      aria-label={
        mounted && itemCount > 0
          ? `Abrir carrito, ${itemCount} ${itemCount === 1 ? "producto" : "productos"}`
          : "Abrir carrito"
      }
      suppressHydrationWarning
      className="relative -mr-2 rounded-[var(--radius-sm)] p-2 transition-colors duration-[var(--transition-fast)] hover:bg-[var(--color-border)]/40"
      style={{ color: navbarTextColor }}
    >
      <ShoppingBag className="h-6 w-6" strokeWidth={1.75} />

      {mounted && itemCount > 0 && (
        <span
          aria-hidden
          className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--color-accent)] px-1 text-[10px] font-bold leading-none text-white"
        >
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      )}
    </button>
  );

  const { brandSlot, menuSlot, cartSlot } = placeSlots(
    settings.navbar_brand_position,
    settings.navbar_menu_position
  );
  const bySlot: Record<Slot, React.ReactNode> = {
    left: null,
    center: null,
    right: null,
  };
  bySlot[brandSlot] = brand;
  bySlot[menuSlot] = menu;
  bySlot[cartSlot] = cart;

  const mobileBrandAlign =
    settings.navbar_brand_position === "right"
      ? "justify-end"
      : settings.navbar_brand_position === "left"
        ? "justify-start"
        : "justify-center";

  return (
    <header
      className="sticky top-8 z-40 w-full border-b border-[var(--color-border)] backdrop-blur-md"
      style={{ backgroundColor: navbarBgColor }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Mobile */}
        <div className="grid h-16 grid-cols-[40px_1fr_40px] items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
            className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] transition-colors hover:bg-[var(--color-border)]/40"
            style={{ color: navbarTextColor }}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div className={`flex min-w-0 ${mobileBrandAlign}`}>{brand}</div>

          <div className="justify-self-end">{cart}</div>
        </div>

        {mobileOpen && (
          <div className="pb-3 md:hidden">
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-sm">
              <Link
                href="/productos"
                onClick={() => setMobileOpen(false)}
                className="block rounded-md px-3 py-2 text-sm transition-colors hover:bg-[var(--color-border)]/30"
                style={{ color: navbarTextColor }}
              >
                Productos
              </Link>
              <Link
                href="/nosotros"
                onClick={() => setMobileOpen(false)}
                className="block rounded-md px-3 py-2 text-sm transition-colors hover:bg-[var(--color-border)]/30"
                style={{ color: navbarTextColor }}
              >
                Nosotros
              </Link>
              <button
                type="button"
                onClick={() => {
                  openDrawer();
                  setMobileOpen(false);
                }}
                className="block w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--color-border)]/30"
                style={{ color: navbarTextColor }}
              >
                Ver carrito
              </button>
            </div>
          </div>
        )}

        {/* Desktop */}
        <div className="hidden h-16 grid-cols-3 items-center gap-3 md:grid">
          <div className={`min-w-0 ${slotClass("left")}`}>{bySlot.left}</div>
          <div className={`min-w-0 ${slotClass("center")}`}>{bySlot.center}</div>
          <div className={`min-w-0 ${slotClass("right")}`}>{bySlot.right}</div>
        </div>
      </div>
    </header>
  );
}
