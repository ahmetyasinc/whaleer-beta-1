'use client'
import React, { useState, useRef, useEffect } from 'react';
import useIndicatorDataStore from "@/store/indicator/indicatorDataStore";

const TerminalIndicator = ({ id }) => {
  const [output, setOutput] = useState([
    "🌊 Hoş geldiniz, Terminal hazır...",
  ]);
  const [input, setInput] = useState('');
  const startTime = useRef(Date.now());
  const { indicatorData } = useIndicatorDataStore(); // ✅ Clear fonksiyonu eklendi

  const lastPrintedRef = useRef([]);
  
  useEffect(() => {
    const indicator = indicatorData?.[id];
    const subItems = indicator?.subItems || {};
    const maxSubId = Math.max(...Object.keys(subItems).map(Number));
    const currentSub = subItems?.[maxSubId];
  
    if (!currentSub) return;
  
    const { prints, result } = currentSub;
    console.log(currentSub)
    // ❗ Eğer error durumu varsa sadece hata mesajını yazdır
    if (result?.status === "error" && result?.message) {
      setOutput((prev) => [
        ...prev,
        <span key={`error-${Date.now()}`} className="text-red-500">
          ❌ {result.message}
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
  }, [indicatorData, id]);
  

  
  const getMessageStyle = (type) => {
    switch(type) {
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

  const handleCommand = (cmd) => {
    switch(cmd) {
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
        break;

      case 'time':
        addOutput(new Date().toLocaleString(), 'success');
        break;

      case 'uptime':
        const seconds = Math.floor((Date.now() - startTime.current) / 1000);
        addOutput(`⏱️ Sayfa açık kalma süresi: ${seconds} saniye`);
        break;

      case 'uyari':
        addOutput('Bu bir uyarı mesajıdır!', 'warning');
        break;

      case 'basari':
        addOutput('Bu bir başarı mesajıdır!', 'success');
        break;

      default:
        addOutput(`> ${cmd}`);
        addOutput(`Tanımsız komut: ${cmd}, 'warning'`);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cmd = input.trim().toLowerCase();
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

export default TerminalIndicator;