"use client";
import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

const Salmon = ({
    baseSpeed = 2.5,          // Temel yatay hız
    amplitude = 60,           // Sinüs dalgasının yüksekliği (yukarı-aşağı sapma)
    frequency = 0.005,        // Sinüs dalgasının sıklığı (ne kadar geniş bir dalga)
    speedVariation = 0.8      // Hız değişim şiddeti
}) => {
    const [pos, setPos] = useState({ x: -200, y: 300, angle: 0 });
    const engineRef = useRef(Matter.Engine.create({ gravity: { x: 0, y: 0 } }));

    useEffect(() => {
        const engine = engineRef.current;
        let width = window.innerWidth;
        let height = window.innerHeight;

        // Başlangıç değerleri
        let x = -200;
        let baseY = height / 2;
        let frame = 0;

        const updateMovement = () => {
            frame++;

            // 1. Yatay Hız Değişimi: Sinüs dalgasına göre hızı modüle ediyoruz
            // Balık dalganın tepelerinde ve diplerinde biraz yavaşlayıp, geçişlerde hızlanacak
            const currentSpeed = baseSpeed + (Math.sin(frame * frequency * 2) * speedVariation);

            const prevX = x;
            const prevY = baseY + Math.sin(frame * frequency) * amplitude;

            x += currentSpeed;
            const nextY = baseY + Math.sin((frame + 1) * frequency) * amplitude;

            // 2. Yön Açısı Hesaplama (atan2)
            // Bir sonraki konum ile şu anki konum arasındaki farktan açıyı buluyoruz
            const dx = currentSpeed;
            const dy = nextY - prevY;
            const targetAngle = Math.atan2(dy, dx);

            // Ekranın dışına çıkınca sıfırla
            if (x > width + 300) {
                x = -300;
                baseY = Math.random() * (height - 200) + 100; // Rastgele yeni bir dikey koridor
            }

            setPos({
                x: x,
                y: prevY,
                angle: targetAngle
            });
        };

        // Matter.js update döngüsüne bağla (akıcılık için)
        Matter.Events.on(engine, 'beforeUpdate', updateMovement);
        const runner = Matter.Runner.create();
        Matter.Runner.run(runner, engine);

        const handleResize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            Matter.Events.off(engine, 'beforeUpdate', updateMovement);
            Matter.Runner.stop(runner);
            Matter.Engine.clear(engine);
        };
    }, [baseSpeed, amplitude, frequency, speedVariation]);

    return (
        <div style={{
            position: 'fixed',
            left: pos.x,
            top: pos.y,
            width: '240px', // Somon boyutu
            height: '120px',
            transform: `translate(-50%, -50%) rotate(${pos.angle}rad)`,
            pointerEvents: 'none',
            zIndex: 5,
            transition: 'none' // React state güncellemeleri arasında yumuşatma istemiyoruz, motor yapıyor
        }}>
            <DotLottieReact
                src="/not-found/salmon.lottie"
                loop
                autoplay
            />
        </div>
    );
};

export default Salmon;