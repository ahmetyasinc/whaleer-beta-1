// app/[locale]/register/layout.js  ← Server Component
import { getI18n } from "@/i18n/server";

// Her locale için sayfa başlığı + açıklama
export async function generateMetadata({ params }) {
  const locale = params?.locale || "en";
  const i18n = await getI18n(locale);
  return {
    title: i18n.t("metadata:register.title"),        // örn: "Whaleer | Kayıt Ol"
    description: i18n.t("metadata:register.description"), // örn: "Whaleer uygulamasına kayıt ol."
  };
}

export default function RegisterLayout({ children }) {
  return <>{children}</>;
}
