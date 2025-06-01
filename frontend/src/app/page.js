import FeaturesTabs from "@/components/home_component/FeaturesTabs";
import Footer from "@/components/home_component/Footer";
import About from "@/components/home_component/About";
import Header from "@/components/home_component/Header";
import HomeClientComponent from "@/components/HomeClientComponent"; // ✅ Doğru


export const metadata = {
    title: "Whaleer",
    description: "whaleer ile kripto stratejileri oluştur, test et ve uygula.",
  };

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


