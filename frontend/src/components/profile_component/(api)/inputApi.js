"use client";

import { useState } from "react";
import { ImKey } from "react-icons/im";
import { motion, useAnimation } from "framer-motion";

const ApiKeyInput = () => {
  const [apiKey, setApiKey] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [isAnimationFinished, setIsAnimationFinished] = useState(false);
  const controls = useAnimation();

  const handleSave = async () => {
    if (apiKey.trim() === "") return;
    setIsSaved(true);

    // Input yanına gelsin
    await controls.start({
      right: "-33px",
      transition: { duration: 0.4, ease: "easeInOut" },
    });

    // X ekseni etrafında salınım
    await controls.start({
      rotateX: [0, 180, 360, 180, 360],
      transition: { duration: 1.3, ease: "easeInOut" },
    });

    // Arka planı değiştirmek için tetikleyici
    setIsAnimationFinished(true);

    // Eski konuma geri dön
    await controls.start({
      right: "-70px",
      transition: { duration: 0.4, ease: "easeInOut" },
    });

    // Düşüş ve kaybolma
    await controls.start({
      y: [0, 100, 330],
      rotate: [0, 300, 600],
      opacity: [1, 0.5, 0],
      transition: { duration: 0.9, ease: "easeIn" },
    });

  };

  return (
    <div className="flex flex-col items-center space-y-4 mt-10">
      <div className="relative w-80 z-10">
        <input
          type="text"
          placeholder="API Anahtarını Gir..."
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          disabled={isSaved}
          className="w-full h-12 pr-10 pl-4 rounded-sm border border-gray-400 text-gray-900 focus:outline-none relative z-10 bg-white"
          style={
            isAnimationFinished
              ? {
                  backgroundImage: "url('/lightgrain.gif')",
                  backgroundSize: "cover",
                 // background: "linear-gradient(to right, #111827, #111827)",
                }
              : {}
          }
        />

        {/* İkon - 3D efekt için parent'a perspective */}
        <div
          className="absolute top-0 translate-y-[-58%] right-0 pointer-events-none"
          style={{ perspective: 1000 }}
        >
          <motion.div
            className="text-[hsl(51,87%,53%)]"
            initial={{ right: "-70px", rotateX: 0 }}
            animate={controls}
            style={{
              position: "absolute",
              right: "-70px",
              transformOrigin: "center",
            }}
          >
            <ImKey size={50} className="rotate-45" />
          </motion.div>
        </div>
      </div>

      {!isSaved && (
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-500 text-white rounded-md"
        >
          Kaydet
        </button>
      )}
      {isSaved && (
        <p className="text-green-600 font-medium">Anahtar kaydedildi ✅</p>
      )}
    </div>
  );
};

export default ApiKeyInput;
