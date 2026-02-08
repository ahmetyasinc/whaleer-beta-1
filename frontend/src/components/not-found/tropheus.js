"use client";
import React from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

/**
 * TwoRockAndFish Bileşeni
 * @param {number} offsetX - Yatayda (X ekseni) öteleme miktarı (px cinsinden)
 * @param {number} offsetY - Dikeyde (Y ekseni) öteleme miktarı (px cinsinden, pozitif değer yukarı taşır)
 * @param {number} size - Bileşenin genişliği (px cinsinden, varsayılan 400px)
 */
const TwoRockAndFish = ({
    offsetX = 0,         // Sağa (+) veya Sola (-) öteleme
    offsetY = 0,         // Yukarı (+) veya Aşağı (-) öteleme
    size = 400           // Boyut (Genişlik)
}) => {
    return (
        <div style={{
            position: 'fixed',
            bottom: `${offsetY}px`,          // En alta yapıştır ve dikey öteleme uygula
            left: `calc(50% + ${offsetX}px)`, // Ortala ve yatay öteleme uygula
            transform: 'translateX(-50%)',    // Tam merkezleme için
            width: `${size}px`,              // Boyutu dinamik ayarla
            height: 'auto',
            pointerEvents: 'none',            // Sayfa etkileşimini engellememesi için
            zIndex: 4,                        // Salmon (5) altında kalması için
        }}>
            <DotLottieReact
                src="/not-found/tropheus.lottie"
                loop
                autoplay
            />
        </div>
    );
};

export default TwoRockAndFish;