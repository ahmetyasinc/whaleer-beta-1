// app/[locale]/layout.js  ← Server Component
import "@/styles/globals.css";
import NetworkStatus from "@/components/NetworkStatus";
import "react-toastify/dist/ReactToastify.css";
import "@/i18n"; // i18n init (tek sefer)
import { getI18n } from "@/i18n/server";
import ClientProviders from "./client-providers";

// ❌ Google Fonts kaldırıldı
// import { Work_Sans } from "next/font/google";

export async function generateMetadata(props) {
  const params = await props.params;
  const locale = params?.locale ?? "en";
  const i18n = await getI18n(locale);
  return {
    title: i18n.t("metadata:root.title", "Whaleer"),
    description: i18n.t("metadata:root.description", "Algorithmic trading platform."),
  };
}

export default async function RootLayout(props) {
  const params = await props.params;
  const { children } = props;

  const locale = params?.locale ?? "en";

  return (
    <html lang={locale}>
      {/* ✅ Artık globals.css’te tanımladığın font kullanılacak */}
      <body className="font-sans">
        <NetworkStatus />
        <ClientProviders locale={locale}>
          <main className="min-h-screen">{children}</main>
        </ClientProviders>
      </body>
    </html>
  );
}
