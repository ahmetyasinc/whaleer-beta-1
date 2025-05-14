"use client"; // Next.js'in client bileşeni olarak kullanmasını sağlar

import { useState, useEffect } from "react";
import { MdWifiOff } from "react-icons/md";


function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(true); // Varsayılan olarak online kabul ediyoruz

  useEffect(() => {
    function updateStatus() {
      setIsOnline(navigator.onLine);
    }

    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);

        // Sayfa kaydırmasını ve tıklamaları engelle
        if (!isOnline) {
          document.body.style.overflow = "hidden"; // Sayfanın kaydırılmasını engelle
          document.body.style.pointerEvents = "none"; // Sayfadaki tüm etkileşimleri devre dışı bırak
        } else {
          document.body.style.overflow = ""; // Varsayılan duruma geri al
          document.body.style.pointerEvents = ""; // Tıklamaları geri aç
        }
    

    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  if (isOnline) return null; // Eğer internet varsa, hiçbir şey gösterme

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        // backgroundColor: "rgba(0, 0, 0, 0.5)", Arka planı biraz karart
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999, // En üstte göster
        pointerEvents: "none", // Sayfa üzerinde tıklama ve kaydırmayı engelle
      }}
    >
      <div
        style={{
          padding: "15px 30px",
          backgroundColor: "yellow",
          color: "black", // Yazı rengini siyah yap
          borderRadius: "8px",
          fontWeight: "bold",
          fontSize: "18px",
          border: "2px solid black", // Siyah border ekle
          boxShadow: "0px 4px 10px rgba(0,0,0,0.2)",
          zIndex: 10000,
          textAlign: "center",
          pointerEvents: "auto",
          display: "flex",
          alignItems: "center",
          gap: "25px", // İkon ile yazı arasına boşluk bırak
        }}
      >
       <MdWifiOff size={24} /> Lütfen internet bağlantınızı kontrol edin !
      </div>
    </div>
  );
}

export default NetworkStatus;
