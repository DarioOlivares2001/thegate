"use client";

import { useState, useEffect, useLayoutEffect, useRef, useCallback, type RefObject } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, ShoppingBag, User, X } from "lucide-react";
import { useCartStore } from "@/lib/cart/store";
import {
  CLIENTE_SESSION_CHANGED_EVENT,
  dispatchClienteSessionChanged,
} from "@/lib/cuenta/session-events";
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
  const pathname = usePathname();
  const router = useRouter();
  const itemCount = useCartStore((s) => s.itemCount());
  const openDrawer = useCartStore((s) => s.openDrawer);
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hasClienteSession, setHasClienteSession] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  /** Solo una fila (móvil o desktop) monta el panel del menú; evita dos `role="menu"` en el DOM. */
  const [desktopViewport, setDesktopViewport] = useState(false);
  /** Hay dos instancias de cuentaControl (desktop y móvil); un solo ref haría que clicks en una instancia se consideren “fuera” de la otra. */
  const userMenuWrapDesktopRef = useRef<HTMLDivElement>(null);
  const userMenuWrapMobileRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const apply = () => setDesktopViewport(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    setUserMenuOpen(false);
  }, [desktopViewport]);

  const syncClienteSession = useCallback(async () => {
    try {
      const res = await fetch("/api/cuenta/session", { cache: "no-store" });
      const data = await res.json();
      setHasClienteSession(Boolean(data.loggedIn));
    } catch {
      setHasClienteSession(false);
    }
  }, []);

  useEffect(() => {
    void syncClienteSession();
    const onFocus = () => void syncClienteSession();
    const onSessionChanged = () => void syncClienteSession();
    window.addEventListener("focus", onFocus);
    window.addEventListener(CLIENTE_SESSION_CHANGED_EVENT, onSessionChanged);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(CLIENTE_SESSION_CHANGED_EVENT, onSessionChanged);
    };
  }, [syncClienteSession]);

  useEffect(() => {
    if (!userMenuOpen) return;
    function closeIfOutside(e: MouseEvent | TouchEvent) {
      const t = e.target as Node;
      const a = userMenuWrapDesktopRef.current;
      const b = userMenuWrapMobileRef.current;
      if ((a && a.contains(t)) || (b && b.contains(t))) return;
      // Diferir el cierre: si cerramos en el mismo tick que mousedown/touchstart sobre un <a>,
      // algunos navegadores no llegan a emitir el click y la navegación no ocurre.
      window.setTimeout(() => setUserMenuOpen(false), 0);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setUserMenuOpen(false);
    }
    document.addEventListener("mousedown", closeIfOutside);
    document.addEventListener("touchstart", closeIfOutside);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", closeIfOutside);
      document.removeEventListener("touchstart", closeIfOutside);
      window.removeEventListener("keydown", onKey);
    };
  }, [userMenuOpen]);

  useEffect(() => {
    setUserMenuOpen(false);
  }, [pathname]);

  const loginHref = `/cuenta/login?redirect=${encodeURIComponent(pathname || "/")}`;

  async function handleLogout() {
    try {
      await fetch("/api/cuenta/logout", { method: "POST" });
    } catch {
      // aun así cerramos UI local
    }
    setHasClienteSession(false);
    setUserMenuOpen(false);
    setMobileOpen(false);
    dispatchClienteSessionChanged();
    router.push("/");
    router.refresh();
  }

  function handleUserMenuNavigate(path: string, onAfterCloseMenu?: () => void) {
    setUserMenuOpen(false);
    onAfterCloseMenu?.();
    router.push(path);
  }

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

  const cuentaAriaLoggedOut = "Entrar a mi cuenta o iniciar sesión";
  const cuentaAriaLoggedIn = "Menú de cuenta";

  const menuLinkClass =
    "block w-full cursor-pointer rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-[var(--color-border)]/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-inset";

  const cuentaControl = (opts: {
    onNavigate?: () => void;
    menuWrapRef: RefObject<HTMLDivElement>;
    mountMenuPanel: boolean;
  }) => {
    if (!hasClienteSession) {
      return (
        <Link
          href={loginHref}
          onClick={opts.onNavigate}
          title="Mi cuenta"
          aria-label={cuentaAriaLoggedOut}
          className="rounded-[var(--radius-sm)] p-2 transition-colors duration-[var(--transition-fast)] hover:bg-[var(--color-border)]/40"
          style={{ color: navbarTextColor }}
        >
          <User className="h-6 w-6" strokeWidth={1.75} />
        </Link>
      );
    }

    return (
      <div ref={opts.menuWrapRef} className="relative">
        <button
          type="button"
          title="Mi cuenta"
          aria-label={cuentaAriaLoggedIn}
          aria-expanded={userMenuOpen}
          aria-haspopup="menu"
          onClick={() => setUserMenuOpen((o) => !o)}
          className={`rounded-[var(--radius-sm)] p-2 transition-colors duration-[var(--transition-fast)] ${
            userMenuOpen
              ? "bg-[var(--color-primary)]/18 ring-2 ring-[var(--color-primary)]/45"
              : "bg-[var(--color-primary)]/10 ring-1 ring-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/14"
          } text-[var(--color-primary)]`}
        >
          <User className="h-6 w-6" strokeWidth={1.75} aria-hidden />
        </button>
        {userMenuOpen && opts.mountMenuPanel && (
          <div
            role="menu"
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute right-0 z-50 mt-2 max-h-[min(22rem,calc(100dvh-5.5rem))] w-[min(100vw-2rem,13.5rem)] overflow-y-auto overscroll-contain rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-lg"
          >
            <button
              type="button"
              role="menuitem"
              className={menuLinkClass}
              style={{ color: navbarTextColor }}
              onClick={() => handleUserMenuNavigate("/cuenta/datos", opts.onNavigate)}
            >
              Mis datos
            </button>
            <button
              type="button"
              role="menuitem"
              className={menuLinkClass}
              style={{ color: navbarTextColor }}
              onClick={() => handleUserMenuNavigate("/cuenta/direcciones", opts.onNavigate)}
            >
              Mis direcciones
            </button>
            <button
              type="button"
              role="menuitem"
              className={menuLinkClass}
              style={{ color: navbarTextColor }}
              onClick={() => handleUserMenuNavigate("/cuenta/pedidos", opts.onNavigate)}
            >
              Mis pedidos
            </button>
            <button
              type="button"
              role="menuitem"
              className={menuLinkClass}
              style={{ color: navbarTextColor }}
              onClick={() => handleUserMenuNavigate("/seguimiento", opts.onNavigate)}
            >
              Seguimiento
            </button>
            <button
              type="button"
              role="menuitem"
              className={`${menuLinkClass} text-[var(--color-error)] hover:bg-[var(--color-error)]/8`}
              onClick={() => void handleLogout()}
            >
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
    );
  };

  const cart = (
    <button
      onClick={openDrawer}
      aria-label={
        mounted && itemCount > 0
          ? `Abrir carrito, ${itemCount} ${itemCount === 1 ? "producto" : "productos"}`
          : "Abrir carrito"
      }
      suppressHydrationWarning
      className="relative rounded-[var(--radius-sm)] p-2 transition-colors duration-[var(--transition-fast)] hover:bg-[var(--color-border)]/40 md:-mr-2"
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

  const cuentaHintDesktop = !hasClienteSession ? (
    <div className="hidden max-w-[148px] flex-col items-end justify-center pr-1 text-right md:flex lg:max-w-[200px]">
      <span
        className="text-[10px] font-medium leading-snug text-[var(--color-text-muted)]"
        style={{ opacity: 0.92 }}
      >
        Entra a tu cuenta y accede a descuentos exclusivos
      </span>
    </div>
  ) : null;

  const accountAndCart = (
    <div className="flex items-center justify-end gap-0.5 md:gap-2">
      {cuentaHintDesktop}
      {cuentaControl({ menuWrapRef: userMenuWrapDesktopRef, mountMenuPanel: desktopViewport })}
      {cart}
    </div>
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
  bySlot[cartSlot] = accountAndCart;

  const mobileBrandAlign =
    settings.navbar_brand_position === "right"
      ? "justify-end"
      : settings.navbar_brand_position === "left"
        ? "justify-start"
        : "justify-center";

  return (
    <header
      className="sticky top-8 z-40 w-full border-b border-[var(--color-border)] backdrop-blur-md pointer-events-none"
      style={{ backgroundColor: navbarBgColor }}
    >
      {/* Solo la barra recibe clics: evita que extensiones del sticky (blur/sombra) roben hits al contenido debajo al hacer scroll */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pointer-events-auto">
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

          <div className="justify-self-end flex items-center gap-0.5">
            {cuentaControl({
              menuWrapRef: userMenuWrapMobileRef,
              onNavigate: () => setMobileOpen(false),
              mountMenuPanel: !desktopViewport,
            })}
            {cart}
          </div>
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
              {!hasClienteSession ? (
                <p
                  className="mt-1 border-t border-[var(--color-border)]/60 px-3 pt-2 text-[10px] leading-snug text-[var(--color-text-muted)]"
                  style={{ opacity: 0.95 }}
                >
                  Entra a tu cuenta y accede a descuentos exclusivos
                </p>
              ) : null}
              {hasClienteSession ? (
                <>
                  <p
                    className="mt-1 border-t border-[var(--color-border)]/60 px-3 pt-2 text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]"
                    style={{ opacity: 0.95 }}
                  >
                    Tu cuenta
                  </p>
                  <button
                    type="button"
                    onClick={() => handleUserMenuNavigate("/cuenta/datos", () => setMobileOpen(false))}
                    className="mt-0.5 block w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--color-border)]/30"
                    style={{ color: navbarTextColor }}
                  >
                    Mis datos
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUserMenuNavigate("/cuenta/direcciones", () => setMobileOpen(false))}
                    className="block w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--color-border)]/30"
                    style={{ color: navbarTextColor }}
                  >
                    Mis direcciones
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUserMenuNavigate("/cuenta/pedidos", () => setMobileOpen(false))}
                    className="block w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--color-border)]/30"
                    style={{ color: navbarTextColor }}
                  >
                    Mis pedidos
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUserMenuNavigate("/seguimiento", () => setMobileOpen(false))}
                    className="block w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--color-border)]/30"
                    style={{ color: navbarTextColor }}
                  >
                    Seguimiento
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleLogout()}
                    className="block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-[var(--color-error)] transition-colors hover:bg-[var(--color-error)]/8"
                  >
                    Cerrar sesión
                  </button>
                </>
              ) : (
                <Link
                  href={loginHref}
                  onClick={() => setMobileOpen(false)}
                  className="mt-0.5 flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--color-border)]/30"
                  style={{ color: navbarTextColor }}
                >
                  <User className="h-4 w-4 shrink-0 opacity-80" strokeWidth={1.75} aria-hidden />
                  Iniciar sesión
                </Link>
              )}
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
