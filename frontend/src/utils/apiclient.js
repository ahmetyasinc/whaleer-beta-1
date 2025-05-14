import axios from "axios";

const apiClient = axios.create({
    baseURL: "http://127.0.0.1:8000", // FastAPI backend URL
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true,  // Çerezleri ve kimlik doğrulama bilgilerini kullan
});

// Refresh token ile yeni access token alma fonksiyonu
const refreshAccessToken = async () => {
    try {
        const refreshToken = sessionStorage.getItem("refresh_token");
        if (!refreshToken) {
            console.error("Refresh token bulunamadı!");
            return null;
        }

        const response = await axios.post("http://127.0.0.1:8000/api/refresh-token/", {
            refresh_token: refreshToken // ✅ JSON body içinde refresh token gönderiliyor
        });

        if (response.data?.access_token) {
            sessionStorage.setItem("access_token", response.data.access_token); // Yeni access token'ı kaydet
            return response.data.access_token;
        }
    } catch (error) {
        console.error("Refresh token ile access token yenileme başarısız:", error);
        return null;
    }
};


// Axios interceptor: Eğer access token süresi dolduysa refresh token ile yenileyip isteği tekrar gönder
apiClient.interceptors.response.use(
    response => response, // Başarılı yanıtları direkt döndür
    async (error) => {
        if (error.response?.status === 401) { // Eğer access token süresi dolmuşsa
            const newAccessToken = await refreshAccessToken();
            if (newAccessToken) {
                // Yeni access token'ı isteğe ekleyerek tekrar gönder
                error.config.headers["Authorization"] = `Bearer ${newAccessToken}`;
                return apiClient.request(error.config);
            }
        }
        return Promise.reject(error);
    }
);

export default apiClient;
