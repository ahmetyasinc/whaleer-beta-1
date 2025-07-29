import { getI18n } from "@/i18n/server";

export async function generateMetadata(props) {
  const params = await props.params;
  const i18n = await getI18n(params.locale);
  return {
    title: i18n.t("metadata:login.title"),
    description: i18n.t("metadata:login.description"),
  };
}

export default function LoginLayout({ children }) {
  return <>{children}</>;
}
