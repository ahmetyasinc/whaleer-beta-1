import IndicatorHeader from "@/components/profile_component/(indicator)/indicatorHeader";
import TabbedGridLayout from "@/components/profile_component/(indicator)/tabbedGridLayout";
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

export const metadata = {
    title: "Göstergeler",
    description: "Göstergeler sayfası.",
};

export default function Indicators() {

    return (
        <div>
            {/* Sayfa Üstündeki Header */}
            <IndicatorHeader />
            <div className="mt-[56px]"><TabbedGridLayout className="flex justify-center items-center min-h-screen"/></div>

        </div>
    );
}
