'use client'
import React, { useState, useRef, useEffect } from 'react';
import useStrategyDataStore from "@/store/indicator/strategyDataStore";

const TerminalStrategy = ({ id }) => {
  const [output, setOutput] = useState(["🌊 Hoş geldiniz, Terminal hazır...",]);
  const [input, setInput] = useState('');
  const [importedIndicators, setImportedIndicators] = useState([]);
  const {strategyData} = useStrategyDataStore();
  const startTime = useRef(Date.now());

  const lastPrintedRef = useRef([]);

  useEffect(() => {
    const strategy = strategyData?.[id];
    const subItems = strategy?.subItems || {};
    const maxSubId = Math.max(...Object.keys(subItems).map(Number));
    const currentSub = subItems?.[maxSubId];
  
    if (!currentSub) return;
  
    const { prints, strategy_result } = currentSub;
    console.log(currentSub)
    // ❗ Eğer error durumu varsa sadece hata mesajını yazdır
    if (strategy_result?.status === "error" && strategy_result?.message) {
      setOutput((prev) => [
        ...prev,
        <span key={`error-${Date.now()}`} className="text-red-500">
          ❌ {strategy_result.message}
        </span>,
      ]);
      return; // ❌ Error durumunda prints'e hiç bakma
    }
  
    if (!Array.isArray(prints)) return;
    if (JSON.stringify(prints) === JSON.stringify(lastPrintedRef.current)) return;
  
    const renderedLines = [];
    prints.forEach((msg, index) => {
      const lines = msg.split("\n");
      lines.forEach((line, i) => {
        renderedLines.push(
          <span key={`${index}-${i}`} className="text-yellow-400">
            🖨️ {line}
          </span>
        );
      });
    });
  
    setOutput((prev) => [...prev, ...renderedLines]);
    lastPrintedRef.current = prints;
  }, [strategyData, id]);


  // Backend'e PUT isteği göndererek indikatör listesini günceller
  const updateBackendIndicators = async (updatedList) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/strategies/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          id,
          indicator_names: updatedList,
        }),
      });

      if (response.status === 401) {
        const errorData = await response.json();
        if (["Token expired", "Invalid token"].includes(errorData.detail)) {
          alert("Oturum süresi doldu veya geçersiz token! Lütfen tekrar giriş yapın.");
          return false;
        }
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "İstek başarısız");
      }

      const result = await response.json();
      return true;
    } catch (err) {
      //console.error("Backend güncelleme hatası:", err);
      setOutput((prev) => [
        ...prev,
        <span key={prev.length} className="text-red-500">
          ❌ İndikatör bulunamadı: {err.message}
        </span>,
      ]);
      return false;
    }
  };

  useEffect(() => {
    async function fetchIndicators() {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/strategies/${id}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        });

        if (response.status === 401) {
          const errorData = await response.json();
          if (["Token expired", "Invalid token"].includes(errorData.detail)) {
            alert("Oturum süresi doldu veya geçersiz token! Lütfen tekrar giriş yapın.");
            return;
          }
        }

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || "İstek başarısız");
        }

        const data = await response.json();
        if (data.indicator_names) {
          setImportedIndicators(data.indicator_names);
          setOutput(prev => [
            ...prev,
            <span key={prev.length} className="text-green-500">
              ✅ {data.indicator_names.length} indikatör yüklendi.
            </span>,
          ]);
        }
      } catch (error) {
        console.error("İndikatör çekme hatası:", error);
        setOutput(prev => [
          ...prev,
          <span key={prev.length} className="text-red-500">
            ❌ İndikatörler yüklenemedi: {error.message}
          </span>,
        ]);
      }
    }

    if (id) fetchIndicators();
  }, [id]);

  const getMessageStyle = (type) => {
    switch (type) {
      case 'error': return 'text-red-500';
      case 'warning': return 'text-yellow-500';
      case 'success': return 'text-green-500';
      default: return 'text-white';
    }
  };

  const addOutput = (message, type = 'default') => {
    setOutput(prevOutput => [
      ...prevOutput,
      <span key={prevOutput.length} className={getMessageStyle(type)}>
        {message}
      </span>
    ]);
  };

  const clearOutput = () => setOutput([]);

  const handleCommand = async (cmdRaw) => {
    const [command, ...args] = cmdRaw.trim().split(" ");
    const cmd = command.toLowerCase(); // sadece komut küçük harf
    const argument = args.join(" ").trim(); // parametreler orijinal haliyle
    if (cmd === "import") {
      const indicator = argument;
      if (!indicator) {
        addOutput("⚠️ Lütfen bir indikatör ismi girin. Örn: import rsi", "warning");
        return;
      }
      if (importedIndicators.includes(indicator)) {
        addOutput(`⚠️ ${indicator} zaten import edilmiş.`, "success");
      } else {
        const updated = [...importedIndicators, indicator];
        const success = await updateBackendIndicators(updated);
        if (success) {
          setImportedIndicators(updated);
          addOutput(`✅ ${indicator} başarıyla import edildi.`, "success");
        }
      }
      return;
    }
  
    if (cmd === "reset") {
      const arg = argument;
      if (!arg) {
        addOutput("⚠️ Silinecek indikatörü belirtin. Örn: reset RSI", "warning");
        return;
      }
  
      if (arg.toLowerCase() === "imports") {
        const success = await updateBackendIndicators([]);
        if (success) {
          setImportedIndicators([]);
          addOutput("♻️ Tüm import edilen indikatörler sıfırlandı.", "success");
        }
      } else {
        if (importedIndicators.includes(arg)) {
          const updated = importedIndicators.filter((ind) => ind !== arg);
          const success = await updateBackendIndicators(updated);
          if (success) {
            setImportedIndicators(updated);
            addOutput(`🗑️ ${arg} import listesinden kaldırıldı.`, "success");
          }
        } else {
          addOutput(`⚠️ ${arg} import listesinde bulunamadı.`, "warning");
        }
      }
      return;
    }
  
    // geri kalanlar:
    switch (cmd) {
      case 'cls':
        clearOutput();
        addOutput('🌊 Hoş geldiniz, Terminal hazır...');
        break;
  
      case 'help':
        addOutput('Kullanılabilir komutlar:', 'success');
        addOutput('cls - Terminali temizle');
        addOutput('help - Komutları listele');
        addOutput('time - Şu anki tarihi göster');
        addOutput('uptime - Sayfa ne kadar süredir açık');
        addOutput('import <indikator> - Bir indikatörü import et');
        addOutput('list imports - Import edilen indikatörleri listele');
        addOutput('reset <indikator|imports> - Belirli bir indikatörü veya tümünü sil');
        break;
  
      case 'time':
        addOutput(new Date().toLocaleString(), 'success');
        break;
  
      case 'uptime':
        const seconds = Math.floor((Date.now() - startTime.current) / 1000);
        addOutput(`⏱️ Sayfa açık kalma süresi: ${seconds} saniye`);
        break;
  
      case 'hata':
        addOutput('Bu bir hata mesajıdır!', 'error');
        break;
  
      case 'uyari':
        addOutput('Bu bir uyarı mesajıdır!', 'warning');
        break;
  
      case 'basari':
        addOutput('Bu bir başarı mesajıdır!', 'success');
        break;
  
      case 'list':
        if (importedIndicators.length === 0) {
          addOutput("📭 Henüz hiçbir indikatör import edilmedi.", "warning");
        } else {
          addOutput("📦 Import edilen indikatörler:");
          importedIndicators.forEach((ind) => addOutput(`- ${ind}`));
        }
        break;
  
      default:
        addOutput(`> ${cmdRaw}`);
        addOutput(`Tanımsız komut: ${cmdRaw}`, 'warning');
    }
  };
  

  const handleSubmit = (e) => {
    e.preventDefault();
    const cmd = input.trim();
    if (cmd) {
      handleCommand(cmd);
      setInput('');
    }
  };
  return (
    <div className="bg-black text-white font-mono text-xs p-2 h-[135px] overflow-y-auto">
      <div>
        {output.map((line, index) => (
          <div key={index}>{line}</div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="mt-1 flex items-center">
        <span className="mr-2">{'>'}</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="bg-black text-white border-none outline-none w-full caret-[hsl(59,100%,60%)]"
          placeholder="Komut girin (yardım için 'help')"
          spellCheck={false}
        />
      </form>
    </div>
  );
};

export default TerminalStrategy;
