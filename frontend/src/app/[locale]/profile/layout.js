import ClientLayoutWrapper from './client-layout-wrapper';
import { getI18n } from "@/i18n/server";


export async function generateMetadata(props) {
  const params = await props.params;
  const i18n = await getI18n(params.locale);
  return {
    title: i18n.t("metadata:profile.title"),
    description: i18n.t("metadata:profile.description"),
  };
}

export default async function ProfileLayout(props) {
  const params = await props.params;

  const {
    children
  } = props;

  const locale = params.locale;

  return <ClientLayoutWrapper locale={locale}>
    {children}
    </ClientLayoutWrapper>;
}