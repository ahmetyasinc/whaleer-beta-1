/*import Cookies from "js-cookie";

const API_BASE_URL = "http://127.0.0.1:8000"; // Backend adresin

export const fetchWithAuth = async (endpoint, options = {}) => {
    const token = Cookies.get("access_token");

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            ...options.headers,
        },
        cache: "no-store", // Her istekte yeni veri çeksin
    });

    if (!res.ok) {
        throw new Error(`API Hatası: ${res.status}`);
    }

    return res.json();
};*/
