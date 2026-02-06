'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { LuShipWheel } from 'react-icons/lu';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import Button from '@/ui/waterButton';
import i18n from '@/i18n';
import FishAquarium from '@/components/profile_component/FishAquarium';
import JellyfishAquarium from '@/components/profile_component/jellyFish';
import './notFound.css';
import Salmon from '@/components/profile_component/salmon';

export default function NotFound({ locale }) {
  const { t } = useTranslation('notFound');
  const [mounted, setMounted] = useState(false);

  const router = useRouter();
  const [spin, setSpin] = useState(false);
  const [sailAway, setSailAway] = useState(false);
  const [displayedText, setDisplayedText] = useState('');
  const [clickBubbles, setClickBubbles] = useState([]);

  // Tıklama ile baloncuk oluşturma
  const handlePageClick = useCallback((e) => {
    // Buton tıklamalarını yoksay
    if (e.target.closest('button')) return;

    const newBubble = {
      id: Date.now() + Math.random(),
      x: e.clientX,
      y: e.clientY,
      size: Math.random() * 10 + 8, // 8-18px arası
    };

    setClickBubbles(prev => [...prev, newBubble]);

    // 2 saniye sonra baloncuğu kaldır
    setTimeout(() => {
      setClickBubbles(prev => prev.filter(b => b.id !== newBubble.id));
    }, 2000);
  }, []);

  useEffect(() => {
    i18n.changeLanguage(locale);
    setMounted(true);
  }, [locale]);

  useEffect(() => {
    if (!mounted) return;
    const message = t('message');
    let index = 0;
    const interval = setInterval(() => {
      if (index < message.length) {
        setDisplayedText((prev) => prev + message.charAt(index));
        index++;
      } else {
        clearInterval(interval);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [mounted, t]);

  const handleClick = () => {
    setSpin(true);
    setSailAway(true);
    setTimeout(() => router.push(`/${locale}`), 2000);
  };

  if (!mounted) return null;

  return (
    <div className="relative h-screen w-screen overflow-hidden" onClick={handlePageClick}>
      {/* Tıklama Baloncukları */}
      <AnimatePresence>
        {clickBubbles.map((bubble) => (
          <motion.div
            key={bubble.id}
            initial={{
              x: bubble.x - bubble.size / 2,
              y: bubble.y - bubble.size / 2,
              scale: 0,
              opacity: 0.8
            }}
            animate={{
              y: -100,
              scale: [0, 1, 1.1, 1, 0.9, 1],
              opacity: [0.8, 0.9, 0.8, 0.7, 0.5, 0],
              x: [
                bubble.x - bubble.size / 2,
                bubble.x - bubble.size / 2 - 30,
                bubble.x - bubble.size / 2 + 25,
                bubble.x - bubble.size / 2 - 20,
                bubble.x - bubble.size / 2 + 15,
                bubble.x - bubble.size / 2 - 10,
                bubble.x - bubble.size / 2
              ]
            }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{
              duration: 1.5,
              ease: "easeOut",
              x: {
                duration: 1.5,
                ease: "easeInOut",
                times: [0, 0.15, 0.3, 0.45, 0.6, 0.8, 1]
              }
            }}
            style={{
              position: 'fixed',
              width: bubble.size,
              height: bubble.size,
              borderRadius: '50%',
              background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.9), rgba(100,180,255,0.4) 50%, rgba(50,120,200,0.2))',
              boxShadow: 'inset 0 -5px 15px rgba(0,100,200,0.2), inset 5px 5px 10px rgba(255,255,255,0.5), 0 0 20px rgba(100,180,255,0.3)',
              zIndex: 100,
              pointerEvents: 'none',
            }}
          />
        ))}
      </AnimatePresence>

      {/* Arka Plan Görseli */}
      <div className="background-image" />

      {/* Sağ Alt Moss Animasyonları */}
      <div
        style={{
          position: 'fixed',
          bottom: -7,
          right: -40,
          width: 200,
          height: 200,
          zIndex: 5,
          pointerEvents: 'none',
        }}
      >
        <DotLottieReact src="/not-found/moss1.lottie" loop autoplay style={{ width: '100%', height: '100%' }} />
      </div>
      <div
        style={{
          position: 'fixed',
          bottom: -3,
          right: 100,
          width: 100,
          height: 100,
          zIndex: 5,
          pointerEvents: 'none',
        }}
      >
        <DotLottieReact src="/not-found/moss1.lottie" loop autoplay style={{ width: '100%', height: '100%' }} />
      </div>

      {/* Sol Alt Moss Animasyonları */}
      <div
        style={{
          position: 'fixed',
          bottom: -5,
          left: -10,
          width: 180,
          height: 180,
          zIndex: 5,
          pointerEvents: 'none',
        }}
      >
        <DotLottieReact src="/not-found/moss2.lottie" loop autoplay style={{ width: '100%', height: '100%' }} />
      </div>
      <div
        style={{
          position: 'fixed',
          bottom: -7,
          left: 120,
          width: 160,
          height: 190,
          zIndex: 5,
          pointerEvents: 'none',
        }}
      >
        <DotLottieReact src="/not-found/moss1.lottie" loop autoplay style={{ width: '100%', height: '100%' }} />
      </div>

      {/* Sualtı Tekne - Arka plan ile CSS arasında */}
      <motion.img
        src="/img/underwaterboat.png"
        alt="underwater boat"
        className="absolute -top-9 left-1/2 -translate-x-1/2 w-[600px] object-contain"
        style={{ zIndex: -3.5 }}
        animate={
          sailAway
            ? {
              x: [0, -100, -800],
              y: [0, 10, -5, 15, 0],
              rotate: [0, -2, -5, -3, -8]
            }
            : {
              y: [0, -8, 0, 8, 0],
              rotate: [0, 1, 0, -1, 0]
            }
        }
        transition={{
          duration: sailAway ? 2.5 : 5,
          repeat: sailAway ? 0 : Infinity,
          ease: sailAway ? 'easeInOut' : 'easeInOut',
        }}
      />

      {/* Okyanus Arka Planı */}
      <div className="ocean" />
      <div className="light" />
      <div className="depth depth-1" />
      <div className="depth depth-2" />
      <div className="caustics" />

      {/* Hava Kabarcıkları */}
      <div className="bubbles">
        <div className="bubble" />
        <div className="bubble" />
        <div className="bubble" />
        <div className="bubble" />
        <div className="bubble" />
        <div className="bubble" />
        <div className="bubble" />
        <div className="bubble" />
        <div className="bubble" />
      </div>

      {/* Derin Su Sisi */}
      <div className="fog" />

      {/* Balıklar */}
      <FishAquarium count={13} />
      <JellyfishAquarium count={1} />
      <Salmon />

      {/* İçerik */}
      <div className="min-h-screen flex items-center justify-between px-20 mt-[-80px] relative z-10">
        <div className="flex items-start space-x-4 ml-12">
          <img src="/img/sailorWhale.png" alt="avatar" className="w-40 h-60 object-cover rounded" />
          <div className="relative bg-[rgba(7,22,44,0.85)] backdrop-blur-sm pt-4 pb-2 px-4 rounded-lg shadow-lg max-w-[410px] mt-4 border border-[rgba(100,180,255,0.1)]">
            <p className="text-white leading-relaxed whitespace-pre-line">
              {displayedText}
              <span className="ml-1">🌊</span>
            </p>
            <div className="absolute left-0 top-3 -ml-2 w-0 h-0 
              border-t-[8px] border-t-transparent 
              border-b-[8px] border-b-transparent 
              border-r-[8px] border-r-[rgba(7,22,44,0.85)]" />
          </div>
        </div>
        <div className="text-white text-right mb-8 mr-36">
          <h1 className="text-[140px] font-extrabold leading-none font-mono drop-shadow-[0_0_30px_rgba(100,180,255,0.3)]">404</h1>
          <p className="text-2xl font-semibold text-[rgba(180,220,255,0.9)]">{t('pageTitle')}</p>
        </div>
      </div>

      <div className="absolute top-[55%] ml-[95px] z-20">
        <Button onClick={handleClick} icon={<LuShipWheel className="text-2xl" />} />
      </div>
    </div>
  );
}
