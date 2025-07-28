import { getI18n } from "@/i18n/server"; // Eğer SSR destekliyorsan
import FeaturesTabs from "@/components/home_component/FeaturesTabs";
import Footer from "@/components/home_component/Footer";
import About from "@/components/home_component/About";
import Header from "@/components/home_component/Header";
import HomeClientComponent from "@/components/HomeClientComponent";

export async function generateMetadata({ params }) {
  const locale = params.locale;
  const i18n = await getI18n(locale); // SSR çevirici
  return {
    title: i18n.t("home:title"),
    description: i18n.t("home:description"),
  };
}

export default function Home() {
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
