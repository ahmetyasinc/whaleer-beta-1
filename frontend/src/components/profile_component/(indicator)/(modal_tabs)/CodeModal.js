"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IoMdClose } from "react-icons/io";
import dynamic from "next/dynamic";

// Monaco Editor SSR uyumlu şekilde dinamik import edilir
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const CodeModal = ({ isOpen, onClose, indicator }) => {
  const [code, setCode] = useState("");
  const monacoRef = useRef(null);
  const [mounted, setMounted] = useState(false); // portal için

  // Portal güvenliği (SSR → CSR)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Body scroll kilidi (opsiyonel ama iyi deneyim)
  useEffect(() => {
    if (!mounted) return;
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen, mounted]);

  // Kod değişince local state'e al
  useEffect(() => {
    setCode(indicator?.code || "");
  }, [indicator]);

  // Monaco tanımlamaları sadece ilk yüklemede yapılır
  function handleEditorWillMount(monaco) {
    if (monacoRef.current) return; // sadece bir kez tanımla
    monacoRef.current = monaco;

    // Python dili tanımı ve renklendirme
    monaco.languages.register({ id: "python-custom" });
    monaco.languages.setMonarchTokensProvider("python-custom", {
      tokenizer: {
        root: [
          [/#.*/, "comment"],
          // Custom functions - treated as keywords/functions for highlighting
          [/\b(plot_indicator|mark|plot|if|else|elif|def|for|,)\b/, "function.custom"],

          // input.xxx -> input "type"
          [/\binput\.(int|float|bool|color|string|or)\b/, "type"],
          [/\binput\b/, "type"],

          // Dataframe & Libs (pd, np, df)
          [/\b(pd|np|df)\b/, "variable.predefined"],

          // Standard keywords
          [/\b(print|class|return|import|from|as|with|try|except|finally|while|break|continue|pass|lambda|not|or|color|and|is|assert|async|await|del|global|nonlocal|raise|yield)\b/, "keyword"],

          // Constants
          [/\b(True|False|None|:)\b/, "constant"],

          // Built-in types
          [/\b(int|float|str|bool|list|tuple|set|dict|bytes|complex|range|frozenset|memoryview|bytearray|object|type|astype)\b/, "type"],

          // Operators -- explicitly capturing common ones
          [/[=><!+\-*/%&|^~]+/, "operator"],

          // Comma specifically for blue coloring (along with other delimiters)
          [/[;,.]/, "delimiter"],
          [/[{}()\[\]]/, "delimiter.bracket"],

          // Numbers
          [/\b\d+(\.\d+)?\b/, "number"],

          // Strings
          [/"""/, "string", "@triple_double_quote"],
          [/'''/, "string", "@triple_single_quote"],
          [/".*?"/, "string"],
          [/'.*?'/, "string"],

          // Functions (Standard + some extras from request context)
          [/\b(len|type|range|open|abs|round|sorted|map|filter|zip|sum|min|max|pow|chr|ord|bin|hex|oct|repr|hash|dir|vars|locals|globals|help|isinstance|issubclass|callable|eval|exec|compile|super|memoryview|staticmethod|classmethod|property|delattr|getattr|setattr|hasattr|all|any|enumerate|format|iter|next|reversed|slice)\b/, "function"],

          // Common modules
          [/\b(os|sys|math|random|time|datetime|re|json|csv|argparse|collections|functools|itertools|threading|multiprocessing|socket|subprocess|asyncio|base64|pickle|gzip|shutil|tempfile|xml|http|urllib|sqlite3|pandas|numpy)\b/, "module"],
        ],
        triple_double_quote: [[/"""/, "string", "@popall"], [/./, "string"]],
        triple_single_quote: [[/'''/, "string", "@popall"], [/./, "string"]],
      },
    });

    // Custom Theme: Whaleer Neon (Blue/Green/Pink)
    monaco.editor.defineTheme('whaleer-custom-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'operator', foreground: 'E2E8F0' }, // Soft Grey
        { token: 'keyword', foreground: '9658DB' },  // Purple 
        { token: 'type', foreground: '8BE9FD' },     // Cyan
        { token: 'function', foreground: '50FA7B' }, // Green
        { token: 'function.custom', foreground: '3B8EEA' }, // Blue
        { token: 'variable.predefined', foreground: 'FF79C6' }, // Pink 
        { token: 'string', foreground: 'CE9178' },   // Orange
        { token: 'number', foreground: 'BD93F9' },   // Purple
        { token: 'delimiter', foreground: '3B8EEA' }, // Blue 
        { token: 'delimiter.bracket', foreground: 'F8F8F2' }, //white
        { token: 'comment', foreground: '6A9955' },  // Green
      ],
      colors: {}
    });
  }

  if (!mounted || !isOpen || !indicator) return null;

  const modalUI = (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50"
    // overlay tıklayınca kapatmak istersen:
    // onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div className="bg-zinc-950 text-white rounded-md w-[800px] h-[580px] p-4 shadow-2xl relative">
        <button
          className="absolute top-3 right-3 text-gray-400 hover:text-white text-2xl"
          onClick={onClose}
          aria-label="Close"
        >
          <IoMdClose />
        </button>

        <h2 className="text-lg font-bold mb-4 pr-10 truncate">{indicator.name}</h2>

        <div className="h-[500px] rounded-md overflow-hidden">
          <MonacoEditor
            beforeMount={handleEditorWillMount}
            language="python-custom"
            value={code}
            theme="whaleer-custom-dark"
            height="100%"
            options={{
              readOnly: true,
              fontSize: 13,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />
        </div>
      </div>
    </div>
  );

  // 🔑 Kritik kısım: modal'ı BODY'ye portal ile basıyoruz → viewport merkezinde
  return createPortal(modalUI, document.body);
};

export default CodeModal;
