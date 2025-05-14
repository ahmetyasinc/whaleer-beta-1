"use client";
import { createContext, useContext, useEffect, useState } from "react";
import Cookies from "js-cookie"; // js-cookie kütüphanesi ile çerezleri kolayca okuyabiliriz

const AuthContext = createContext({ isAuthenticated: false, setIsAuthenticated: () => {} });

export function AuthProvider({ children }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const token = Cookies.get("access_token"); // Çerezlerden access_token'ı al
        setIsAuthenticated(!!token); // Token varsa true, yoksa false olarak ayarla
    }, []);

    return (
        <AuthContext.Provider value={{ isAuthenticated, setIsAuthenticated }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
