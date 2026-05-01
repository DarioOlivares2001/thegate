import { PromoTickerBar } from "@/components/store/PromoTickerBar";
import { Navbar } from "@/components/store/Navbar";
import { Footer } from "@/components/store/Footer";
import { CartDrawer } from "@/components/store/CartDrawer";
import { Toaster } from "@/components/ui/Toast";
import { getStoreSettings } from "@/lib/store-settings/getStoreSettings";

export const dynamic = "force-dynamic";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const settings = await getStoreSettings();

  return (
    <>
      <PromoTickerBar />
      <Navbar settings={settings} />
      {children}
      <Footer settings={settings} />
      <CartDrawer
        enableWhatsappCheckout={settings.enable_whatsapp_checkout}
        whatsappPhone={settings.support_whatsapp}
      />
      <Toaster />
    </>
  );
}
