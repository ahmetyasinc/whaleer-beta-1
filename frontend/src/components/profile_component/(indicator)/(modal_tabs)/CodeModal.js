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

    monaco.languages.register({ id: "python-custom" });

    monaco.languages.setMonarchTokensProvider("python-custom", {
      tokenizer: {
        root: [
          [/#.*/, "comment"],
          [/\b(print|def|class|if|else|elif|return|import|from|as|with|try|except|finally|while|for|plot|hline|break|continue|pass|lambda|not|or|and|is|assert|async|await|del|global|nonlocal|raise|yield)\b/, "keyword"],
          [/\b(True|False|None)\b/, "constant"],
          [/\b(int|float|str|bool|list|tuple|set|dict|bytes|complex|range|frozenset|memoryview|bytearray|object|type)\b/, "type"],
          [/[+\-*/%=<>!&|^~]+/, "operator"],
          [/[{}()\[\]]/, "delimiter"],
          [/\b\d+(\.\d+)?\b/, "number"],
          [/"""/, "string", "@triple_double_quote"],
          [/'''/, "string", "@triple_single_quote"],
          [/".*?"/, "string"],
          [/'.*?'/, "string"],
          [/\b(len|type|range|open|abs|round|sorted|map|filter|zip|sum|min|max|pow|chr|ord|bin|hex|oct|id|repr|hash|dir|vars|locals|globals|help|isinstance|issubclass|callable|eval|exec|compile|input|super|memoryview|staticmethod|classmethod|property|delattr|getattr|setattr|hasattr|all|any|enumerate|format|iter|next|reversed|slice)\b/, "function"],
          [/\b(os|sys|math|random|time|datetime|re|json|csv|argparse|collections|functools|itertools|threading|multiprocessing|socket|subprocess|asyncio|base64|pickle|gzip|shutil|tempfile|xml|http|urllib|sqlite3)\b/, "module"],
        ],
        triple_double_quote: [[/"""/, "string", "@popall"], [/./, "string"]],
        triple_single_quote: [[/'''/, "string", "@popall"], [/./, "string"]],
      },
    });
  }

  if (!mounted || !isOpen || !indicator) return null;

  const modalUI = (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50"
      // overlay tıklayınca kapatmak istersen:
      // onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div className="bg-gray-900 text-white rounded-md w-[900px] h-[600px] p-6 shadow-2xl relative">
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
            theme="vs-dark"
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
