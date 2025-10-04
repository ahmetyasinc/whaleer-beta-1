'use client'

import React, { useState, useRef, useEffect } from 'react';
import useIndicatorDataStore from "@/store/indicator/indicatorDataStore";
import { useTranslation } from "react-i18next";

const TerminalIndicator = ({ id }) => {
  const { t } = useTranslation("indicatorTerminal");

  const [output, setOutput] = useState(() => [
    t("ready"),
  ]);
  const [input, setInput] = useState('');
  const startTime = useRef(Date.now());
  const { indicatorData } = useIndicatorDataStore();

  const lastPrintedRef = useRef([]);

  // 🔹 Yeni state'ler
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  useEffect(() => {
    const indicator = indicatorData?.[id];
    const subItems = indicator?.subItems || {};
    const keys = Object.keys(subItems);
    if (keys.length === 0) return;

    const maxSubId = Math.max(...keys.map(Number));
    const currentSub = subItems?.[maxSubId];
    if (!currentSub) return;

    const { prints, result } = currentSub;

    if (result?.status === "error" && result?.message) {
      setOutput((prev) => [
        ...prev,
        <span key={`error-${Date.now()}`} className="text-red-500">
          ❌ {result.message}
        </span>,
      ]);
      return;
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
        addOutput(t('ready'));
        break;

      case 'help':
        addOutput(t('commands.helpTitle'), 'success');
        addOutput(t('commands.cls'));
        addOutput(t('commands.help'));
        addOutput(t('commands.time'));
        addOutput(t('commands.uptime'));
        break;

      case 'time':
        addOutput(new Date().toLocaleString(), 'success');
        break;

      case 'uptime': {
        const seconds = Math.floor((Date.now() - startTime.current) / 1000);
        addOutput(t('uptimeFormat', { seconds }));
        break;
      }

      case 'uyari':
        addOutput(t('warningSample'), 'warning');
        break;

      case 'basari':
        addOutput(t('successSample'), 'success');
        break;

      default:
        addOutput(`> ${cmd}`);
        addOutput(t('unknown', { cmd }), 'warning');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cmd = input.trim().toLowerCase();
    if (cmd) {
      handleCommand(cmd);

      // 🔹 Komutu geçmişe ekle
      setHistory((prev) => [...prev, cmd]);
      setHistoryIndex(-1);

      setInput('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length > 0) {
        const newIndex = historyIndex === -1 
          ? history.length - 1 
          : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setInput(history[newIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (history.length > 0) {
        if (historyIndex === -1) return;
        const newIndex = historyIndex + 1;
        if (newIndex < history.length) {
          setHistoryIndex(newIndex);
          setInput(history[newIndex]);
        } else {
          setHistoryIndex(-1);
          setInput('');
        }
      }
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
          onKeyDown={handleKeyDown} // 🔑 buraya eklendi
          className="bg-black text-white border-none outline-none w-full caret-[hsl(59,100%,60%)]"
          placeholder={t("placeholder")}
          spellCheck={false}
        />
      </form>
    </div>
  );
};

export default TerminalIndicator;
