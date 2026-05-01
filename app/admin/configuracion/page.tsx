import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  DEFAULT_STORE_SETTINGS,
  getStoreSettings,
  type StoreSettingsView,
} from "@/lib/store-settings/getStoreSettings";
import { FontSelectField } from "./FontSelectField";
import { ThemeLivePreview } from "./ThemeLivePreview";
import { HeroBannerSection } from "./HeroBannerSection";

export const metadata: Metadata = { title: "Configuración" };

const HEADING_FONTS = [
  "Inter",
  "Poppins",
  "Montserrat",
  "Nunito",
  "Lato",
  "Roboto",
  "Playfair Display",
  "Space Grotesk",
  "DM Sans",
  "Outfit",
];

const BODY_FONTS = [
  "Inter",
  "Poppins",
  "Montserrat",
  "Nunito",
  "Lato",
  "Roboto",
  "DM Sans",
  "Outfit",
];

async function saveSettingsAction(formData: FormData) {
  "use server";

  function read(field: keyof StoreSettingsView) {
    return String(formData.get(field) ?? "").trim();
  }
  function readNumber(field: keyof StoreSettingsView, fallback: number) {
    const raw = Number(formData.get(field));
    return Number.isFinite(raw) && raw > 0 ? raw : fallback;
  }
  function readBoolean(field: keyof StoreSettingsView) {
    return formData.get(field) === "true";
  }
  function readBrandScale(field: keyof StoreSettingsView, fallback: number) {
    const raw = Number(formData.get(field));
    if (!Number.isFinite(raw)) return fallback;
    // DB constraint en store_settings_brand_text_scale_check: 0.50..3.00
    return Math.min(3, Math.max(0.5, raw));
  }
  function readHeroOverlayOpacity(field: keyof StoreSettingsView, fallback: number) {
    const raw = Number(formData.get(field));
    if (!Number.isFinite(raw)) return fallback;
    if (raw < 0 || raw > 90) return fallback;
    return Math.round(raw / 5) * 5;
  }
  function normalizeTikTok(value: string) {
    const raw = value.trim();
    if (!raw) return "";
    if (raw.startsWith("@")) return `https://tiktok.com/${raw}`;
    if (/^https?:\/\//i.test(raw)) return raw;
    if (/^tiktok\.com\//i.test(raw) || /^www\.tiktok\.com\//i.test(raw)) {
      return `https://${raw.replace(/^https?:\/\//i, "")}`;
    }
    return raw;
  }

  const themePreset = read("theme_preset");
  const brandingMode = read("branding_mode");
  const brandPos = read("navbar_brand_position");
  const menuPos = read("navbar_menu_position");

  const validThemePreset = [
    "minimal_black",
    "pets_purple_pink",
    "premium_dark",
    "natural_green",
    "pastel",
    "custom",
  ].includes(themePreset)
    ? themePreset
    : DEFAULT_STORE_SETTINGS.theme_preset;
  const validBrandingMode = ["logo", "text", "logo_and_text"].includes(brandingMode)
    ? brandingMode
    : DEFAULT_STORE_SETTINGS.branding_mode;
  const validBrandPos = ["left", "center", "right"].includes(brandPos)
    ? brandPos
    : DEFAULT_STORE_SETTINGS.navbar_brand_position;
  const validMenuPos = ["left", "center", "right"].includes(menuPos)
    ? menuPos
    : DEFAULT_STORE_SETTINGS.navbar_menu_position;
  const validHeroOverlayMode = read("hero_overlay_mode") === "auto" ? "auto" : "manual";

  // Leemos primero valores submitteados para evitar sobrescribir URL mobile con string vacío.
  const submittedDesktopUrl = read("hero_banner_desktop_url");
  const submittedMobileUrl = read("hero_banner_mobile_url");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any;
  const { data: existingRows } = await supabase
    .from("store_settings")
    .select("id,hero_banner_desktop_url,hero_banner_mobile_url")
    .order("updated_at", { ascending: false })
    .limit(50);

  const existing = Array.isArray(existingRows) ? existingRows[0] : null;
  const duplicateIds =
    Array.isArray(existingRows) && existingRows.length > 1
      ? existingRows.slice(1).map((r: { id: string }) => r.id).filter(Boolean)
      : [];

  if (duplicateIds.length > 0) {
    await supabase.from("store_settings").delete().in("id", duplicateIds);
  }

  const persistedDesktopUrl =
    submittedDesktopUrl ||
    (existing as { hero_banner_desktop_url?: string | null } | null)?.hero_banner_desktop_url ||
    "";
  const persistedMobileUrl =
    submittedMobileUrl ||
    (existing as { hero_banner_mobile_url?: string | null } | null)?.hero_banner_mobile_url ||
    "";

  const payload = {
    store_name: read("store_name") || DEFAULT_STORE_SETTINGS.store_name,
    store_tagline: read("store_tagline"),
    logo_url: read("logo_url"),
    logo_square_url: read("logo_square_url"),
    favicon_url: read("favicon_url"),
    brand_text_color: read("brand_text_color") || DEFAULT_STORE_SETTINGS.brand_text_color,
    navbar_background_color:
      read("navbar_background_color") || DEFAULT_STORE_SETTINGS.navbar_background_color,
    navbar_text_color: read("navbar_text_color") || DEFAULT_STORE_SETTINGS.navbar_text_color,
    footer_background_color:
      read("footer_background_color") || DEFAULT_STORE_SETTINGS.footer_background_color,
    footer_text_color: read("footer_text_color") || DEFAULT_STORE_SETTINGS.footer_text_color,
    theme_preset: validThemePreset,
    branding_mode: validBrandingMode,
    logo_size_desktop: readNumber("logo_size_desktop", DEFAULT_STORE_SETTINGS.logo_size_desktop),
    logo_size_mobile: readNumber("logo_size_mobile", DEFAULT_STORE_SETTINGS.logo_size_mobile),
    brand_text_scale: readBrandScale("brand_text_scale", DEFAULT_STORE_SETTINGS.brand_text_scale),
    navbar_brand_position: validBrandPos,
    navbar_menu_position: validMenuPos,
    font_heading: read("font_heading") || DEFAULT_STORE_SETTINGS.font_heading,
    font_body: read("font_body") || DEFAULT_STORE_SETTINGS.font_body,
    theme_manual_override: readBoolean("theme_manual_override"),
    primary_color: read("primary_color") || DEFAULT_STORE_SETTINGS.primary_color,
    accent_color: read("accent_color") || DEFAULT_STORE_SETTINGS.accent_color,
    background_color: read("background_color") || DEFAULT_STORE_SETTINGS.background_color,
    surface_color: read("surface_color") || DEFAULT_STORE_SETTINGS.surface_color,
    text_color: read("text_color") || DEFAULT_STORE_SETTINGS.text_color,
    text_muted_color: read("text_muted_color") || DEFAULT_STORE_SETTINGS.text_muted_color,
    border_color: read("border_color") || DEFAULT_STORE_SETTINGS.border_color,
    support_whatsapp: read("support_whatsapp"),
    contact_email: read("contact_email"),
    support_instagram: read("support_instagram"),
    support_tiktok: normalizeTikTok(read("support_tiktok")),
    hero_banner_desktop_url: persistedDesktopUrl,
    hero_banner_mobile_url: persistedMobileUrl,
    hero_overlay_mode: validHeroOverlayMode,
    hero_overlay_opacity: readHeroOverlayOpacity(
      "hero_overlay_opacity",
      DEFAULT_STORE_SETTINGS.hero_overlay_opacity
    ),
    enable_whatsapp_checkout: readBoolean("enable_whatsapp_checkout"),
  };
  console.log("[hero-config-save] desktop url payload:", payload.hero_banner_desktop_url || "(empty)");
  console.log("[hero-config-save] mobile url payload:", payload.hero_banner_mobile_url || "(empty)");

  const operation = existing?.id
    ? supabase.from("store_settings").update(payload).eq("id", existing.id)
    : supabase.from("store_settings").insert(payload);

  const { error } = await operation;
  if (error) {
    console.error("[admin/configuracion] Error guardando store_settings:", error.message);
    return;
  }

  const { data: savedRow, error: savedError } = await supabase
    .from("store_settings")
    .select("id,hero_banner_desktop_url,hero_banner_mobile_url")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (savedError) {
    console.error("[hero-config-save] readback error", savedError.message);
  } else {
    console.log("[hero-config-save] saved settings", savedRow);
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/configuracion");
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: "text" | "url" | "color";
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-zinc-700">{label}</span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="h-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-medium text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
      />
    </label>
  );
}

export default async function ConfiguracionPage() {
  const settings = await getStoreSettings();
  console.log("[hero-config-load] mobile url from store_settings:", settings.hero_banner_mobile_url || "(empty)");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Configuración de la tienda</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Administra nombre, branding y canales de contacto de la tienda.
        </p>
      </div>

      <form
        id="store-settings-form"
        action={saveSettingsAction}
        className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <ThemeLivePreview formId="store-settings-form" initial={settings} />

        <div className="mb-5 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
          <h2 className="text-sm font-semibold text-zinc-800">Preset visual</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Selecciona una base de estilo o usa custom para controlar colores manuales.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-zinc-700">Tema</span>
              <select
                name="theme_preset"
                defaultValue={settings.theme_preset}
                className="h-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-medium text-[var(--color-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                <option value="minimal_black">Minimal negro</option>
                <option value="pets_purple_pink">Mascotas morado/rosado</option>
                <option value="premium_dark">Premium oscuro</option>
                <option value="natural_green">Natural/verde</option>
                <option value="pastel">Pastel</option>
                <option value="custom">Custom (manual)</option>
              </select>
            </label>
            <label className="flex items-center gap-2 pt-7 text-sm text-zinc-700">
              <input
                type="checkbox"
                name="theme_manual_override"
                value="true"
                defaultChecked={settings.theme_manual_override}
                className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
              />
              Forzar colores manuales sobre preset
            </label>
          </div>
        </div>

        <div className="mb-5 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
          <h2 className="text-sm font-semibold text-zinc-800">Branding</h2>
          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-zinc-700">Modo de branding</span>
              <select
                name="branding_mode"
                defaultValue={settings.branding_mode}
                className="h-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-medium text-[var(--color-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                <option value="logo">Solo logo</option>
                <option value="text">Solo texto</option>
                <option value="logo_and_text">Logo + texto</option>
              </select>
            </label>
            <Field
              label="Favicon URL"
              name="favicon_url"
              type="url"
              defaultValue={settings.favicon_url}
              placeholder="https://..."
            />
            <Field
              label="Tamaño logo desktop (px)"
              name="logo_size_desktop"
              type="text"
              defaultValue={String(settings.logo_size_desktop)}
              placeholder="32"
            />
            <Field
              label="Tamaño logo mobile (px)"
              name="logo_size_mobile"
              type="text"
              defaultValue={String(settings.logo_size_mobile)}
              placeholder="28"
            />
            <Field
              label="Escala texto marca"
              name="brand_text_scale"
              type="text"
              defaultValue={String(settings.brand_text_scale)}
              placeholder="1"
            />
            <Field
              label="Color texto marca"
              name="brand_text_color"
              type="color"
              defaultValue={settings.brand_text_color}
            />
          </div>
        </div>

        <div className="mb-5 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
          <h2 className="text-sm font-semibold text-zinc-800">Navbar</h2>
          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-zinc-700">Posición branding</span>
              <select
                name="navbar_brand_position"
                defaultValue={settings.navbar_brand_position}
                className="h-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-medium text-[var(--color-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                <option value="left">Izquierda</option>
                <option value="center">Centro</option>
                <option value="right">Derecha</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-zinc-700">Posición menú</span>
              <select
                name="navbar_menu_position"
                defaultValue={settings.navbar_menu_position}
                className="h-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-medium text-[var(--color-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                <option value="left">Izquierda</option>
                <option value="center">Centro</option>
                <option value="right">Derecha</option>
              </select>
            </label>
            <Field
              label="Fondo navbar"
              name="navbar_background_color"
              type="color"
              defaultValue={settings.navbar_background_color}
            />
            <Field
              label="Texto navbar"
              name="navbar_text_color"
              type="color"
              defaultValue={settings.navbar_text_color}
            />
          </div>
        </div>

        <div className="mb-5 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
          <h2 className="text-sm font-semibold text-zinc-800">Footer</h2>
          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field
              label="Fondo footer"
              name="footer_background_color"
              type="color"
              defaultValue={settings.footer_background_color}
            />
            <Field
              label="Texto footer"
              name="footer_text_color"
              type="color"
              defaultValue={settings.footer_text_color}
            />
          </div>
        </div>

        <div className="mb-5 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
          <h2 className="text-sm font-semibold text-zinc-800">Tipografía</h2>
          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
            <FontSelectField
              label="Fuente headings"
              name="font_heading"
              defaultValue={settings.font_heading}
              options={HEADING_FONTS}
              helperText="Puedes usar fuentes display como Playfair Display para titulares."
              previewText="Vista heading: Título de ejemplo para tu marca"
            />
            <FontSelectField
              label="Fuente cuerpo"
              name="font_body"
              defaultValue={settings.font_body}
              options={BODY_FONTS}
              helperText="Solo fuentes legibles para textos largos."
              previewText="Vista cuerpo: Este texto simula párrafos y descripciones de productos."
            />
          </div>
        </div>

        <div className="mb-5 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
          <h2 className="text-sm font-semibold text-zinc-800">Colores manuales</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Se mantienen como override cuando el preset es custom o si activas &quot;Forzar colores manuales&quot;.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field
              label="Color primario"
              name="primary_color"
              type="color"
              defaultValue={settings.primary_color}
            />
            <Field
              label="Color acento"
              name="accent_color"
              type="color"
              defaultValue={settings.accent_color}
            />
            <Field
              label="Color fondo"
              name="background_color"
              type="color"
              defaultValue={settings.background_color}
            />
            <Field
              label="Color superficie"
              name="surface_color"
              type="color"
              defaultValue={settings.surface_color}
            />
            <Field
              label="Color texto"
              name="text_color"
              type="color"
              defaultValue={settings.text_color}
            />
            <Field
              label="Color texto secundario"
              name="text_muted_color"
              type="color"
              defaultValue={settings.text_muted_color}
            />
            <Field
              label="Color borde"
              name="border_color"
              type="color"
              defaultValue={settings.border_color}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field
            label="Nombre de la tienda"
            name="store_name"
            defaultValue={settings.store_name}
            placeholder="PonkyBonk"
          />
          <Field
            label="Tagline"
            name="store_tagline"
            defaultValue={settings.store_tagline}
            placeholder="Todo para gatos felices"
          />
          <Field
            label="URL logo horizontal"
            name="logo_url"
            type="url"
            defaultValue={settings.logo_url}
            placeholder="https://..."
          />
          <Field
            label="URL logo cuadrado"
            name="logo_square_url"
            type="url"
            defaultValue={settings.logo_square_url}
            placeholder="https://..."
          />
          <Field
            label="WhatsApp"
            name="support_whatsapp"
            defaultValue={settings.support_whatsapp}
            placeholder="56912345678"
          />
          <Field
            label="Email de contacto"
            name="contact_email"
            type="text"
            defaultValue={settings.contact_email}
            placeholder="contacto@mitienda.cl"
          />
          <label className="flex items-center gap-2 text-sm text-zinc-700 md:col-span-2">
            <input
              type="checkbox"
              name="enable_whatsapp_checkout"
              value="true"
              defaultChecked={settings.enable_whatsapp_checkout}
              className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
            />
            Mostrar &quot;Pedir por WhatsApp&quot; en el carrito (cierra el pedido por chat)
          </label>
          <Field
            label="Instagram URL"
            name="support_instagram"
            type="url"
            defaultValue={settings.support_instagram}
            placeholder="https://instagram.com/..."
          />
          <Field
            label="TikTok URL"
            name="support_tiktok"
            type="text"
            defaultValue={settings.support_tiktok}
            placeholder="@usuario o https://tiktok.com/@usuario"
          />
        </div>

        <HeroBannerSection
          formId="store-settings-form"
          initialDesktopUrl={settings.hero_banner_desktop_url}
          initialMobileUrl={settings.hero_banner_mobile_url}
          initialOverlayMode={settings.hero_overlay_mode}
          initialOverlayOpacity={settings.hero_overlay_opacity}
        />

        <div className="mt-5 flex justify-end">
          <button
            type="submit"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
          >
            Guardar configuración
          </button>
        </div>
      </form>
    </div>
  );
}
