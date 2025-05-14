import React from 'react';
import Header from "@/components/home_component/Header";
import Footer from "@/components/home_component/Footer";

export default function Layout({ children }) {
    return (
        <div>
            <main className="min-h-screen">
            <Header pageClass={0} />
                {children}
            </main>
            <Footer />
        </div>
    );
}

