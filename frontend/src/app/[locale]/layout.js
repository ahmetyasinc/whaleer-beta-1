// app/layout.js  ← DİKKAT: "use client" YOK
import "@/styles/globals.css";
import NetworkStatus from "@/components/NetworkStatus";
import "react-toastify/dist/ReactToastify.css";
import { Work_Sans } from "next/font/google";
import "@/i18n";

import ClientProviders from "./client-providers"; // ↓ client sarmalayıcı

const mainFont = Work_Sans({
  subsets: ["latin-ext"],
  display: "swap",
  weight: "variable",
  variable: "--font-main",
});

export default function RootLayout({ children, params }) {
  const locale = params?.locale || "en"; // use(props.params) yerine doğrudan params

  return (
    <html lang={locale}>
      <body className={`${mainFont.variable} font-sans`}>
        {/* Bu component client olsa bile server layout içinde kullanılabilir */}
        <NetworkStatus />

        {/* Tüm client context/provideler client wrapper içinde */}
        <ClientProviders>
          <main className="min-h-screen">{children}</main>
        </ClientProviders>
      </body>
    </html>
  );
}
