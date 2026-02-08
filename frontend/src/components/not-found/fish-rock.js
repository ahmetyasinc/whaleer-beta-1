"use client";
import React from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

/**
 * TwoRockAndFish Bileşeni
 * @param {number} offsetX - Yatayda (X ekseni) öteleme miktarı (px cinsinden)
 * @param {number} offsetY - Dikeyde (Y ekseni) öteleme miktarı (px cinsinden, pozitif değer yukarı taşır)
 * @param {number} size - Bileşenin genişliği (px cinsinden, varsayılan 400px)
 */
const FishRock = ({
    offsetX = 0,         // Sağa (+) veya Sola (-) öteleme
    offsetY = 0,         // Yukarı (+) veya Aşağı (-) öteleme
    size = 400,          // Boyut (Genişlik)
    zIndex = 4           // Z-index değeri
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
            zIndex: zIndex,                   // Dinamik z-index
        }}>
            <DotLottieReact
                src="/not-found/orangeFish.lottie"
                loop
                autoplay
            />
        </div>
    );
};

export default FishRock;