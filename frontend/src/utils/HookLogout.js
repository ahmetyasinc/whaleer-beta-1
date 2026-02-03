import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Cookies from "js-cookie";
import { supabase } from "@/lib/supabaseClient";

export const useLogout = () => {
    const router = useRouter();
    const auth = useAuth();

    if (!auth) return null;

    const { setIsAuthenticated } = auth;

    const handleLogout = async () => {
        try {
            // Supabase session'ı kapat
            await supabase.auth.signOut();
        } catch (error) {
            console.error("Logout error:", error);
        }

        // Çerezleri temizle
        Cookies.remove("access_token");
        Cookies.remove("refresh_token");
        Cookies.remove("siws_session");

        // Auth durumunu güncelle
        setIsAuthenticated(false);

        // Anasayfaya yönlendir
        router.push("/");
    };

    return handleLogout;
};
