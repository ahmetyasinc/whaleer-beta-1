"use client";

import { useEffect, useState } from "react";
import api from "@/api/axios";

export default function AuthenticatedImage({ src, alt, className, ...props }) {
    const [imageSrc, setImageSrc] = useState(null);
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        let objectUrl = null;

        async function fetchImage() {
            if (!src) return;
            setLoading(true);
            try {
                const response = await api.get(src, { responseType: "blob" });
                if (active) {
                    objectUrl = URL.createObjectURL(response.data);
                    setImageSrc(objectUrl);
                    setLoading(false);
                }
            } catch (err) {
                console.error("Image load error:", err);
                if (active) {
                    setError(true);
                    setLoading(false);
                }
            }
        }

        fetchImage();

        return () => {
            active = false;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [src]);

    if (error) {
        return (
            <div className={`${className} bg-gray-200 flex items-center justify-center text-gray-500 text-xs`}>
                Hata
            </div>
        );
    }

    if (loading) {
        return (
            <div className={`${className} bg-zinc-900 flex items-center justify-center`}>
                <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            </div>
        );
    }

    return <img src={imageSrc} alt={alt} className={className} {...props} />;
}
