// Server Component
import ClientLayoutWrapper from "./client-layout-wrapper";
import { getI18n } from "@/i18n/server";

// ✅ Doğru imza: { params } ile al, await YOK
export async function generateMetadata({ params }) {
  const locale = params?.locale ?? "en";
  const i18n = await getI18n(locale);
  return {
    title: i18n.t("metadata:profile.title"),
    description: i18n.t("metadata:profile.description"),
  };
}

// ✅ Layout'ı async yapmana gerek yok (yaparsan da params Promise değildir)
export default function ProfileLayout({ children, params }) {
  const locale = params?.locale ?? "en";
  return <ClientLayoutWrapper locale={locale}>{children}</ClientLayoutWrapper>;
}
