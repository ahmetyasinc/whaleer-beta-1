"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IoMdClose } from "react-icons/io";
import { FaRegSave } from "react-icons/fa";
import RunButton from "./run_button_str";        // 👈 strateji için
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
        ],
        triple_double_quote: [[/"""/, "string", "@popall"], [/./, "string"]],
        triple_single_quote: [[/'''/, "string", "@popall"], [/./, "string"]],
      },
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
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50">
      <div className="bg-gray-900 text-white rounded-md w-[900px] h-[600px] p-6 shadow-2xl relative">
        {/* Sağ üst aksiyonlar: [Run] [Save] [Close] */}
        {runStrategyId && !locked ? (
          <div className="absolute top-5 right-4">
            <RunButton
              ref={runButtonRef}   // 🔑 Ref eklendi
              strategyId={runStrategyId}
              onBeforeRun={handleBeforeRun}
            />
          </div>
        ) : null}

        <div className="absolute top-7 right-6 flex items-center gap-2">
          {/* Save */}
          <button
            className={`gap-1 px-[9px] py-[5px] rounded text-xs font-medium flex items-center ${
              locked
                ? "bg-gray-700 cursor-not-allowed opacity-60"
                : "bg-[rgb(16,45,100)] hover:bg-[rgb(27,114,121)]"
            }`}
            title={locked ? "Locked versions cannot be modified" : "Save"}
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

        <h2 className="text-lg font-bold mb-4 pr-28 truncate">{strategy.name}</h2>

        <div className="h-[500px] rounded-md overflow-hidden">
          <MonacoEditor
            beforeMount={handleEditorWillMount}
            language="python-custom"
            value={code}
            theme="vs-dark"
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
    </div>
  );

  return createPortal(modalUI, document.body);
};

export default FullScreenStrategyCodeModal;
