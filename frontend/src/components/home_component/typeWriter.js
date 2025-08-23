// components/TypewriterText.jsx
"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

/**
 * Harf harf yazım + yazım bitince hızlı blink caret.
 */
export default function TypewriterText({
  text,
  speed = 60,            // ms/harf
  restartEvery = 30000,   // yazım bittikten kaç ms sonra tekrar başlasın
  className = "",
  cursorClassName = "",
}) {
  const [shown, setShown] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const idxRef = useRef(0);
  const typeT = useRef(null);
  const restartT = useRef(null);

  const startTyping = () => {
    clearTimeout(typeT.current);
    clearTimeout(restartT.current);
    idxRef.current = 0;
    setShown("");
    setIsTyping(true);

    const step = () => {
      setShown(text.slice(0, idxRef.current + 1));
      idxRef.current += 1;
      if (idxRef.current < text.length) {
        typeT.current = setTimeout(step, speed);
      } else {
        setIsTyping(false); // yazım tamam -> blink başlasın
        restartT.current = setTimeout(startTyping, restartEvery);
      }
    };
    step();
  };

  useEffect(() => {
    startTyping();
    return () => {
      clearTimeout(typeT.current);
      clearTimeout(restartT.current);
    };
  }, [text, speed, restartEvery]);

  return (
    <span className={`inline-flex items-center ${className}`} aria-label={text}>
      <span className="whitespace-pre">{shown}</span>

      {/* Yazım sırasında sabit caret, bitince blink */}
      {isTyping ? (
        <span
          aria-hidden="true"
          className={`ml-[4px] inline-block h-[1.18em] w-[0.1em] bg-current align-middle ${cursorClassName}`}
        />
      ) : (
        <motion.span
          aria-hidden="true"
          className={`ml-[4px] inline-block h-[1.18em] w-[0.1em] bg-current align-middle ${cursorClassName}`}
          animate={{ opacity: [1, 1, 0, 0] }}
          transition={{
            duration: 0.7,           // biraz daha hızlı blink
            repeat: Infinity,
            ease: "linear",
            times: [0, 0.45, 0.5, 1] // 0–45% açık, 50–100% kapalı (keskin blink)
          }}
          style={{ willChange: "opacity" }}
        />
      )}
    </span>
  );
}
