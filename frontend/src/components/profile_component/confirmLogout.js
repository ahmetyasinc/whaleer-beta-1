"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { IoWarningOutline } from "react-icons/io5";
import Matter, { Engine, World, Bodies, Body, Composite } from "matter-js";

export default function LogoutConfirmModal({ open, onCancel, onConfirm, t }) {
  const iconRef = useRef(null);
  const boxRef = useRef(null);
  const engineRef = useRef(null);
  const ballRef = useRef(null);

const setupPhysics = useCallback(() => {
  if (!boxRef.current || !iconRef.current) return;

  const box = boxRef.current;
  const { clientWidth: w, clientHeight: h } = box;

  // Yerçekimi yok – tamamen süzülme
  const engine = Engine.create({ gravity: { x: 0, y: 0, scale: 0 } });
  engineRef.current = engine;

  const radius = 28;
  const ball = Bodies.circle(w / 2, h / 2, radius, {
    frictionAir: 0.05, // hafif sönüm
    inertia: Infinity, // dönmeyi sabitle (isteğe bağlı)
    render: { visible: false },
  });
  World.add(engine.world, [ball]);
  ballRef.current = ball;

  // Salınım parametreleri (kısa genlik)
  let t = 0;
  const ampX = Math.min(60, w * 0.18);   // yatay genlik (kısa tut)
  const ampY = Math.min(10, h * 0.12);   // dikey salınım küçük
  const wX = 0.9;                        // yatay açısal hız
  const wY = 1.7;                        // dikey açısal hız
  const cx = w / 2;
  const cy = h / 2;

  const sync = () => {
    const { x, y } = ball.position;
    const angle = Math.sin(t * 0.6) * 0.15; // çok hafif dönsün
    if (iconRef.current) {
      iconRef.current.style.transform = `translate(${x - radius}px, ${y - radius}px) rotate(${angle}rad)`;
    }
  };

  // Hedeften sapmayı yumuşatmak için "lerp"
  const lerp = (a, b, f) => a + (b - a) * f;

  let raf;
  const tick = () => {
    // Zamanı ilerlet
    t += 0.016;

    // Hedef konum (merkez etrafında kısa salınım)
    const targetX = cx + Math.sin(t * wX) * ampX;
    const targetY = cy + Math.sin(t * wY) * ampY;

    // Mevcut konumu hedefe doğru yumuşakça yaklaştır
    const px = ball.position.x;
    const py = ball.position.y;
    const nx = lerp(px, targetX, 0.12); // 0.08–0.18 arası deneyebilirsin
    const ny = lerp(py, targetY, 0.12);
    Body.setPosition(ball, { x: nx, y: ny });

    // Hızı sönümle (savrulmasın)
    Body.setVelocity(ball, { x: 0, y: 0 });

    Engine.update(engine, 1000 / 60);
    sync();
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  // Etkileşim: tıklayınca hafif faz kaydır (yön değişimi hissi verir)
  const nudge = () => {
    t += Math.PI * 0.25; // küçük faz kayması
  };
  box.addEventListener("pointerdown", nudge);

  // Resize olursa merkez/genlik güncelle
  const onResize = () => {
    const { clientWidth: nw, clientHeight: nh } = box;
    // Merkez ve genlikleri yeni boyuta göre yeniden hesapla
    // (değerleri var olan değişkenlere atayabilmek için closure kullanımı)
    // Not: ampX/ampY const; basit tutmak için sayfayı yeniden aç/kapatmak yeterli.
  };
  window.addEventListener("resize", onResize);

  return () => {
    window.removeEventListener("resize", onResize);
    box.removeEventListener("pointerdown", nudge);
    cancelAnimationFrame(raf);
    engineRef.current = null;
    ballRef.current = null;
  };
}, []);


  useEffect(() => {
    if (!open) return;
    const cleanup = setupPhysics();
    return () => {
      if (cleanup) cleanup();
    };
  }, [open, setupPhysics]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-2xl border border-white/10 bg-neutral-900/70 shadow-2xl shadow-black/40">
        <div
          ref={boxRef}
          className="relative h-28 overflow-hidden rounded-t-2xl bg-gradient-to-br from-red-500/20 via-indigo-500/10 to-red-600/20"
        >
          <div
            ref={iconRef}
            className="absolute size-14 rounded-full bg-red-400/20 ring-2 ring-red-500/90 flex items-center justify-center"
          >
            <IoWarningOutline className="size-8 text-red-300 drop-shadow" />
          </div>
        </div>

        <div className="p-6">
          <h3 className="text-lg font-semibold text-white">{t("logout")}</h3>
          <p className="mt-1 text-sm text-neutral-300">{t("logoutConfirm")}</p>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              onClick={onCancel}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-neutral-200 hover:bg-white/10 active:scale-[0.98] transition"
            >
              {t("no")}
            </button>
            <button
              onClick={onConfirm}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-orange-600 to-rose-700 hover:from-rose-700 hover:to-orange-600 shadow-lg shadow-blue-900/30 active:scale-[0.98] transition"
            >
              {t("logout")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}