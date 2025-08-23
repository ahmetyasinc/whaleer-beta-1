import "@/styles/globals.css";
import { AuthProvider } from "@/context/AuthContext";
import NetworkStatus from "@/components/NetworkStatus";
import "react-toastify/dist/ReactToastify.css";
import { Work_Sans } from "next/font/google";   // ✅ Work Sans      Bunlar da güzel denenir   --->   (Nunito,Plus Jakarta Sans, DM Sans) 
import "@/i18n";

const mainFont = Work_Sans({
  subsets: ["latin-ext"],   // TR için
  display: "swap",
  weight: "variable",       // Work Sans değişken (100–900)
  variable: "--font-main",
});


// ✅ Language initializer

export default async function RootLayout(props) {
  const params = await props.params;

  const {
    children
  } = props;

  const locale = (await params?.locale) || 'en';

  return (
    <html lang={locale}>
      <body className={`${mainFont.variable} font-sans`}>
        <NetworkStatus />
        <AuthProvider>
          <main className="min-h-screen">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
