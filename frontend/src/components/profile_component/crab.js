"use client";

import React, { useEffect, useRef } from 'react';
import Matter from 'matter-js';

const Crab = () => {
    const sceneRef = useRef(null);

    useEffect(() => {
        const { Engine, Render, Runner, Bodies, Body, Events, Composite } = Matter;

        const engine = Engine.create({ gravity: { x: 0, y: 0 } });
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

        // --- AYARLAR ---
        const HIDDEN_Y = height + 100;   // Ekranın altı (Görünmez)
        const VISIBLE_Y = height - 10;  // Ekranın içi (Görünür olduğu seviye)
        const SPEED_X = 1.5;               // Yatay yürüme hızı
        const LERP_SPEED_UP = 0.1;       // Yukarı çıkış hızı (Normal)
        const LERP_SPEED_DOWN = 0.005;   // Aşağı iniş hızı (Çok yavaş/yumuşak)
        const TURN_SPEED = 0.02;         // Hızlanma/Yavaşlama yumuşaklığı

        // Tek bir yengeç oluşturuyoruz
        const crab = Bodies.rectangle(width / 2, HIDDEN_Y, 180, 135, {
            frictionAir: 0,
            collisionFilter: { mask: 0x0000 }, // Çarpışma kapalı
            render: {
                sprite: {
                    texture: '/svg/crab.svg',
                    xScale: 0.75,
                    yScale: 0.75
                }
            }
        });

        // Yengeç özel verileri
        crab.customData = {
            direction: 1,           // 1: Sağ, -1: Sol
            targetY: HIDDEN_Y,      // Hedeflenen dikey pozisyon
            state: 'hidden',        // 'hidden' veya 'visible'
            currentSpeedX: SPEED_X, // Mevcut yatay hız
            nextChangeTime: Date.now() + Math.random() * 2000 + 1000, // İlk görünürlük değişim zamanı
            nextDirectionChangeTime: Date.now() + Math.random() * 10000 + 5000 // İlk yön değişim zamanı
        };

        Composite.add(engine.world, crab);

        Events.on(engine, 'beforeUpdate', () => {
            const data = crab.customData;
            const pos = crab.position;

            // 1. RASTGELE DURUM DEĞİŞİMİ (Yukarı Çık / Aşağı İn)
            if (Date.now() > data.nextChangeTime) {
                if (data.state === 'hidden') {
                    data.state = 'visible';
                    data.targetY = VISIBLE_Y;
                    data.nextChangeTime = Date.now() + Math.random() * 3000 + 2000; // 2-5 sn yukarıda kal
                } else {
                    data.state = 'hidden';
                    data.targetY = HIDDEN_Y;
                    data.nextChangeTime = Date.now() + Math.random() * 4000 + 2000; // 2-6 sn aşağıda bekle
                }
            }

            // 2. YATAY HAREKET (Sağ-Sol)
            // Hedef hıza doğru yumuşak geçiş (Hızlanma/Yavaşlama)
            const targetSpeed = SPEED_X * data.direction;
            data.currentSpeedX = data.currentSpeedX + (targetSpeed - data.currentSpeedX) * TURN_SPEED;

            let newX = pos.x + data.currentSpeedX;

            // Kenar Kontrolü
            // 2.a RASTGELE YÖN DEĞİŞİMİ
            if (Date.now() > data.nextDirectionChangeTime) {
                data.direction *= -1; // Yönü tersine çevir
                data.nextDirectionChangeTime = Date.now() + Math.random() * 15000 + 10000; // 10-25 sn sonra tekrar dene
            }

            // 2.b WRAP-AROUND (Ekranın bir ucundan çıkıp diğerinden girme)
            if (newX > width + 100) {
                newX = -100;
                // Işınlanınca Matter.js fizik motorunun "hızlı hareket" algılamasını engellemek için:
                Body.setPosition(crab, { x: newX, y: pos.y });
            } else if (newX < -100) {
                newX = width + 100;
                Body.setPosition(crab, { x: newX, y: pos.y });
            }

            // 3. DİKEY HAREKET (Yumuşak Geçiş - Lerp)
            // Hedef Y, Mevcut Y'den küçükse YUKARI çıkıyordur -> Hızlı
            // Hedef Y, Mevcut Y'den büyükse AŞAĞI iniyordur -> Yavaş
            const currentLerp = (data.targetY < pos.y) ? LERP_SPEED_UP : LERP_SPEED_DOWN;
            let newY = pos.y + (data.targetY - pos.y) * currentLerp;

            // Pozisyonu Güncelle
            Body.setPosition(crab, { x: newX, y: newY });

            // 4. SPRITE YÖNÜNÜ AYARLA (Yürüdüğü yöne bakması için)
            // Hız belirgin ise sprite yönünü hıza göre güncelle
            if (Math.abs(data.currentSpeedX) > 0.1) {
                crab.render.sprite.xScale = Math.sign(data.currentSpeedX) * 0.75;
            }

            // Yengeçlerin yan yürüme efekti için açısını sabit tutuyoruz
            Body.setAngle(crab, 0);
        });

        Render.run(render);
        const runner = Runner.create();
        Runner.run(runner, engine);

        const handleResize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            render.canvas.width = width;
            render.canvas.height = height;
            // Resize olunca yengecin hedef pozisyonlarını güncellemek gerekebilir
            if (crab.customData.state === 'hidden') crab.customData.targetY = height + 100;
            else crab.customData.targetY = height - 60;
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            Render.stop(render);
            Runner.stop(runner);
            Engine.clear(engine);
            render.canvas.remove();
        };
    }, []);

    return (
        <div
            ref={sceneRef}
            style={{
                width: '100vw',
                height: '100vh',
                position: 'fixed',
                bottom: 0,
                left: 0,
                zIndex: 5,
                pointerEvents: 'none'
            }}
        />
    );
};

export default Crab;