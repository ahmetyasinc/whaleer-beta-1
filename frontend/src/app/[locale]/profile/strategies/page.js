import IndicatorHeader from "@/components/profile_component/(indicator)/indicatorHeader";
import TabbedGridLayout from "@/components/profile_component/(indicator)/tabbedGridLayout";
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { getI18n } from "@/i18n/server";


export async function generateMetadata(props) {
  const params = await props.params;
  const i18n = await getI18n(params.locale);
  return {
    title: i18n.t("metadata:strategies.title"),
    description: i18n.t("metadata:strategies.description"),
  };
}

export default async function Indicators(props) {
    const params = await props.params;
    const locale = params.locale;
    return (
        <div>
            <IndicatorHeader locale={locale} />
            <div className="mt-[56px]"><TabbedGridLayout className="flex justify-center items-center min-h-screen"/></div>

        </div>
    );
}
