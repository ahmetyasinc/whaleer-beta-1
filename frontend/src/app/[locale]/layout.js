import { Geist, Geist_Mono } from "next/font/google";
import "@/styles/globals.css";
import { AuthProvider } from "@/context/AuthContext";
import NetworkStatus from "@/components/NetworkStatus";
import "react-toastify/dist/ReactToastify.css";

import "@/styles/vendor/bootstrap/css/bootstrap.min.css";
import "@/styles/vendor/bootstrap-icons/bootstrap-icons.css";
import "@/styles/vendor/glightbox/css/glightbox.min.css";
import "@/styles/vendor/swiper/swiper-bundle.min.css";
import "@/styles/css/main.css";
import Script from "next/script";
import "@/styles/css/scroll.css";

// ✅ i18n import
import "@/i18n";

// ✅ Language initializer

export default async function RootLayout(props) {
  const params = await props.params;

  const {
    children
  } = props;

  const locale = (await params?.locale) || 'en';

  return (
    <html lang={locale}>
      <body>
        <NetworkStatus />
        <AuthProvider>
          <main className="min-h-screen">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
