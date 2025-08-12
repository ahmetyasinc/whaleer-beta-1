"use client";

import { useEffect, useRef, useState } from "react";
import { Engine, Runner, World, Bodies, Body, Events } from "matter-js";

export default function FreeFallLogo() {
  const logoRef = useRef(null);
  const engineRef = useRef(null);
  const runnerRef = useRef(null);
  const bodyRef = useRef(null);
  const wallsRef = useRef({});
  const rafRef = useRef(0);

  const [viewport, setViewport] = useState({
    w: typeof window !== "undefined" ? window.innerWidth : 800,
    h: typeof window !== "undefined" ? window.innerHeight : 600,
  });

  const draggingRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0, t: 0 });
  const velRef = useRef({ vx: 0, vy: 0 });

  const RADIUS = 100; // Daha büyük logo

  useEffect(() => {
    const engine = Engine.create();
    engine.gravity.y = 1.2;
    engineRef.current = engine;
    const world = engine.world;

    // Duvarlar (yüksek sekme)
    const makeWalls = (w, h) => {
      const thickness = 200;
      const props = { isStatic: true, restitution: 1.0 };
      const left = Bodies.rectangle(-thickness / 2, h / 2, thickness, h * 2, props);
      const right = Bodies.rectangle(w + thickness / 2, h / 2, thickness, h * 2, props);
      const top = Bodies.rectangle(w / 2, -thickness / 2, w * 2, thickness, props);
      const bottom = Bodies.rectangle(w / 2, h + thickness / 2, w * 2, thickness, props);
      World.add(world, [left, right, top, bottom]);
      return { left, right, top, bottom };
    };

    wallsRef.current = makeWalls(viewport.w, viewport.h);

    // Logo gövdesi (dairesel)
    const startX = viewport.w * 0.3;
    const startY = 120;
    const circle = Bodies.circle(startX, startY, RADIUS / 2, {
      restitution: 0.95,   // Sekme yüksek
      friction: 0.002,     // Düşük zemin sürtünmesi
      frictionAir: 0.002,  // Düşük hava sürtünmesi
    });
    bodyRef.current = circle;
    World.add(world, circle);

    // Motoru çalıştır
    const runner = Runner.create();
    runnerRef.current = runner;
    Runner.run(runner, engine);

    // Çarpma anında ses çal
    Events.on(engine, "collisionStart", (event) => {
      event.pairs.forEach(({ bodyA, bodyB }) => {
        const logo = bodyRef.current;
        const walls = Object.values(wallsRef.current);
        if (
          (bodyA === logo && walls.includes(bodyB)) ||
          (bodyB === logo && walls.includes(bodyA))
        ) {
          const audio = new Audio("/sounds/flash.mp3");
          audio.volume = 0.6;
          audio.play();
        }
      });
    });

    // DOM senkronizasyonu
    const tick = () => {
      const b = bodyRef.current;
      if (b && logoRef.current) {
        const { x, y } = b.position;
        const angle = b.angle;
        const tx = x - RADIUS / 2;
        const ty = y - RADIUS / 2;
        logoRef.current.style.transform = `translate(${tx}px, ${ty}px) rotate(${angle}rad)`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    // Çok küçük hızlarda durma
    Events.on(engine, "afterUpdate", () => {
      const b = bodyRef.current;
      if (!b) return;
      const speed = Math.hypot(b.velocity.x, b.velocity.y);
      if (speed < 0.01 && Math.abs(b.angularVelocity) < 0.01) {
        Body.setVelocity(b, { x: 0, y: 0 });
        Body.setAngularVelocity(b, 0);
      }
    });

    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setViewport({ w, h });
    };

    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      try {
        World.clear(world, false);
        Engine.clear(engine);
        if (runnerRef.current) runnerRef.current.enabled = false;
      } catch {}
    };
  }, []);

  const getPointer = (e) => {
    const isTouch = e.touches && e.touches.length > 0;
    return {
      x: isTouch ? e.touches[0].clientX : e.clientX,
      y: isTouch ? e.touches[0].clientY : e.clientY,
      t: performance.now(),
    };
  };

  const onPointerDownLogo = (e) => {
    draggingRef.current = true;
    const b = bodyRef.current;
    if (!b) return;
    Body.setStatic(b, true);
    const p = getPointer(e);
    lastPointerRef.current = p;
    velRef.current = { vx: 0, vy: 0 };
    logoRef.current.setPointerCapture?.(e.pointerId ?? 0);
  };

  const onPointerMoveLogo = (e) => {
    if (!draggingRef.current) return;
    const b = bodyRef.current;
    if (!b) return;
    const p = getPointer(e);
    const { x, y, t } = p;
    const { x: px, y: py, t: pt } = lastPointerRef.current;
    const dt = Math.max(1, t - pt);
    const vx = ((x - px) / dt) * 0.8;
    const vy = ((y - py) / dt) * 0.8;
    velRef.current = { vx, vy };
    lastPointerRef.current = p;
    Body.setPosition(b, { x, y });
    Body.setAngularVelocity(b, 0);
  };

  const onPointerUpLogo = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    const b = bodyRef.current;
    if (!b) return;
    Body.setStatic(b, false);
    Body.setVelocity(b, { x: velRef.current.vx, y: velRef.current.vy });
    b.frictionAir = 0.002;
  };

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", background: "transparent" }}>
      <img
        ref={logoRef}
        src="/img/logo5.png"
        alt="Logo"
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
        onPointerDown={onPointerDownLogo}
        onPointerMove={onPointerMoveLogo}
        onPointerUp={onPointerUpLogo}
        onPointerCancel={onPointerUpLogo}
        style={{
          position: "absolute",
          width: RADIUS,
          height: RADIUS,
          borderRadius: "50%",
          userSelect: "none",
          touchAction: "none",
          transform: "translate(-9999px, -9999px)",
          cursor: "grab",
        }}
      />
    </div>
  );
}
