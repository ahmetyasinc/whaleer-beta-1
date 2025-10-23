"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IoMdClose } from "react-icons/io";
import { FaRegSave } from "react-icons/fa";
import RunButton from "./run_button";
import dynamic from "next/dynamic";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const CodeModal = ({ isOpen, onClose, indicator, onSave, runIndicatorId }) => {
  const [mounted, setMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [localCode, setLocalCode] = useState("");
  const monacoRef = useRef(null);
  const runButtonRef = useRef(null); // 🔑 RunButton için ref

  useEffect(() => setMounted(true), []);

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
    setLocalCode(indicator?.code || "");
  }, [indicator]);

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
    if (!onSave) return;
    try {
      setIsSaving(true);
      await onSave(localCode);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBeforeRun = async () => {
    await handleSave();
  };

  // 🔑 Ctrl+S ve F5 kısayolu
  useEffect(() => {
    if (!isOpen) return;

    const handler = (e) => {
      // Ctrl+S
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSave();
      }

      // F5
      if (e.key === "F5") {
        e.preventDefault(); // tarayıcı yenilemeyi engelle
        if (runButtonRef.current) {
          runButtonRef.current.click(); // RunButton tetikle
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, localCode]);

  if (!mounted || !isOpen || !indicator) return null;

  const modalUI = (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50">
      <div className="bg-gray-900 text-white rounded-md w-[900px] h-[600px] p-6 shadow-2xl relative">
        {runIndicatorId && (
          <div className="absolute top-5 right-4">
            <RunButton
              ref={runButtonRef} // 🔑 Ref eklendi
              indicatorId={runIndicatorId}
              onBeforeRun={handleBeforeRun}
            />
          </div>
        )}

        <div className="absolute top-7 right-6 flex items-center gap-2">
          {/* Save */}
          <button
            className="gap-1 px-[9px] py-[5px] bg-[rgb(16,45,100)] hover:bg-[rgb(27,114,121)] rounded text-xs font-medium flex items-center"
            title="Save (Ctrl+S)"
            onClick={handleSave}
            disabled={isSaving}
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

        <h2 className="text-lg font-bold mb-4 pr-28 truncate">{indicator.name}</h2>

        <div className="h-[500px] rounded-md overflow-hidden">
          <MonacoEditor
            beforeMount={handleEditorWillMount}
            language="python-custom"
            value={localCode}
            onChange={(value) => setLocalCode(value)}
            theme="vs-dark"
            height="100%"
            options={{
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

export default CodeModal;
