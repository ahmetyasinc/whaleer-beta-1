import { getI18n } from "@/i18n/server";
import FeaturesTabs from "@/components/home_component/FeaturesTabs";
import Footer from "@/components/home_component/Footer";
import About from "@/components/home_component/About";
import Header from "@/components/home_component/Header";
import HomeClientComponent from "@/components/HomeClientComponent";

export async function generateMetadata(props) {
  const params = await props.params;
  const resolvedParams = typeof params?.then === "function" ? await params : params;
  const locale = resolvedParams.locale;
  const i18n = await getI18n(locale);
  return {
    title: i18n.t("metadata:home.title"),
    description: i18n.t("metadata:home.description"),
  };
}

export default async function Home(props) {
  return (
    <main>
      <Header pageClass={0} />
      <HomeClientComponent />
      <About />
      <FeaturesTabs />
      <Footer />
    </main>
  );
}
