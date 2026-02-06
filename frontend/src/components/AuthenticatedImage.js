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
            <div className={`${className} bg-gray-100 flex items-center justify-center animate-pulse`}>
                ...
            </div>
        );
    }

    return <img src={imageSrc} alt={alt} className={className} {...props} />;
}
