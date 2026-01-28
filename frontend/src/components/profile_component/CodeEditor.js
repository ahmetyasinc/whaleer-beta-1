"use client";

import { useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";

const CodeEditor = ({ code, setCode, onSave }) => {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const onSaveRef = useRef(onSave);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  const handleEditorWillMount = (monaco) => {
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
  };

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;

    // Add Ctrl+S command
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      // 1. Local editor action
      if (onSaveRef.current) {
        const currentValue = editor.getValue();
        onSaveRef.current(currentValue);
      }
      // 2. Global event for other panels
      window.dispatchEvent(new Event("whaleer-trigger-save-all"));
    });

    // Add F5 command
    editor.addCommand(monaco.KeyCode.F5, () => {
      // Global event for running
      window.dispatchEvent(new Event("whaleer-trigger-run-all"));
    });
  };

  // 🔍 Basit hata işaretleme
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    const model = editor.getModel();
    const lines = code.split("\n");
    const markers = [];

    lines.forEach((line, index) => {
      if (line.startsWith("import") && line.trim() === "import") {
        markers.push({
          severity: monaco.MarkerSeverity.Error,
          message: "Eksik import ifadesi",
          startLineNumber: index + 1,
          startColumn: 1,
          endLineNumber: index + 1,
          endColumn: line.length + 1,
        });
      }

      if (line.trim().startsWith("def") && !line.includes("(")) {
        markers.push({
          severity: monaco.MarkerSeverity.Warning,
          message: "Fonksiyon tanımı eksik olabilir",
          startLineNumber: index + 1,
          startColumn: 1,
          endLineNumber: index + 1,
          endColumn: line.length + 1,
        });
      }
    });

    monaco.editor.setModelMarkers(model, "python", markers);
  }, [code]);

  return (
    <Editor
      height="100%"
      language="python"
      theme="whaleer-custom-dark"
      value={code}
      onChange={setCode}
      onMount={handleEditorDidMount}
      beforeMount={handleEditorWillMount}
      options={{
        automaticLayout: true,
        minimap: { enabled: false },
        wordWrap: "off",
      }}
    />
  );
};

export default CodeEditor;
