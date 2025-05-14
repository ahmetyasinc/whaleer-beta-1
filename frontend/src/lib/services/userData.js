/*"use client"; // Bu hook'un istemci tarafında çalışması gerektiğini belirtir

import { useEffect, useState } from "react";
import { fetchWithAuth } from "./api";

const useUser = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function fetchUserData() {
            try {
                const data = await fetchWithAuth("/users/me");
                setUser(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchUserData();
    }, []);

    return { user, loading, error };
};

export default useUser;*/
