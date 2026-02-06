"use client";
import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

const JellyfishAquarium = ({
    count = 1,
    // Denizanası Ayarları
    jellySpeedMin = 0.1,
    jellySpeedMax = 0.3,
    accelerationDuration = 2000, // Hızlanma/Yavaşlama süresi (ms)
    constantSpeedDuration = 2000 // Maksimum hızda gitme süresi (ms)
}) => {
    const sceneRef = useRef(null);
    const [jellyPos, setJellyPos] = useState({ x: 50, y: 110 }); // Yüzde olarak
    const [currentSpeed, setCurrentSpeed] = useState(jellySpeedMin);

    useEffect(() => {
        const { Engine, Render, Runner, Bodies, Body, Events, Composite } = Matter;

        const engine = Engine.create({
            gravity: { x: 0, y: 0 },
            enableSleeping: false
        });

        let width = window.innerWidth;
        let height = window.innerHeight;

        const render = Render.create({
            element: sceneRef.current,
            engine: engine,
            options: {
                width,
                height,
                wireframes: false,
                background: 'transparent',
                pixelRatio: window.devicePixelRatio
            }
        });

        // --- Balıklar (Mevcut mantığın) ---
        const fishes = [];
        const states = [];
        for (let i = 0; i < count; i++) {
            const fish = Bodies.rectangle(Math.random() * width, Math.random() * height, 90, 45, {
                chamfer: { radius: 18 },
                frictionAir: 0.08,
                collisionFilter: { mask: 0x0000 },
                render: { sprite: { texture: '/not-found/fish1.svg', xScale: 0.2, yScale: 0.2 } }
            });
            fishes.push(fish);
            states.push({
                targetAngle: Math.random() * Math.PI * 2,
                speed: 1 + Math.random() * 2,
                frameCount: 0,
                nextDirectionChange: 150
            });
            Composite.add(engine.world, fish);
        }

        // --- Denizanası Hareket Mantığı ---
        let lastTime = 0;
        let phase = 'accelerating'; // accelerating, constant, decelerating
        let phaseStartTime = Date.now();
        let yPos = height; // Ekranın alt yarısından başlasın - hemen görünsün
        let xPos = Math.random() > 0.5 ? width * 0.1 + Math.random() * width * 0.15 : width * 0.75 + Math.random() * width * 0.15; // Sol veya sağ kenarda başlasın

        const updateJelly = () => {
            const now = Date.now();
            const elapsed = now - phaseStartTime;

            let speed = jellySpeedMin;

            if (phase === 'accelerating') {
                const progress = Math.min(elapsed / accelerationDuration, 1);
                speed = jellySpeedMin + (jellySpeedMax - jellySpeedMin) * progress;
                if (progress >= 1) {
                    phase = 'constant';
                    phaseStartTime = now;
                }
            } else if (phase === 'constant') {
                speed = jellySpeedMax;
                if (elapsed >= constantSpeedDuration) {
                    phase = 'decelerating';
                    phaseStartTime = now;
                }
            } else if (phase === 'decelerating') {
                const progress = Math.min(elapsed / accelerationDuration, 1);
                speed = jellySpeedMax - (jellySpeedMax - jellySpeedMin) * progress;
                if (progress >= 1) {
                    phase = 'accelerating';
                    phaseStartTime = now;
                }
            }

            yPos -= speed;

            // Ekrandan çıkınca başa dön
            if (yPos < -150) {
                yPos = height + 150;
                // Sol veya sağ kenardan rastgele pozisyon
                xPos = Math.random() > 0.5
                    ? width * 0.05 + Math.random() * width * 0.15  // Sol kenar (5%-20%)
                    : width * 0.80 + Math.random() * width * 0.15; // Sağ kenar (80%-95%)
            }

            setJellyPos({ x: (xPos / width) * 100, y: (yPos / height) * 100 });
        };

        Events.on(engine, 'beforeUpdate', () => {
            updateJelly();
            // Balıkların yön ve hareket kodları buraya gelecek (mevcut kodun)
            fishes.forEach((fish, i) => {
                const moveAngle = fish.angle + Math.PI;
                Body.setVelocity(fish, {
                    x: Math.cos(moveAngle) * states[i].speed,
                    y: Math.sin(moveAngle) * states[i].speed
                });
            });
        });

        Render.run(render);
        const runner = Runner.create();
        Runner.run(runner, engine);

        return () => {
            Render.stop(render);
            Runner.stop(runner);
            Engine.clear(engine);
            render.canvas.remove();
        };
    }, [count, jellySpeedMax, jellySpeedMin, accelerationDuration, constantSpeedDuration]);

    return (
        <>
            <div ref={sceneRef} style={{ width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0, zIndex: 0, pointerEvents: 'none' }} />

            {/* Lottie Denizanası Katmanı */}
            <div style={{
                position: 'fixed',
                left: `${jellyPos.x}%`,
                top: `${jellyPos.y}%`,
                width: '55px',
                height: '55px',
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
                zIndex: 1,
                filter: 'hue-rotate(270deg) saturate(1.5)', // Mor renk filtresi
                transition: 'none'
            }}>
                <DotLottieReact
                    src="/not-found/Jellyfish.lottie"
                    loop
                    autoplay
                />
            </div>
        </>
    );
};

export default JellyfishAquarium;