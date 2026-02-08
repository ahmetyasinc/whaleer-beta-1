"use client";
import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

const LionFish = ({
    baseSpeed = 0.7,          // Daha yavaş hareket
    amplitude = 40,
    frequency = 0.005,
    speedVariation = 0.2      // Daha az hız değişimi
}) => {
    // Başlangıç x konumunu ekranın sağ kenarına yakın, y'yi alta yakın yapıyoruz
    const [pos, setPos] = useState({ x: 1400, y: 600, angle: 0 });
    const engineRef = useRef(Matter.Engine.create({ gravity: { x: 0, y: 0 } }));

    useEffect(() => {
        const engine = engineRef.current;
        let width = window.innerWidth;
        let height = window.innerHeight;

        // Balığın sadece alt yarıda gezmesi için y ekseni sınırı
        const getBottomHalfY = () => height / 2 + Math.random() * (height / 2 - 100);

        // Başlangıç değerleri - ekranın sağından hemen görünür şekilde başla
        let x = width + 50; // Sağdan başla ama çok uzakta değil
        let baseY = getBottomHalfY();
        let frame = 0;

        const updateMovement = () => {
            frame++;

            // Hız hesaplama
            const currentSpeed = baseSpeed + (Math.sin(frame * frequency * 2) * speedVariation);

            const prevX = x;
            const prevY = baseY + Math.sin(frame * frequency) * amplitude;

            // SAĞDAN SOLA gitmesi için x değerini çıkarıyoruz
            x -= currentSpeed;
            const nextY = baseY + Math.sin((frame + 1) * frequency) * amplitude;

            // Yön Açısı Hesaplama
            // dx artık negatif olduğu için (sola gidiş), atan2 otomatik olarak balığı sola döndürecektir
            const dx = -currentSpeed;
            const dy = nextY - prevY;
            const targetAngle = Math.atan2(dy, dx);

            // Ekranın SOLUNDAN çıkınca SAĞDAN tekrar başlat
            if (x < -300) {
                x = width + 300;
                baseY = getBottomHalfY(); // Yine sadece alt yarıda bir yer seç
            }

            setPos({
                x: x,
                y: prevY,
                angle: targetAngle
            });
        };

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
            width: '100px',
            height: '50px',
            transform: `translate(-50%, -50%) rotate(${pos.angle}rad) scaleX(-1) scaleY(-1)`,
            pointerEvents: 'none',
            zIndex: 4,
            transition: 'none'
        }}>
            <DotLottieReact
                src="/not-found/lionFish.lottie"
                loop
                autoplay
            />
        </div>
    );
};

export default LionFish;