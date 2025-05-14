import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Cookies from "js-cookie";

export const useLogout = () => {
    const router = useRouter();
    const auth = useAuth();

    if (!auth) return null;

    const { setIsAuthenticated } = auth;

    const handleLogout = () => {        
        // Çerezleri temizle
        Cookies.remove("access_token");
        Cookies.remove("refresh_token");

        // Auth durumunu güncelle
        setIsAuthenticated(false);

        // Anasayfaya yönlendir
        router.push("/");
    };

    return handleLogout;
};
