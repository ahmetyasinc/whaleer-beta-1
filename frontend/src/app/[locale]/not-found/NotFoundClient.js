'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { LuShipWheel } from 'react-icons/lu';
import Button from '@/ui/waterButton';
import i18n from '@/i18n'; // i18n instance'ını al

export default function NotFound({ locale }) {
  const { t } = useTranslation('notFound');
  const [mounted, setMounted] = useState(false);

  const router = useRouter();
  const [spin, setSpin] = useState(false);
  const [sailAway, setSailAway] = useState(false);
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    i18n.changeLanguage(locale); // 💡 App Router'dan gelen locale'e göre dili değiştir
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
    setTimeout(() => router.push(`/${locale}`), 2000); // geri dönüş de locale bazlı
  };

  if (!mounted) return null;

  return (
    <div className="relative h-screen w-screen overflow-hidden hard-gradient">
      <div className="min-h-screen flex items-center justify-between px-20 mt-[-80px]">
        <div className="flex items-start space-x-4 ml-12">
          <img src="/img/sailorWhale.png" alt="avatar" className="w-40 h-60 object-cover rounded" />
          <div className="relative bg-[rgb(7,22,44)] pt-4 pb-2 px-4 rounded-lg shadow-md max-w-[410px] mt-4">
            <p className="text-white leading-relaxed whitespace-pre-line">
              {displayedText}
              <span className="ml-1">🌊</span>
            </p>
            <div className="absolute left-0 top-3 -ml-2 w-0 h-0 
              border-t-[8px] border-t-transparent 
              border-b-[8px] border-b-transparent 
              border-r-[8px] border-r-[rgb(7,22,44)]" />
          </div>
        </div>
        <div className="text-white text-right mr-20">
          <h1 className="text-[140px] font-extrabold leading-none font-mono">404</h1>
          <p className="text-2xl font-semibold mr-[14px]">{t('pageTitle')}</p>
        </div>
      </div>

      {/* Deniz parçaları */}
      <img src="/img/repeatingsea.png" alt="deniz" className="absolute left-0 w-[300px] h-[180px] bottom-0 object-cover z-0" />
      <img src="/img/reversesea.png" alt="deniz" className="absolute left-[300px] w-[300px] h-[180px] bottom-0 object-cover z-0" />
      <img src="/img/repeatingsea.png" alt="deniz" className="absolute left-[600px] w-[300px] h-[180px] bottom-0 object-cover z-0" />
      <img src="/img/reversesea.png" alt="deniz" className="absolute left-[900px] w-[300px] h-[180px] bottom-0 object-cover z-0" />
      <img src="/img/repeatingsea.png" alt="deniz" className="absolute left-[1200px] w-[300px] h-[180px] bottom-0 object-cover z-0" />
      <img src="/img/reversesea.png" alt="deniz" className="absolute left-[1500px] w-[300px] h-[180px] bottom-0 object-cover z-0" />
      <img src="/img/repeatingsea.png" alt="deniz" className="absolute left-[1800px] w-[300px] h-[180px] bottom-0 object-cover z-0" />
      {/* Yelkenli animasyonu */}

      <motion.img
        src="/img/sailboat.png"
        alt="yelkenli"
        className="absolute left-[380px] w-[136px] h-[136px] bottom-[18px] object-cover z-0"
        animate={
          sailAway
            ? { x: -600, y: [0, 15, 0], rotate: [0, -3, 0, 2, 0] }
            : { y: [0, -2, 0, 2, 0], rotate: [2, 4, 2, 0, 2] }
        }
        transition={{
          duration: sailAway ? 3 : 6,
          repeat: sailAway ? 0 : Infinity,
          ease: 'easeInOut',
        }}
      />

      <div className="absolute top-[60%] ml-[110px] mt-0">
        <Button onClick={handleClick} icon={<LuShipWheel className="text-2xl" />} />
      </div>
    </div>
  );
}
