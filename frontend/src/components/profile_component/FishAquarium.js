"use client";
import React, { useEffect, useRef } from 'react';
import Matter from 'matter-js';

const FishAquarium = ({ count = 1 }) => {
    const sceneRef = useRef(null);
    const engineRef = useRef(null);
    const mouseRef = useRef({ x: -1000, y: -1000 });

    useEffect(() => {
        const { Engine, Render, Runner, Bodies, Body, Events, Composite } = Matter;

        const engine = Engine.create({
            gravity: { x: 0, y: 0 },
            enableSleeping: false
        });
        engineRef.current = engine;

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

        // Balıkları ve durumlarını tutan diziler
        const fishes = [];
        const states = [];

        // Balıkları oluştur - her biri farklı pozisyonda
        for (let i = 0; i < count; i++) {
            const spawnX = 100 + Math.random() * (width - 200);
            const spawnY = 100 + Math.random() * (height - 200);

            // Balık görselleri ve boyutları - HER BALIK İÇİN AYARLANABILIR
            const fishConfig = [
                { texture: '/not-found/fish1.svg', scale: 0.22 },
                { texture: '/not-found/fish2.svg', scale: 0.34 },
                { texture: '/not-found/fish3.svg', scale: 0.52 },
                { texture: '/not-found/fish4.svg', scale: 0.05 }
            ];
            const randomFish = fishConfig[Math.floor(Math.random() * fishConfig.length)];

            const fish = Bodies.rectangle(spawnX, spawnY, 90, 45, {
                chamfer: { radius: 18 },
                frictionAir: 0.08,
                restitution: 0.5,
                collisionFilter: {
                    group: -1,
                    category: 0x0002,
                    mask: 0x0000
                },
                render: {
                    sprite: {
                        texture: randomFish.texture,
                        xScale: randomFish.scale,
                        yScale: randomFish.scale
                    }
                }
            });

            fishes.push(fish);
            Composite.add(engine.world, fish);

            // Her balık için bağımsız durum
            states.push({
                targetAngle: Math.random() * Math.PI * 2,
                speed: 1 + Math.random() * 2,
                nextDirectionChange: 150 + Math.random() * 350,
                nextSpeedChange: 50 + Math.random() * 100,
                frameCount: Math.floor(Math.random() * 100) // Farklı zamanlarda yön değiştirsinler
            });
        }

        // İmleç takibi
        const handleMouseMove = (e) => {
            mouseRef.current = { x: e.clientX, y: e.clientY };
        };
        window.addEventListener('mousemove', handleMouseMove);

        // Merkeze açı hesaplama fonksiyonu
        const getAngleToCenter = (pos) => {
            const centerX = width / 2;
            const centerY = height / 2;
            return Math.atan2(centerY - pos.y, centerX - pos.x);
        };

        // Her balık için davranış motoru
        Events.on(engine, 'beforeUpdate', () => {
            const margin = 80;
            const hardMargin = 30;
            const mousePos = mouseRef.current;

            for (let i = 0; i < fishes.length; i++) {
                const fish = fishes[i];
                const state = states[i];
                const pos = fish.position;

                state.frameCount++;

                // İmleçten kaçış kontrolü
                const distToMouse = Math.sqrt(
                    Math.pow(pos.x - mousePos.x, 2) + Math.pow(pos.y - mousePos.y, 2)
                );

                let targetAngle = state.targetAngle;
                let speed = state.speed;
                let rotationSpeed = 0.1;

                // 1. İmleçten kaçış
                if (distToMouse < 150) {
                    targetAngle = Math.atan2(pos.y - mousePos.y, pos.x - mousePos.x);
                    speed = 4 + Math.random() * 2;
                    rotationSpeed = 0.25;
                }
                // 2. Duvar kontrolü
                else {
                    let wallAvoidance = { x: 0, y: 0 };

                    if (pos.x < margin) wallAvoidance.x += (margin - pos.x) / margin;
                    if (pos.x > width - margin) wallAvoidance.x -= (pos.x - (width - margin)) / margin;
                    if (pos.y < margin) wallAvoidance.y += (margin - pos.y) / margin;
                    if (pos.y > height - margin) wallAvoidance.y -= (pos.y - (height - margin)) / margin;

                    if (Math.abs(wallAvoidance.x) > 0.1 || Math.abs(wallAvoidance.y) > 0.1) {
                        targetAngle = Math.atan2(wallAvoidance.y, wallAvoidance.x);
                        speed = 2 + Math.random();
                        rotationSpeed = 0.2;
                    }
                    else {
                        // Rastgele yön değiştirme
                        if (state.frameCount >= state.nextDirectionChange) {
                            state.targetAngle = Math.random() * Math.PI * 2;
                            state.nextDirectionChange = 150 + Math.random() * 350;
                            state.frameCount = 0;
                        }

                        // Rastgele hız değiştirme
                        if (state.frameCount >= state.nextSpeedChange) {
                            state.speed = 0.8 + Math.random() * 2.5;
                            state.nextSpeedChange = 30 + Math.random() * 100;
                        }

                        targetAngle = state.targetAngle;
                        speed = state.speed;
                    }
                }

                // Kesin sınır kontrolü
                let newX = pos.x;
                let newY = pos.y;

                if (pos.x < hardMargin) {
                    newX = hardMargin + 10;
                    targetAngle = Math.random() * Math.PI * 0.8 - Math.PI * 0.4;
                }
                if (pos.x > width - hardMargin) {
                    newX = width - hardMargin - 10;
                    targetAngle = Math.PI + (Math.random() - 0.5) * Math.PI * 0.8;
                }
                if (pos.y < hardMargin) {
                    newY = hardMargin + 10;
                    targetAngle = Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.8;
                }
                if (pos.y > height - hardMargin) {
                    newY = height - hardMargin - 10;
                    targetAngle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.8;
                }

                if (newX !== pos.x || newY !== pos.y) {
                    Body.setPosition(fish, { x: newX, y: newY });
                    state.targetAngle = targetAngle;
                    speed = 2;
                }

                // Köşe tespiti
                const inCorner = (pos.x < margin * 1.5 || pos.x > width - margin * 1.5) &&
                    (pos.y < margin * 1.5 || pos.y > height - margin * 1.5);
                if (inCorner) {
                    targetAngle = getAngleToCenter(pos);
                    speed = 3;
                    rotationSpeed = 0.3;
                }

                // Balığı döndür
                const fishAngle = targetAngle + Math.PI;
                let angleDiff = fishAngle - fish.angle;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                Body.setAngularVelocity(fish, angleDiff * rotationSpeed);

                // İleri hareket
                const moveAngle = fish.angle + Math.PI;
                Body.setVelocity(fish, {
                    x: Math.cos(moveAngle) * speed,
                    y: Math.sin(moveAngle) * speed
                });
            }
        });

        Render.run(render);
        const runner = Runner.create();
        Runner.run(runner, engine);

        const handleResize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            render.canvas.width = width;
            render.canvas.height = height;
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('mousemove', handleMouseMove);
            Render.stop(render);
            Runner.stop(runner);
            Engine.clear(engine);
            render.canvas.remove();
        };
    }, [count]);

    return (
        <div
            ref={sceneRef}
            style={{
                width: '100vw',
                height: '100vh',
                position: 'fixed',
                top: 0,
                left: 0,
                zIndex: 0,
                pointerEvents: 'none'
            }}
        />
    );
};

export default FishAquarium;