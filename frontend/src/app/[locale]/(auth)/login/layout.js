import { getI18n } from "@/i18n/server";

export async function generateMetadata({ params }) {
  const i18n = await getI18n(params.locale);
  return {
    title: i18n.t("auth/login:meta.title"),
    description: i18n.t("auth/login:meta.description"),
  };
}

export default function LoginLayout({ children }) {
  return <>{children}</>;
}
