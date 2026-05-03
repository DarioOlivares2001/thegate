import { Poppins } from "next/font/google";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Toaster } from "@/components/ui/Toast";
import { getStoreSettings } from "@/lib/store-settings/getStoreSettings";

const poppinsAdmin = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const settings = await getStoreSettings();

  return (
    <div className={`min-h-screen bg-zinc-100 ${poppinsAdmin.className}`}>
      <AdminSidebar settings={settings} />
      <div className="lg:pl-64">
        <main className="min-h-screen p-6 pt-20 lg:pt-6">
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  );
}
