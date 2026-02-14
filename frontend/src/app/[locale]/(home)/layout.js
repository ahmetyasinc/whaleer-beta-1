import React from 'react';
import Header from "@/components/home_component/Header";
import Footer from "@/components/home_component/Footer";
import LanguageSwitcher from "@/components/home_component/LanguageSwitcher";

export default function Layout({ children }) {
    return (
        <div>
            <LanguageSwitcher />
            <main className="min-h-screen">
                <Header pageClass={0} />
                {children}
            </main>
            <Footer />
        </div>
    );
}

