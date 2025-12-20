"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IoMdClose } from "react-icons/io";
import { FaRegSave, FaRegEye } from "react-icons/fa";
import RunButton from "./run_button_str";        // 👈 strateji için
import TerminalStrategy from "./terminalStrategy";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import dynamic from "next/dynamic";

// Monaco Editor SSR uyumlu şekilde dinamik import edilir
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const FullScreenStrategyCodeModal = ({
  isOpen,
  onClose,
  strategy,
  onSave,
  runStrategyId,
  locked = false,
}) => {
  const [code, setCode] = useState("");
  const [mounted, setMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const monacoRef = useRef(null);
  const runButtonRef = useRef(null); // 🔑 RunButtonStr için ref
  const terminalRef = useRef(null);
  const { t } = useTranslation("strategyCodePanel");
  const [isTerminalOpen, setIsTerminalOpen] = useState(true);
  const [isPeekMode, setIsPeekMode] = useState(false);

  useEffect(() => setMounted(true), []);

  // Body scroll kilidi
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

  useEffect(() => {
    setCode(strategy?.code || "");
  }, [strategy]);

  function handleEditorWillMount(monaco) {
    if (monacoRef.current) return;
    monacoRef.current = monaco;

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
          [/\b(len|type|range|open|abs|round|sorted|map|filter|zip|sum|min|max|pow|chr|ord|bin|hex|oct|id|repr|hash|dir|vars|locals|globals|help|isinstance|issubclass|callable|eval|exec|compile|super|memoryview|staticmethod|classmethod|property|delattr|getattr|setattr|hasattr|all|any|enumerate|format|iter|next|reversed|slice)\b/, "function"],

          // Common modules
          [/\b(os|sys|math|random|time|datetime|re|json|csv|argparse|collections|functools|itertools|threading|multiprocessing|socket|subprocess|asyncio|base64|pickle|gzip|shutil|tempfile|xml|http|urllib|sqlite3|pandas|numpy)\b/, "module"],
        ],
        triple_double_quote: [[/"""/, "string", "@popall"], [/./, "string"]],
        triple_single_quote: [[/'''/, "string", "@popall"], [/./, "string"]],
      },
    });

    // Custom Theme Definition
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
      colors: {} // Use default vs-dark background
    });
  }

  const handleSave = async () => {
    if (locked || !onSave) return;
    try {
      setIsSaving(true);
      const maybePromise = onSave(code);
      if (maybePromise && typeof maybePromise.then === "function") {
        await maybePromise;
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleBeforeRun = async () => {
    if (locked) return;
    await handleSave();
  };

  // 🔑 Ctrl+S ve F5 kısayolu
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      // Ctrl+S → Kaydet
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSave();
      }

      // F5 → RunButtonStr tetikle
      if (e.key === "F5") {
        e.preventDefault();
        if (runButtonRef.current) {
          runButtonRef.current.click();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, code]);

  if (!mounted || !isOpen || !strategy) return null;

  const modalUI = (
    <div className={`fixed inset-0 z-50 flex flex-col bg-zinc-950 text-white transition-opacity duration-200 ${isPeekMode ? 'opacity-0' : 'opacity-100'}`}>
      {/* Header */}
      <div className={`flex-1 flex flex-col pt-6 px-3 overflow-hidden ${isTerminalOpen ? "pb-1" : "pb-6"}`}>
        <div className="flex items-center justify-between mb-2 shrink-0">
          <h2 className="text-lg font-bold truncate ml-12">{strategy.name}</h2>

          <div className="flex items-center gap-2">
            {/* Peek Button (Eye) */}
            <button
              className="gap-1 px-[7px] mr-4 py-[5px] bg-transparent border border-gray-800 text-gray-600 rounded text-xs font-medium flex items-center"
              onMouseEnter={() => setIsPeekMode(true)}
              onMouseLeave={() => setIsPeekMode(false)}
              title="Peek (Hover to see behind)"
            >
              <FaRegEye size={16} />
            </button>

            {runStrategyId && !locked && (
              <RunButton
                ref={runButtonRef}   // 🔑 Ref eklendi
                strategyId={runStrategyId}
                onBeforeRun={handleBeforeRun}
                className="gap-1 px-[9px] py-[5px] mr-[-5px] rounded font-medium transition-all"
              />
            )}

            {/* Save */}
            <button
              className={`gap-1 px-[9px] py-[5px] rounded text-xs font-medium flex items-center ${locked
                ? "bg-gray-700 cursor-not-allowed opacity-60"
                : "bg-[rgb(16,45,100)] hover:bg-[rgb(27,114,121)]"
                }`}
              title={locked ? "Locked versions cannot be modified" : "Save (Ctrl+S)"}
              onClick={handleSave}
              disabled={locked || isSaving}
              aria-disabled={locked || isSaving}
            >
              {isSaving ? (
                <div className="w-[16px] h-[16px] border-2 border-t-white border-gray-400 rounded-full animate-spin"></div>
              ) : (
                <FaRegSave />
              )}
            </button>

            {/* Close */}
            <button
              className="gap-1 px-[9px] py-[5px] bg-[rgb(100,16,16)] hover:bg-[rgb(189,49,49)] rounded text-sm font-medium"
              onClick={onClose}
              title="Close"
              aria-label="Close"
            >
              <IoMdClose />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <MonacoEditor
            beforeMount={handleEditorWillMount}
            language="python-custom"
            value={code}
            theme="whaleer-custom-dark"
            height="100%"
            onChange={(val) => {
              if (!locked) setCode(val ?? "");
            }}
            options={{
              readOnly: locked,
              fontSize: 13,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />
        </div>
      </div>

      <div className={`relative border-t border-zinc-800 mx-3 mb-2 ${isTerminalOpen ? "" : "hidden"}`}>
        <TerminalStrategy
          {...(strategy ? { id: strategy.id } : {})}
          ref={terminalRef}
          initialOutput={t("terminal.ready")}
        />
        <button
          onClick={() => setIsTerminalOpen(false)}
          className="absolute top-0 right-0 p-1 bg-black hover:bg-zinc-950 rounded-sm text-gray-400 hover:text-white transition-colors z-[60]"
          title="Toggle Terminal"
        >
          <FaChevronDown size={14} />
        </button>
      </div>

      {!isTerminalOpen && (
        <button
          onClick={() => setIsTerminalOpen(true)}
          className="absolute bottom-0 right-[12px] p-1 bg-zinc-900 hover:bg-zinc-800 shadow-lg text-gray-400 hover:text-white transition-all z-[60]"
          title="Open Terminal"
        >
          <FaChevronUp size={16} />
        </button>
      )}
    </div>
  );

  return createPortal(modalUI, document.body);
};

export default FullScreenStrategyCodeModal;
